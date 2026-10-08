-- Receipts: one row per uploaded receipt image.
-- Images live in the private `receipts` Storage bucket at `{user_id}/{receipt_id}.{ext}`.

create type public.receipt_status as enum (
  'uploading',    -- row created, signed upload URL issued, file not confirmed yet
  'uploaded',     -- file verified in Storage by the worker
  'processing',   -- OCR running (future)
  'needs_review', -- OCR done, waiting for the user to review (future)
  'saved',        -- user saved the expense (future)
  'failed'        -- upload or processing failed; see `error`
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  batch_id uuid not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null
    check (size_bytes > 0 and size_bytes <= 1048576),
  image_hash text,
  status public.receipt_status not null default 'uploading',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_user_id_created_at_idx
  on public.receipts (user_id, created_at desc);
create index receipts_batch_id_idx
  on public.receipts (batch_id);

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- Row Level Security.
-- Users can read, create and delete their own receipts. New rows must start
-- as `uploading`. Status changes are made server-side (API routes and the
-- background worker) with the service role, so users have no update policy.
alter table public.receipts enable row level security;

create policy "Users can view their own receipts"
  on public.receipts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own receipts"
  on public.receipts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'uploading'
    and storage_path like (select auth.uid())::text || '/%'
  );

create policy "Users can delete their own receipts"
  on public.receipts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Realtime: push receipt status changes to the client (respects RLS).
alter publication supabase_realtime add table public.receipts;

-- Storage bucket: private, 1 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: users can only touch files in their own `{user_id}/` folder.
create policy "Users can view their own receipt images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Uploads are only allowed to a path that already has a matching receipt row,
-- so files can't be dropped into the bucket outside the upload flow.
create policy "Users can upload receipt images for their receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.receipts r
      where r.storage_path = name
        and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own receipt images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

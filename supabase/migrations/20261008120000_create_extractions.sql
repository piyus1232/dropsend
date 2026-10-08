-- Extractions: the fields the OCR model read from a receipt image.
-- One extraction per receipt; line items are stored one row each in
-- `extraction_items`. Any field can be null when the model couldn't find it.

create type public.expense_category as enum (
  'food_and_dining',
  'groceries',
  'transport',
  'shopping',
  'bills_and_utilities',
  'entertainment',
  'health',
  'travel',
  'other'
);

-- No 'unknown': a null payment_method means it couldn't be read.
create type public.payment_method as enum (
  'cash',
  'card',
  'upi',
  'net_banking',
  'wallet',
  'other'
);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null unique references public.receipts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text,
  amount numeric(12, 2) check (amount >= 0), -- final total paid
  currency text check (currency ~ '^[A-Z]{3}$'), -- ISO 4217 code
  date date,
  category public.expense_category,
  payment_method public.payment_method,
  model text not null,  -- model that produced this extraction
  raw_output jsonb,     -- the model's raw response, for debugging
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index extractions_user_id_date_idx
  on public.extractions (user_id, date desc);

create trigger extractions_set_updated_at
  before update on public.extractions
  for each row execute function public.set_updated_at();

create table public.extraction_items (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.extractions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null check (position > 0), -- order on the receipt
  name text not null,
  quantity numeric(12, 3) check (quantity > 0),
  unit_price numeric(12, 2),
  total numeric(12, 2),
  created_at timestamptz not null default now(),
  unique (extraction_id, position)
);

create index extraction_items_user_id_idx
  on public.extraction_items (user_id);

-- Row Level Security.
-- Users can read their own extractions and items. Rows are written only by
-- the background worker with the service role, so there are no write
-- policies (deleting a receipt cascades to its extraction and items).
alter table public.extractions enable row level security;
alter table public.extraction_items enable row level security;

create policy "Users can view their own extractions"
  on public.extractions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own extraction items"
  on public.extraction_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Saves a receipt's extraction and items and moves the receipt from
-- `processing` to `needs_review`, all in one transaction. Replaces any
-- earlier extraction (e.g. when a failed receipt is retried).
-- Returns the extraction id, or null if the receipt was deleted or is no
-- longer `processing`.
--
-- p_extraction: { merchant, amount, currency, date, category, payment_method }
-- p_items:      [{ name, quantity, unit_price, total }, ...] in receipt order
create function public.save_receipt_extraction(
  p_receipt_id uuid,
  p_model text,
  p_raw_output jsonb,
  p_extraction jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_extraction_id uuid;
begin
  select user_id into v_user_id
  from public.receipts
  where id = p_receipt_id and status = 'processing'
  for update;

  if v_user_id is null then
    return null;
  end if;

  delete from public.extractions where receipt_id = p_receipt_id;

  insert into public.extractions (
    receipt_id, user_id, merchant, amount, currency, date,
    category, payment_method, model, raw_output
  )
  values (
    p_receipt_id,
    v_user_id,
    p_extraction ->> 'merchant',
    (p_extraction ->> 'amount')::numeric,
    p_extraction ->> 'currency',
    (p_extraction ->> 'date')::date,
    (p_extraction ->> 'category')::public.expense_category,
    (p_extraction ->> 'payment_method')::public.payment_method,
    p_model,
    p_raw_output
  )
  returning id into v_extraction_id;

  insert into public.extraction_items (
    extraction_id, user_id, position, name, quantity, unit_price, total
  )
  select
    v_extraction_id,
    v_user_id,
    item.position,
    item.value ->> 'name',
    (item.value ->> 'quantity')::numeric,
    (item.value ->> 'unit_price')::numeric,
    (item.value ->> 'total')::numeric
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    with ordinality as item(value, position);

  update public.receipts
  set status = 'needs_review', error = null
  where id = p_receipt_id;

  return v_extraction_id;
end;
$$;

-- Only the service role (the worker) may call it.
revoke execute on function public.save_receipt_extraction(uuid, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_receipt_extraction(uuid, text, jsonb, jsonb, jsonb)
  to service_role;

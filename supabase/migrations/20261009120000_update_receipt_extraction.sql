-- Lets the review flow save the user's edited extraction: updates the
-- extraction fields, replaces its items, and moves the receipt from
-- `needs_review` to `saved`.

-- Updates a receipt's extraction and items with the user's reviewed values,
-- and moves the receipt from `needs_review` to `saved`. Replaces all items.
-- Returns true if applied, false if the receipt doesn't exist or isn't
-- `needs_review` (already saved, still processing, deleted, etc).
--
-- p_extraction: { merchant, amount, currency, date, category, payment_method }
-- p_items:      [{ name, quantity, unit_price, total }, ...] in display order
create function public.update_receipt_extraction(
  p_receipt_id uuid,
  p_extraction jsonb,
  p_items jsonb
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_extraction_id uuid;
begin
  select user_id, id into v_user_id, v_extraction_id
  from public.extractions
  where receipt_id = p_receipt_id
  for update;

  if v_extraction_id is null then
    return false;
  end if;

  if not exists (
    select 1 from public.receipts
    where id = p_receipt_id and status = 'needs_review'
  ) then
    return false;
  end if;

  update public.extractions
  set
    merchant = p_extraction ->> 'merchant',
    amount = (p_extraction ->> 'amount')::numeric,
    currency = p_extraction ->> 'currency',
    date = (p_extraction ->> 'date')::date,
    category = (p_extraction ->> 'category')::public.expense_category,
    payment_method = (p_extraction ->> 'payment_method')::public.payment_method
  where id = v_extraction_id;

  delete from public.extraction_items where extraction_id = v_extraction_id;

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
  set status = 'saved', error = null
  where id = p_receipt_id;

  return true;
end;
$$;

-- Only the service role (the API route, after checking ownership via RLS)
-- may call it.
revoke execute on function public.update_receipt_extraction(uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_receipt_extraction(uuid, jsonb, jsonb)
  to service_role;

-- Putting a returned item back into stock is an explicit decision by the seller
-- (or an admin): a returned item can arrive damaged and must not always go back on
-- sale. It can be done once per return, after the return was approved.

alter table public.return_requests add column restocked_at timestamptz;

create or replace function public.restock_returned_item(p_return_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  r record;
  v_warehouse uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select rr.id, rr.status, rr.vendor_id, rr.restocked_at, oi.variant_id, oi.quantity
    into r
    from return_requests rr
    join order_items oi on oi.id = rr.order_item_id
   where rr.id = p_return_id
   for update of rr;

  if not found then
    raise exception 'Return not found';
  end if;
  if not (private.is_admin() or r.vendor_id = uid) then
    raise exception 'Return not found';
  end if;
  if r.status not in ('approved', 'refunded') then
    raise exception 'Return is not approved';
  end if;
  if r.restocked_at is not null then
    raise exception 'Already restocked';
  end if;
  if r.variant_id is null then
    raise exception 'The product variant no longer exists';
  end if;

  update product_variants
     set stock_quantity = stock_quantity + r.quantity
   where id = r.variant_id;
  if not found then
    raise exception 'The product variant no longer exists';
  end if;

  select id into v_warehouse from warehouses where is_default order by created_at limit 1;
  insert into inventory_movements (variant_id, warehouse_id, quantity_change, reason, created_by)
  values (r.variant_id, v_warehouse, r.quantity, 'return', uid);

  update return_requests set restocked_at = now(), updated_at = now() where id = p_return_id;
end;
$$;

revoke all on function public.restock_returned_item(uuid) from public, anon;
grant execute on function public.restock_returned_item(uuid) to authenticated;

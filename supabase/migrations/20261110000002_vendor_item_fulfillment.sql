-- Applied to the live project as migration "vendor_item_fulfillment".
alter table public.order_items
  add column shipped_at timestamptz,
  add column tracking_number text;

alter table public.order_items
  add constraint order_items_tracking_len check (tracking_number is null or char_length(tracking_number) <= 80);

-- A vendor marks THEIR OWN items of an order as shipped (or updates the tracking).
-- orders stays admin-writable only; this function is the narrow door a vendor
-- goes through, and it only ever touches rows where vendor_id = the caller.
create or replace function public.vendor_ship_items(p_order_id uuid, p_tracking text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_tracking text := nullif(btrim(coalesce(p_tracking, '')), '');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_tracking is not null and char_length(v_tracking) > 80 then
    raise exception 'Tracking number too long';
  end if;

  select status into v_status from orders where id = p_order_id for update;
  if v_status is null then
    raise exception 'Order not found';
  end if;
  if v_status not in ('paid', 'fulfilled') then
    raise exception 'Order is not paid yet';
  end if;

  if not exists (select 1 from order_items where order_id = p_order_id and vendor_id = uid) then
    raise exception 'You have no items in this order';
  end if;

  update order_items
     set shipped_at = coalesce(shipped_at, now()),
         tracking_number = v_tracking
   where order_id = p_order_id and vendor_id = uid;

  -- When nothing is left to ship, the order as a whole is fulfilled.
  if not exists (select 1 from order_items where order_id = p_order_id and shipped_at is null) then
    update orders set status = 'fulfilled' where id = p_order_id and status = 'paid';
  end if;
end;
$$;

revoke all on function public.vendor_ship_items(uuid, text) from public, anon;
grant execute on function public.vendor_ship_items(uuid, text) to authenticated;

-- The customer can cancel a shipment until it ships (while it is "confirmed" or "preparing").
--
--   * the shipment is cancelled and its items go back to stock (inventory movement 'restock')
--   * the refund of the items is computed (simulated: nothing was charged) and shown/emailed;
--     the shipping fee comes back too only when the WHOLE order is cancelled
--   * if every shipment of the order is cancelled, the order is cancelled and the promo code's
--     use is given back
--   * buyer and seller are emailed
-- A guest cancels with the order's secret token, exactly like confirming a delivery.

create or replace function private.shipment_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending int;
  v_open int;
  v_done int;
  v_total int;
  v_cancelled int;
begin
  if new.status = 'shipped' and old.status <> 'shipped' then
    update public.order_items
       set shipped_at = coalesce(shipped_at, new.shipped_at),
           tracking_number = coalesce(tracking_number, new.tracking_number)
     where shipment_id = new.id;
  end if;

  if new.status = 'delivered' then
    update public.order_items set delivered_at = new.delivered_at where shipment_id = new.id;
  elsif new.status = 'completed' then
    update public.order_items
       set delivered_at = coalesce(delivered_at, new.delivered_at),
           completed_at = new.completed_at
     where shipment_id = new.id;
  end if;

  select count(*) filter (where status in ('confirmed', 'preparing')),
         count(*) filter (where status not in ('completed', 'cancelled')),
         count(*) filter (where status = 'completed'),
         count(*),
         count(*) filter (where status = 'cancelled')
    into v_pending, v_open, v_done, v_total, v_cancelled
    from public.shipments
   where order_id = new.order_id;

  if v_total > 0 and v_cancelled = v_total then
    -- everything was cancelled
    update public.orders set status = 'cancelled' where id = new.order_id and status in ('paid', 'fulfilled');
  elsif v_pending = 0 and v_open > 0 then
    update public.orders set status = 'fulfilled' where id = new.order_id and status = 'paid';
  elsif v_open = 0 and v_done > 0 then
    update public.orders set status = 'completed'
     where id = new.order_id and status in ('paid', 'fulfilled');
  end if;
  return new;
end;
$$;

create or replace function public.cancel_shipment(p_shipment uuid, p_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.shipments%rowtype;
  o public.orders%rowtype;
  r record;
  v_wh uuid;
  v_gross numeric;
  v_refund integer;
  v_whole boolean;
  v_names jsonb;
begin
  select sh.* into s
    from public.shipments sh
    join public.orders ord on ord.id = sh.order_id
   where sh.id = p_shipment
     and ((uid is not null and ord.user_id = uid)
          or (p_token is not null and ord.demo_token = p_token))
   for update of sh;
  if not found then
    raise exception 'Shipment not found';
  end if;
  if s.status not in ('confirmed', 'preparing') then
    raise exception 'A shipment can only be cancelled before it ships';
  end if;
  select * into o from public.orders where id = s.order_id;

  perform private.record_shipment_event(p_shipment, 'cancelled', 'customer', uid, null);

  -- the items go back to stock
  select id into v_wh from public.warehouses order by created_at limit 1;
  for r in select variant_id, quantity from public.order_items where shipment_id = p_shipment and variant_id is not null loop
    update public.product_variants set stock_quantity = stock_quantity + r.quantity where id = r.variant_id;
    insert into public.inventory_movements (variant_id, warehouse_id, quantity_change, reason, created_by)
    values (r.variant_id, v_wh, r.quantity, 'restock', uid);
  end loop;

  -- refund of the items of this shipment: price minus their share of any discount (same rule as returns)
  select coalesce(sum(unit_price_cents::numeric * quantity), 0), coalesce(jsonb_agg(product_name_snapshot order by id), '[]'::jsonb)
    into v_gross, v_names
    from public.order_items where shipment_id = p_shipment;
  if o.subtotal_cents > 0 then
    v_refund := round(v_gross * greatest(o.subtotal_cents - o.discount_cents, 0) / o.subtotal_cents)::integer;
  else
    v_refund := v_gross::integer;
  end if;

  v_whole := not exists (select 1 from public.shipments where order_id = o.id and status <> 'cancelled');
  if v_whole then
    v_refund := v_refund + o.shipping_cents;       -- nothing ships, so the shipping fee comes back too
    if o.promo_code is not null then
      update public.promo_codes set times_used = greatest(times_used - 1, 0) where code = o.promo_code;
    end if;
  end if;

  perform private.enqueue_email(
    coalesce(o.customer_email, private.email_of(o.user_id)),
    private.locale_of(o.user_id),
    'shipment_cancelled',
    jsonb_build_object('order_number', o.order_number, 'items', v_names, 'refund_cents', v_refund,
                       'currency', o.currency, 'whole_order', v_whole, 'for_seller', false)
  );
  perform private.enqueue_email(
    private.email_of(s.vendor_id),
    private.locale_of(s.vendor_id),
    'shipment_cancelled',
    jsonb_build_object('order_number', o.order_number, 'items', v_names, 'refund_cents', v_refund,
                       'currency', o.currency, 'whole_order', v_whole, 'for_seller', true)
  );

  return jsonb_build_object('refund_cents', v_refund, 'whole_order', v_whole, 'currency', o.currency);
end;
$$;

revoke all on function public.cancel_shipment(uuid, uuid) from public;
grant execute on function public.cancel_shipment(uuid, uuid) to anon, authenticated;

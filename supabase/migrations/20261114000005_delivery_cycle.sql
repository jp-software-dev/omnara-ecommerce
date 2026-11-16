-- The end of the cycle. The customer confirms the delivery ("Ya lo recibí"), which closes
-- the shipment, and from then on:
--   * reviews are allowed (verified purchase = a closed shipment)
--   * the 30-day return window runs from the DELIVERY, not from the shipping
--   * the seller can be paid (simulated), as long as no return is open
-- Items copy delivered_at / completed_at from their shipment so the rest of the app keeps
-- reading dates from the item.

alter table public.order_items
  add column if not exists delivered_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.order_items oi
   set delivered_at = s.delivered_at,
       completed_at = s.completed_at
  from public.shipments s
 where s.id = oi.shipment_id
   and (oi.delivered_at is distinct from s.delivered_at or oi.completed_at is distinct from s.completed_at);

-- Same trigger as before plus the two new dates.
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
         count(*) filter (where status = 'completed')
    into v_pending, v_open, v_done
    from public.shipments
   where order_id = new.order_id;

  if v_pending = 0 and v_open > 0 then
    update public.orders set status = 'fulfilled' where id = new.order_id and status = 'paid';
  elsif v_open = 0 and v_done > 0 then
    update public.orders set status = 'completed'
     where id = new.order_id and status in ('paid', 'fulfilled');
  end if;
  return new;
end;
$$;

-- The customer closes the shipment: only the buyer of the order, only once it is delivered.
create or replace function public.confirm_delivery(p_shipment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.shipments%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select sh.* into s
    from public.shipments sh
    join public.orders o on o.id = sh.order_id
   where sh.id = p_shipment and o.user_id = uid;
  if not found then
    raise exception 'Shipment not found';
  end if;
  if s.status <> 'delivered' then
    raise exception 'The shipment has not been delivered yet';
  end if;

  perform private.record_shipment_event(p_shipment, 'completed', 'customer', uid, null);
end;
$$;

revoke all on function public.confirm_delivery(uuid) from public, anon;
grant execute on function public.confirm_delivery(uuid) to authenticated;

-- ------------------------------------------------------------------ reviews
-- A verified purchase is an item whose shipment the customer closed.
create or replace function private.user_purchased(p_user uuid, p_product uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from order_items oi
    join orders o on o.id = oi.order_id
    join product_variants pv on pv.id = oi.variant_id
    where o.user_id = p_user
      and o.status in ('paid', 'fulfilled', 'completed')
      and oi.completed_at is not null
      and pv.product_id = p_product
  );
$$;

-- ------------------------------------------------------------------ returns
-- The 30-day window starts when the item was DELIVERED. Items without a shipment (sold by
-- the platform itself) keep the old rule based on shipped_at.
create or replace function public.request_return(p_order_item_id uuid, p_reason text, p_details text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  uid uuid := auth.uid();
  it record;
  v_line numeric;
  v_refund integer;
  v_id uuid;
  v_since timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select oi.id, oi.order_id, oi.vendor_id, oi.unit_price_cents, oi.quantity,
         oi.shipped_at, oi.delivered_at, oi.shipment_id,
         o.user_id, o.status, o.currency, o.subtotal_cents, o.discount_cents
    into it
    from order_items oi
    join orders o on o.id = oi.order_id
   where oi.id = p_order_item_id;

  if not found or it.user_id is distinct from uid then
    raise exception 'Order item not found';
  end if;
  if it.status not in ('paid', 'fulfilled', 'completed') then
    raise exception 'Order is not eligible for returns';
  end if;

  if it.shipment_id is not null then
    if it.delivered_at is null then
      raise exception 'Item has not been delivered yet';
    end if;
    v_since := it.delivered_at;
  else
    if it.shipped_at is null then
      raise exception 'Item has not shipped yet';
    end if;
    v_since := it.shipped_at;
  end if;
  if now() > v_since + interval '30 days' then
    raise exception 'Return window has closed';
  end if;
  if exists (select 1 from return_requests where order_item_id = p_order_item_id) then
    raise exception 'A return was already requested for this item';
  end if;

  v_line := it.unit_price_cents::numeric * it.quantity;
  if it.subtotal_cents > 0 then
    v_refund := round(v_line * greatest(it.subtotal_cents - it.discount_cents, 0) / it.subtotal_cents);
  else
    v_refund := v_line;
  end if;
  v_refund := greatest(v_refund, 1);

  insert into return_requests (order_item_id, order_id, user_id, vendor_id, reason, details,
                               status, refund_amount_cents, currency)
  values (p_order_item_id, it.order_id, uid, it.vendor_id, p_reason,
          nullif(left(btrim(coalesce(p_details, '')), 1000), ''),
          case when it.vendor_id is null then 'escalated' else 'requested' end,
          v_refund, it.currency)
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------------ payouts
-- The seller is paid for items whose shipment the customer closed and that have no open
-- or refunded return.
create or replace function public.seller_balance(p_vendor uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vendor uuid := coalesce(p_vendor, auth.uid());
  v_rate numeric;
  v_bps integer;
  v_gross bigint;
  v_items integer;
  v_commission bigint;
begin
  if auth.uid() is null or (v_vendor <> auth.uid() and not private.is_admin()) then
    raise exception 'Not allowed';
  end if;

  select usd_exchange_rate, commission_bps into v_rate, v_bps from app_settings limit 1;

  select coalesce(sum(case when o.currency = 'USD'
                           then round(oi.unit_price_cents * oi.quantity * v_rate)
                           else oi.unit_price_cents * oi.quantity end), 0)::bigint,
         count(*)::integer
    into v_gross, v_items
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.vendor_id = v_vendor
    and oi.payout_id is null
    and oi.completed_at is not null
    and o.status in ('paid', 'fulfilled', 'completed')
    and not exists (
      select 1 from return_requests rr
      where rr.order_item_id = oi.id
        and rr.status in ('requested', 'approved', 'escalated', 'refunded')
    );

  v_commission := round(v_gross * v_bps / 10000.0);
  return jsonb_build_object(
    'vendor_id', v_vendor,
    'gross_mxn_cents', v_gross,
    'commission_mxn_cents', v_commission,
    'net_mxn_cents', v_gross - v_commission,
    'commission_bps', v_bps,
    'items', v_items
  );
end;
$$;

create or replace function public.create_simulated_payout(p_vendor uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate numeric;
  v_bps integer;
  v_ids uuid[];
  v_gross bigint;
  v_commission bigint;
  v_payout uuid := gen_random_uuid();
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can create payouts';
  end if;

  select usd_exchange_rate, commission_bps into v_rate, v_bps from app_settings limit 1;

  select array_agg(x.id), coalesce(sum(x.amount), 0)::bigint
    into v_ids, v_gross
  from (
    select oi.id,
           case when o.currency = 'USD'
                then round(oi.unit_price_cents * oi.quantity * v_rate)
                else oi.unit_price_cents * oi.quantity end as amount
    from order_items oi
    join orders o on o.id = oi.order_id
    where oi.vendor_id = p_vendor
      and oi.payout_id is null
      and oi.completed_at is not null
      and o.status in ('paid', 'fulfilled', 'completed')
      and not exists (
        select 1 from return_requests rr
        where rr.order_item_id = oi.id
          and rr.status in ('requested', 'approved', 'escalated', 'refunded')
      )
    for update of oi
  ) x;

  if v_ids is null then
    raise exception 'Nothing to pay out';
  end if;

  v_commission := round(v_gross * v_bps / 10000.0);

  insert into seller_payouts (id, vendor_id, gross_mxn_cents, commission_mxn_cents, net_mxn_cents,
                              commission_bps, items_count, reference, created_by)
  values (v_payout, p_vendor, v_gross, v_commission, v_gross - v_commission, v_bps,
          array_length(v_ids, 1), 'SIM-PAYOUT-' || upper(substr(v_payout::text, 1, 8)), auth.uid());

  update order_items set payout_id = v_payout where id = any (v_ids);
  return v_payout;
end;
$$;

revoke all on function public.seller_balance(uuid) from public;
revoke all on function public.create_simulated_payout(uuid) from public;
grant execute on function public.seller_balance(uuid) to authenticated;
grant execute on function public.create_simulated_payout(uuid) to authenticated;

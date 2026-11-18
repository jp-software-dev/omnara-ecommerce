-- The purchase ticket: everything a person needs after buying, in one JSON document used by
-- the confirmation email, the PDF attachment and the PDF download.
--
--   private.order_ticket_json(order)   builds it (no permission check, never exposed)
--   public.order_ticket(order, token)  for people: the buyer, a seller of the order, an admin,
--                                      or a guest holding the order's secret token
--   public.order_ticket_for_email(o)   for the service that sends emails only
--
-- It is a DEMO receipt: no money moves and it is not a tax invoice. The 'demo' flag lets the
-- documents say so.

create or replace function private.order_ticket_json(p_order uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  v_items jsonb;
  v_shipments jsonb;
  v_eta timestamptz;
begin
  select * into o from public.orders where id = p_order;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', oi.product_name_snapshot,
           'attrs', oi.variant_attrs_snapshot,
           'quantity', oi.quantity,
           'unit_price_cents', oi.unit_price_cents,
           'seller', b.name
         ) order by oi.id), '[]'::jsonb)
    into v_items
    from public.order_items oi
    left join public.businesses b on b.owner_id = oi.vendor_id
   where oi.order_id = p_order;

  -- each shipment with its projected delivery (the same calendar the scheduler follows)
  select coalesce(jsonb_agg(jsonb_build_object(
           'seller', b.name,
           'status', s.status,
           'tracking_number', s.tracking_number,
           'estimated_delivery_at', (select t.at from public.shipment_timeline(s.id) t where t.status = 'delivered')
         ) order by s.created_at), '[]'::jsonb)
    into v_shipments
    from public.shipments s
    left join public.businesses b on b.owner_id = s.vendor_id
   where s.order_id = p_order;

  select max(t.at) into v_eta
    from public.shipments s, lateral public.shipment_timeline(s.id) t
   where s.order_id = p_order and t.status = 'delivered';

  return jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'created_at', o.created_at,
    'status', o.status,
    'currency', o.currency,
    'subtotal_cents', o.subtotal_cents,
    'shipping_cents', o.shipping_cents,
    'discount_cents', o.discount_cents,
    'promo_code', o.promo_code,
    'total_cents', o.total_cents,
    'customer_email', o.customer_email,
    'shipping_address', o.shipping_address_snapshot,
    'demo', coalesce(o.payment_method = 'demo', false),
    'has_account', o.user_id is not null,
    'items', v_items,
    'shipments', v_shipments,
    'estimated_delivery_at', v_eta
  );
end;
$$;

revoke all on function private.order_ticket_json(uuid) from public, anon, authenticated;

create or replace function public.order_ticket(p_order uuid, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_allowed boolean;
begin
  v_allowed :=
    (p_token is not null and exists (select 1 from public.orders where id = p_order and demo_token = p_token))
    or (uid is not null and (
         private.is_admin()
         or exists (select 1 from public.orders where id = p_order and user_id = uid)
         or exists (select 1 from public.order_items where order_id = p_order and vendor_id = uid)
       ));
  if not coalesce(v_allowed, false) then
    return null;
  end if;
  return private.order_ticket_json(p_order);
end;
$$;

revoke all on function public.order_ticket(uuid, uuid) from public;
grant execute on function public.order_ticket(uuid, uuid) to anon, authenticated;

-- Only the service role (the email sender) may call this one.
create or replace function public.order_ticket_for_email(p_order uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select private.order_ticket_json(p_order);
$$;

revoke all on function public.order_ticket_for_email(uuid) from public, anon, authenticated;
grant execute on function public.order_ticket_for_email(uuid) to service_role;

-- The confirmation email carries the order id so the ticket can be built when it is sent,
-- once the order's items exist (the order row is inserted before them).
create or replace function private.trg_email_order_created()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  begin
    perform private.enqueue_email(
      coalesce(new.customer_email, private.email_of(new.user_id)),
      private.locale_of(new.user_id),
      'order_confirmation',
      jsonb_build_object('order_id', new.id, 'order_number', new.order_number,
                         'total_cents', new.total_cents, 'currency', new.currency)
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

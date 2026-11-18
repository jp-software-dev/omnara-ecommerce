-- Milestone emails, reminders, and guest access to tracking.
--
-- 1. A guest (an order without an account) holds the order's secret token. That token already
--    opens the receipt; it now also opens the tracking and lets them confirm the delivery, so
--    guest orders can be closed like any other.
-- 2. Every shipment milestone queues an email to the buyer: preparing, arrived in your state,
--    out for delivery, delivered. ('shipped' keeps its existing email, sent per item.)
-- 3. A scheduled job (pg_cron) sends the reminders: confirm the delivery after 2 days and again
--    after 7 (the order is never closed on its own), and ask for a review 3 days after the
--    customer closed it.

-- ------------------------------------------------------------------ 1. guest access
drop function if exists public.confirm_delivery(uuid);
create or replace function public.confirm_delivery(p_shipment uuid, p_token uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.shipments%rowtype;
begin
  select sh.* into s
    from public.shipments sh
    join public.orders o on o.id = sh.order_id
   where sh.id = p_shipment
     and ((uid is not null and o.user_id = uid)
          or (p_token is not null and o.demo_token = p_token));
  if not found then
    raise exception 'Shipment not found';
  end if;
  if s.status <> 'delivered' then
    raise exception 'The shipment has not been delivered yet';
  end if;

  perform private.record_shipment_event(p_shipment, 'completed', 'customer', uid, null);
end;
$$;

revoke all on function public.confirm_delivery(uuid, uuid) from public;
grant execute on function public.confirm_delivery(uuid, uuid) to anon, authenticated;

drop function if exists public.advance_order_shipments(uuid);
create or replace function public.advance_order_shipments(p_order uuid, p_token uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  v_total int := 0;
begin
  if not (
    (p_token is not null and exists (select 1 from public.orders where id = p_order and demo_token = p_token))
    or (uid is not null and (
         private.is_admin()
         or exists (select 1 from public.orders where id = p_order and user_id = uid)
         or exists (select 1 from public.shipments where order_id = p_order and vendor_id = uid)))
  ) then
    raise exception 'Order not found';
  end if;

  for r in
    select id from public.shipments
     where order_id = p_order and status not in ('delivered', 'completed', 'cancelled')
  loop
    v_total := v_total + private.advance_shipment(r.id);
  end loop;
  return v_total;
end;
$$;

revoke all on function public.advance_order_shipments(uuid, uuid) from public;
grant execute on function public.advance_order_shipments(uuid, uuid) to anon, authenticated;

-- Tracking for the confirmation page: each shipment with its timeline.
create or replace function public.order_tracking(p_order uuid, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if not (
    (p_token is not null and exists (select 1 from public.orders where id = p_order and demo_token = p_token))
    or (uid is not null and (
         private.is_admin()
         or exists (select 1 from public.orders where id = p_order and user_id = uid)
         or exists (select 1 from public.shipments where order_id = p_order and vendor_id = uid)))
  ) then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', s.id,
             'status', s.status,
             'carrier', s.carrier,
             'tracking_number', s.tracking_number,
             'sellerName', b.name,
             'steps', (select coalesce(jsonb_agg(jsonb_build_object(
                          'step_order', t.step_order, 'status', t.status, 'at', t.at, 'done', t.done)
                          order by t.step_order), '[]'::jsonb)
                         from public.shipment_timeline(s.id) t)
           ) order by s.created_at)
      from public.shipments s
      left join public.businesses b on b.owner_id = s.vendor_id
     where s.order_id = p_order
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.order_tracking(uuid, uuid) from public;
grant execute on function public.order_tracking(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------- 2. milestone emails
-- Where the email's button leads: the buyer's account, or the guest's confirmation page.
create or replace function private.order_view_path(p_order uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when o.user_id is not null then '/cuenta/pedidos/' || o.id
           when o.demo_token is not null then '/checkout/confirmacion?demo_order=' || o.id || '&token=' || o.demo_token
           else ''
         end
    from public.orders o
   where o.id = p_order;
$$;

revoke all on function private.order_view_path(uuid) from public, anon, authenticated;

create or replace function private.trg_email_shipment_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.shipments%rowtype;
  o public.orders%rowtype;
begin
  begin
    if new.status not in ('preparing', 'arrived_state', 'out_for_delivery', 'delivered') then
      return new;
    end if;
    select * into s from public.shipments where id = new.shipment_id;
    select * into o from public.orders where id = s.order_id;

    perform private.enqueue_email(
      coalesce(o.customer_email, private.email_of(o.user_id)),
      private.locale_of(o.user_id),
      'shipment_update',
      jsonb_build_object(
        'order_number', o.order_number,
        'status', new.status,
        'seller', (select b.name from public.businesses b where b.owner_id = s.vendor_id),
        'tracking_number', s.tracking_number,
        'estimated_delivery_at', (select t.at from public.shipment_timeline(s.id) t where t.status = 'delivered'),
        'items', (select coalesce(jsonb_agg(oi.product_name_snapshot order by oi.id), '[]'::jsonb)
                    from public.order_items oi where oi.shipment_id = s.id),
        'view_path', private.order_view_path(o.id)
      )
    );
  exception when others then
    null;   -- an email problem must never block a shipment from moving
  end;
  return new;
end;
$$;

drop trigger if exists shipment_events_email on public.shipment_events;
create trigger shipment_events_email
  after insert on public.shipment_events
  for each row execute function private.trg_email_shipment_event();

-- ------------------------------------------------------------ 3. reminders
create table if not exists public.shipment_reminders (
  shipment_id uuid not null references public.shipments(id),
  kind text not null check (kind in ('confirm_1', 'confirm_2', 'review_1')),
  created_at timestamptz not null default now(),
  primary key (shipment_id, kind)
);
alter table public.shipment_reminders enable row level security;  -- internal: no policies

create or replace function private.enqueue_shipment_reminders(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_kind text;
  v_sent int := 0;
  v_inserted int;
begin
  for r in
    select s.id as shipment_id, s.status, s.delivered_at, s.completed_at,
           o.id as order_id, o.order_number, o.user_id, o.customer_email,
           (select string_agg(k.kind, ',') from public.shipment_reminders k where k.shipment_id = s.id) as done
      from public.shipments s
      join public.orders o on o.id = s.order_id
     where (s.status = 'delivered' and s.delivered_at <= p_now - interval '2 days')
        or (s.status = 'completed' and s.completed_at <= p_now - interval '3 days' and o.user_id is not null)
  loop
    v_kind := null;
    if r.status = 'delivered' then
      if r.delivered_at <= p_now - interval '7 days' and coalesce(r.done, '') like '%confirm_1%'
         and coalesce(r.done, '') not like '%confirm_2%' then
        v_kind := 'confirm_2';
      elsif coalesce(r.done, '') not like '%confirm_1%' then
        v_kind := 'confirm_1';
      end if;
    elsif coalesce(r.done, '') not like '%review_1%' then
      -- only worth asking when some product of the shipment has not been reviewed yet
      if exists (
        select 1
          from public.order_items oi
          join public.product_variants pv on pv.id = oi.variant_id
         where oi.shipment_id = r.shipment_id
           and not exists (select 1 from public.reviews rv where rv.product_id = pv.product_id and rv.user_id = r.user_id)
      ) then
        v_kind := 'review_1';
      end if;
    end if;

    continue when v_kind is null;

    -- the primary key guarantees one reminder of each kind, even with two runs at once
    insert into public.shipment_reminders (shipment_id, kind) values (r.shipment_id, v_kind)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    continue when v_inserted = 0;

    perform private.enqueue_email(
      coalesce(r.customer_email, private.email_of(r.user_id)),
      private.locale_of(r.user_id),
      case when v_kind = 'review_1' then 'review_reminder' else 'confirm_delivery_reminder' end,
      jsonb_build_object(
        'order_number', r.order_number,
        'items', (select coalesce(jsonb_agg(oi.product_name_snapshot order by oi.id), '[]'::jsonb)
                    from public.order_items oi where oi.shipment_id = r.shipment_id),
        'second', v_kind = 'confirm_2',
        'view_path', private.order_view_path(r.order_id)
      )
    );
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$$;

revoke all on function private.enqueue_shipment_reminders(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'omnara-shipment-reminders') then
    perform cron.unschedule('omnara-shipment-reminders');
  end if;
  perform cron.schedule('omnara-shipment-reminders', '*/30 * * * *', 'select private.enqueue_shipment_reminders()');
end $$;

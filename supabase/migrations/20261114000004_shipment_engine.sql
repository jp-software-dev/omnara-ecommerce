-- The scheduler. It moves every shipment forward through the steps whose due time has
-- passed (rules and calendar from the previous migration), records one event per step
-- stamped with the time it was due, and keeps the order in sync.
--
-- It can be triggered three ways, all calling the same function:
--   1. pg_cron every 5 minutes (works even if nobody opens the site)
--   2. lazily, when the buyer, seller or an admin opens an order
--   3. by an admin forcing it from the shipments panel (later phase)
-- The function is idempotent: running it twice does nothing the second time.

-- 'completed' is a new order status: the customer confirmed the delivery.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status = any (array['pending', 'paid', 'fulfilled', 'completed', 'cancelled', 'refunded']));

-- A label for a shipment that is shipped by the system (the seller did not do it first).
create or replace function private.simulated_tracking()
returns text
language sql
volatile
as $$
  select 'SIM-EXP-' || lpad(floor(random() * 10000000000)::bigint::text, 10, '0');
$$;

create or replace function private.shipment_before_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'shipped' and old.status <> 'shipped' then
    new.tracking_number := coalesce(new.tracking_number, private.simulated_tracking());
    new.carrier := coalesce(new.carrier, 'EXP');
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_before_status_change on public.shipments;
create trigger shipments_before_status_change
  before update of status on public.shipments
  for each row execute function private.shipment_before_status_change();

-- When a shipment changes status: copy shipped_at/tracking to its items (the rest of the
-- app still reads them) and derive the order's status from all of its shipments.
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

  select count(*) filter (where status in ('confirmed', 'preparing')),
         count(*) filter (where status not in ('completed', 'cancelled')),
         count(*) filter (where status = 'completed')
    into v_pending, v_open, v_done
    from public.shipments
   where order_id = new.order_id;

  if v_pending = 0 and v_open > 0 then
    -- everything has left: the order is fulfilled
    update public.orders set status = 'fulfilled' where id = new.order_id and status = 'paid';
  elsif v_open = 0 and v_done > 0 then
    -- every shipment closed by the customer: the order is completed
    update public.orders set status = 'completed'
     where id = new.order_id and status in ('paid', 'fulfilled');
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_after_status_change on public.shipments;
create trigger shipments_after_status_change
  after update of status on public.shipments
  for each row when (old.status is distinct from new.status)
  execute function private.shipment_after_status_change();

-- Applies, in order, every step of one shipment that is due at p_now. Returns how many.
-- 'delivered' is the last step the system takes: the customer closes the order.
create or replace function private.advance_shipment(p_shipment uuid, p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_next text;
  v_due timestamptz;
  v_steps int := 0;
begin
  loop
    select * into s from public.shipments where id = p_shipment for update;
    exit when not found or s.status in ('delivered', 'completed', 'cancelled');

    v_next := private.next_shipment_step(s.status);
    exit when v_next is null;

    v_due := private.shipment_step_due(s.id, v_next);
    exit when v_due is null or v_due > p_now;

    perform private.record_shipment_event(s.id, v_next, 'system', null, null, v_due);
    v_steps := v_steps + 1;
    exit when v_steps >= 10;
  end loop;
  return v_steps;
end;
$$;

-- Every open shipment, oldest activity first. skip locked: two runs never fight over a row.
create or replace function private.advance_due_shipments(p_now timestamptz default now(), p_limit int default 200)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total int := 0;
begin
  for r in
    select id from public.shipments
     where status not in ('delivered', 'completed', 'cancelled')
     order by updated_at
     limit p_limit
     for update skip locked
  loop
    -- one broken shipment must not stop the others
    begin
      v_total := v_total + private.advance_shipment(r.id, p_now);
    exception when others then
      raise warning 'advance_shipment % failed: %', r.id, sqlerrm;
    end;
  end loop;
  return v_total;
end;
$$;

-- Lazy path: whoever opens an order moves its due steps. It only applies steps that are
-- already due by the calendar, so there is nothing the caller can influence.
create or replace function public.advance_order_shipments(p_order uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not (
    private.is_admin()
    or exists (select 1 from public.orders where id = p_order and user_id = auth.uid())
    or exists (select 1 from public.shipments where order_id = p_order and vendor_id = auth.uid())
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

revoke all on function private.advance_shipment(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.advance_due_shipments(timestamptz, int) from public, anon, authenticated;
revoke all on function public.advance_order_shipments(uuid) from public, anon;
grant execute on function public.advance_order_shipments(uuid) to authenticated;

-- pg_cron: every 5 minutes. The project already runs other jobs, which are left alone.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'omnara-advance-shipments') then
    perform cron.unschedule('omnara-advance-shipments');
  end if;
  perform cron.schedule('omnara-advance-shipments', '*/5 * * * *', 'select private.advance_due_shipments()');
end $$;

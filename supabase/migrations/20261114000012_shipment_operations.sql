-- Shipment operations: what a seller and an admin can do to a shipment while it is moving.
--
--   seller : mark "preparing"
--   admin  : pause / resume, force the next step, record an incident
--
-- Incidents are SIMULATED (educational demo): a delay or a failed delivery attempt pushes the
-- rest of the schedule back by N hours (the scheduler holds the shipment and the later steps
-- are measured from when it resumes), and a damaged package tells the customer how to start a
-- return. The customer is emailed in every case.

alter table public.shipments
  add column if not exists on_hold boolean not null default false,   -- paused by an admin until resumed
  add column if not exists hold_until timestamptz,                    -- nothing happens before this time
  add column if not exists hold_reason text check (hold_reason is null or char_length(hold_reason) <= 300);

create table if not exists public.shipment_incidents (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id),
  kind text not null check (kind in ('delay', 'failed_attempt', 'damaged')),
  note text check (note is null or char_length(note) <= 300),
  delay_hours int check (delay_hours is null or delay_hours between 1 and 168),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists shipment_incidents_shipment_idx on public.shipment_incidents (shipment_id, created_at desc);

alter table public.shipment_incidents enable row level security;
drop policy if exists shipment_incidents_select on public.shipment_incidents;
create policy shipment_incidents_select on public.shipment_incidents
  for select to authenticated
  using (shipment_id in (select id from public.shipments));
-- no write policies: incidents are created by admin_add_incident only

-- ------------------------------------------------------------------ the scheduler respects holds
-- Steps are stamped at the later of "when due" and "when the hold ended", so a delay really
-- moves everything that follows.
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
  v_at timestamptz;
  v_steps int := 0;
begin
  loop
    select * into s from public.shipments where id = p_shipment for update;
    exit when not found or s.status in ('delivered', 'completed', 'cancelled');
    exit when s.on_hold or (s.hold_until is not null and s.hold_until > p_now);

    v_next := private.next_shipment_step(s.status);
    exit when v_next is null;

    v_due := private.shipment_step_due(s.id, v_next);
    exit when v_due is null;
    v_at := greatest(v_due, coalesce(s.hold_until, v_due));
    exit when v_at > p_now;

    perform private.record_shipment_event(s.id, v_next, 'system', null, null, v_at);
    v_steps := v_steps + 1;
    exit when v_steps >= 10;
  end loop;
  return v_steps;
end;
$$;

-- The customer-facing timeline: projected times start no earlier than the end of a hold, and
-- a paused shipment has no projection at all.
create or replace function public.shipment_timeline(p_shipment uuid)
returns table (step_order int, status text, at timestamptz, done boolean)
language plpgsql
stable
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_steps text[] := array['confirmed', 'preparing', 'shipped', 'in_transit', 'arrived_state',
                          'out_for_delivery', 'delivered', 'completed'];
  v_times jsonb := '{}'::jsonb;
  v_step text;
  v_real timestamptz;
  v_rule public.shipment_step_rules%rowtype;
  v_base timestamptz;
  v_proj timestamptz;
  i int;
begin
  select * into s from public.shipments where id = p_shipment;
  if not found then
    return;
  end if;

  for i in 1 .. array_length(v_steps, 1) loop
    v_step := v_steps[i];

    select max(e.occurred_at) into v_real
      from public.shipment_events e
     where e.shipment_id = p_shipment and e.status = v_step;

    if v_real is not null then
      v_times := v_times || jsonb_build_object(v_step, v_real);
      step_order := i; status := v_step; at := v_real; done := true;
      return next;
    elsif s.status = 'cancelled' then
      continue;
    else
      v_proj := null;
      if not s.on_hold then
        select * into v_rule from public.shipment_step_rules r where r.status = v_step;
        if found and v_times ? v_rule.from_status then
          v_base := (v_times ->> v_rule.from_status)::timestamptz;
          v_proj := v_base + make_interval(mins => v_rule.offset_minutes);
          if s.hold_until is not null then
            v_proj := greatest(v_proj, s.hold_until);
          end if;
          if v_rule.business_hours_only then
            v_proj := private.next_business_time(v_proj);
          end if;
          v_times := v_times || jsonb_build_object(v_step, v_proj);
        end if;
      end if;
      step_order := i; status := v_step; at := v_proj; done := false;
      return next;
    end if;
  end loop;

  if s.status = 'cancelled' then
    select max(e.occurred_at) into v_real from public.shipment_events e
     where e.shipment_id = p_shipment and e.status = 'cancelled';
    step_order := 9; status := 'cancelled'; at := v_real; done := true;
    return next;
  end if;
end;
$$;

-- --------------------------------------------------------------------- seller: preparing
create or replace function public.vendor_mark_preparing(p_shipment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.shipments%rowtype;
begin
  select * into s from public.shipments where id = p_shipment and vendor_id = uid;
  if not found then
    raise exception 'Shipment not found';
  end if;
  if s.status <> 'confirmed' then
    raise exception 'Only a confirmed shipment can be marked as preparing';
  end if;
  perform private.record_shipment_event(p_shipment, 'preparing', 'vendor', uid, null);
end;
$$;

revoke all on function public.vendor_mark_preparing(uuid) from public, anon;
grant execute on function public.vendor_mark_preparing(uuid) to authenticated;

-- ------------------------------------------------------------------------ admin: hold
create or replace function public.admin_set_hold(p_shipment uuid, p_on_hold boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can pause a shipment';
  end if;
  if not exists (select 1 from public.shipments where id = p_shipment and status not in ('completed', 'cancelled')) then
    raise exception 'Shipment not found or already closed';
  end if;
  update public.shipments
     set on_hold = p_on_hold,
         hold_reason = case when p_on_hold then left(nullif(btrim(coalesce(p_reason, '')), ''), 300) else null end,
         -- resuming: later steps are measured from now, not from the time it stopped
         hold_until = case when p_on_hold then hold_until else greatest(coalesce(hold_until, now()), now()) end,
         updated_at = now()
   where id = p_shipment;
end;
$$;

revoke all on function public.admin_set_hold(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_hold(uuid, boolean, text) to authenticated;

-- ----------------------------------------------------------------- admin: force next step
create or replace function public.admin_force_next_step(p_shipment uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_next text;
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can force a step';
  end if;
  select * into s from public.shipments where id = p_shipment for update;
  if not found then
    raise exception 'Shipment not found';
  end if;
  v_next := private.next_shipment_step(s.status);
  -- the system never closes an order on its own: the customer does
  if v_next is null or s.status in ('delivered', 'completed', 'cancelled') then
    raise exception 'There is no next step to force';
  end if;
  perform private.record_shipment_event(p_shipment, v_next, 'admin', auth.uid(), 'Forced by an administrator');
  -- the schedule continues from this moment
  update public.shipments set hold_until = greatest(coalesce(hold_until, now()), now()) where id = p_shipment;
  return v_next;
end;
$$;

revoke all on function public.admin_force_next_step(uuid) from public, anon;
grant execute on function public.admin_force_next_step(uuid) to authenticated;

-- ------------------------------------------------------------------- admin: incidents
create or replace function public.admin_add_incident(
  p_shipment uuid,
  p_kind text,
  p_note text default null,
  p_delay_hours int default 24
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  o public.orders%rowtype;
  v_id uuid;
  v_hours int := coalesce(p_delay_hours, 24);
  v_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 300);
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can record an incident';
  end if;
  if p_kind not in ('delay', 'failed_attempt', 'damaged') then
    raise exception 'Unknown incident';
  end if;
  select * into s from public.shipments where id = p_shipment for update;
  if not found or s.status in ('completed', 'cancelled') then
    raise exception 'Shipment not found or already closed';
  end if;
  select * into o from public.orders where id = s.order_id;

  if p_kind in ('delay', 'failed_attempt') then
    if v_hours not between 1 and 168 then
      raise exception 'A delay lasts between 1 and 168 hours';
    end if;
    if s.status in ('confirmed', 'preparing') and p_kind = 'failed_attempt' then
      raise exception 'A delivery attempt can only fail once the package has shipped';
    end if;
    update public.shipments
       set hold_until = greatest(coalesce(hold_until, now()), now()) + make_interval(hours => v_hours),
           updated_at = now()
     where id = p_shipment;
  else
    if s.status in ('confirmed', 'preparing') then
      raise exception 'A package can only be damaged once it has shipped';
    end if;
    v_hours := null;
  end if;

  insert into public.shipment_incidents (shipment_id, kind, note, delay_hours, created_by)
  values (p_shipment, p_kind, v_note, v_hours, auth.uid())
  returning id into v_id;

  perform private.enqueue_email(
    coalesce(o.customer_email, private.email_of(o.user_id)),
    private.locale_of(o.user_id),
    'shipment_incident',
    jsonb_build_object(
      'order_number', o.order_number,
      'kind', p_kind,
      'note', v_note,
      'delay_hours', v_hours,
      'estimated_delivery_at', (select t.at from public.shipment_timeline(p_shipment) t where t.status = 'delivered'),
      'items', (select coalesce(jsonb_agg(oi.product_name_snapshot order by oi.id), '[]'::jsonb)
                  from public.order_items oi where oi.shipment_id = p_shipment),
      'view_path', private.order_view_path(o.id)
    )
  );
  return v_id;
end;
$$;

revoke all on function public.admin_add_incident(uuid, text, text, int) from public, anon;
grant execute on function public.admin_add_incident(uuid, text, text, int) to authenticated;

-- --------------------------------------------------------------- tracking with the notice
-- The customer-facing tracking now also says if the shipment is paused or was delayed.
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
             'notice', case
                         when s.status in ('completed', 'cancelled') then null
                         when s.on_hold then jsonb_build_object('kind', 'paused', 'until', null)
                         when s.hold_until is not null and s.hold_until > now() then
                           jsonb_build_object('kind', coalesce(
                             (select i.kind from public.shipment_incidents i
                               where i.shipment_id = s.id and i.kind in ('delay', 'failed_attempt')
                               order by i.created_at desc limit 1), 'delay'), 'until', s.hold_until)
                         when exists (select 1 from public.shipment_incidents i where i.shipment_id = s.id and i.kind = 'damaged')
                           then jsonb_build_object('kind', 'damaged', 'until', null)
                         else null
                       end,
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

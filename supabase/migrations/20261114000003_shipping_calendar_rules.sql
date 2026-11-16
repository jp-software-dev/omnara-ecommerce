-- Real-time schedule for shipments: how long each step takes and when the carrier works.
-- Everything here is configuration (rows an admin can change), not code.
--
-- Rules that came from the project owner:
--   * every order ships within 24 hours of being paid
--   * the cycle then follows real time (no accelerated demo clock)
--   * 100% domestic (Mexico)

-- ---------------------------------------------------------------- calendar
create table if not exists public.shipping_calendar (
  id int primary key default 1 check (id = 1),         -- a single row
  timezone text not null default 'America/Mexico_City',
  business_start time not null default '08:00',
  business_end time not null default '20:00',
  -- ISO weekdays the carrier works: 1 = Monday ... 7 = Sunday
  working_days int[] not null default '{1,2,3,4,5,6}',
  check (business_start < business_end)
);
insert into public.shipping_calendar (id) values (1) on conflict (id) do nothing;

create table if not exists public.mx_holidays (
  day date primary key,
  name text not null
);

-- Mandatory days off under Mexico's Ley Federal del Trabajo (art. 74) for 2026-2028.
insert into public.mx_holidays (day, name) values
  ('2026-12-25', 'Navidad'),
  ('2026-11-16', 'Día de la Revolución (tercer lunes de noviembre)'),
  ('2026-09-16', 'Día de la Independencia'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-03-16', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  ('2026-02-02', 'Día de la Constitución (primer lunes de febrero)'),
  ('2026-01-01', 'Año Nuevo'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-02-01', 'Día de la Constitución (primer lunes de febrero)'),
  ('2027-03-15', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-09-16', 'Día de la Independencia'),
  ('2027-11-15', 'Día de la Revolución (tercer lunes de noviembre)'),
  ('2027-12-25', 'Navidad'),
  ('2028-01-01', 'Año Nuevo'),
  ('2028-02-07', 'Día de la Constitución (primer lunes de febrero)'),
  ('2028-03-20', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  ('2028-05-01', 'Día del Trabajo'),
  ('2028-09-16', 'Día de la Independencia'),
  ('2028-11-20', 'Día de la Revolución (tercer lunes de noviembre)'),
  ('2028-12-25', 'Navidad')
on conflict (day) do nothing;

-- ------------------------------------------------------------- step rules
-- For each step: which earlier step it is measured from, how many minutes later it
-- happens, and whether it can only happen while the carrier works.
create table if not exists public.shipment_step_rules (
  status text primary key
    check (status in ('preparing', 'shipped', 'in_transit', 'arrived_state', 'out_for_delivery', 'delivered')),
  from_status text not null
    check (from_status in ('confirmed', 'preparing', 'shipped', 'in_transit', 'arrived_state', 'out_for_delivery')),
  offset_minutes int not null check (offset_minutes >= 0),
  business_hours_only boolean not null default true
);

insert into public.shipment_step_rules (status, from_status, offset_minutes, business_hours_only) values
  ('preparing',        'confirmed',        120, true),   -- 2 h after payment: "se está preparando"
  ('shipped',          'confirmed',       1440, false),  -- 24 h after payment: every order ships within a day
  ('in_transit',       'shipped',          360, true),   -- 6 h: picked up and on its way
  ('arrived_state',    'in_transit',      2160, true),   -- 36 h: "ya llegó a tu estado"
  ('out_for_delivery', 'arrived_state',    720, true),   -- 12 h: "ya se envió a tu casa"
  ('delivered',        'out_for_delivery', 360, true)    -- 6 h: delivered, waits for the customer
on conflict (status) do nothing;

-- ----------------------------------------------------------------- security
alter table public.shipping_calendar enable row level security;
alter table public.mx_holidays enable row level security;
alter table public.shipment_step_rules enable row level security;

drop policy if exists shipping_calendar_select on public.shipping_calendar;
create policy shipping_calendar_select on public.shipping_calendar for select to authenticated using (true);
drop policy if exists shipping_calendar_admin on public.shipping_calendar;
create policy shipping_calendar_admin on public.shipping_calendar for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists mx_holidays_select on public.mx_holidays;
create policy mx_holidays_select on public.mx_holidays for select to authenticated using (true);
drop policy if exists mx_holidays_admin on public.mx_holidays;
create policy mx_holidays_admin on public.mx_holidays for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists shipment_step_rules_select on public.shipment_step_rules;
create policy shipment_step_rules_select on public.shipment_step_rules for select to authenticated using (true);
drop policy if exists shipment_step_rules_admin on public.shipment_step_rules;
create policy shipment_step_rules_admin on public.shipment_step_rules for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- --------------------------------------------------------------- functions
-- Earliest moment at or after p_ts when the carrier works: a working weekday that is
-- not a holiday, between business_start and business_end in the configured timezone.
create or replace function private.next_business_time(p_ts timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  c public.shipping_calendar%rowtype;
  v_local timestamp;
  v_day date;
  v_guard int := 0;
begin
  select * into c from public.shipping_calendar where id = 1;
  v_local := p_ts at time zone c.timezone;

  loop
    v_guard := v_guard + 1;
    if v_guard > 60 then
      raise exception 'No business time found within 60 days';
    end if;

    v_day := v_local::date;
    if extract(isodow from v_day)::int = any (c.working_days)
       and not exists (select 1 from public.mx_holidays h where h.day = v_day) then
      if v_local::time < c.business_start then
        return (v_day + c.business_start) at time zone c.timezone;
      elsif v_local::time < c.business_end then
        return v_local at time zone c.timezone;
      end if;
    end if;
    -- try again at the start of the next day
    v_local := (v_day + 1) + c.business_start;
  end loop;
end;
$$;

-- Step that follows p_status on the path, or null when there is none.
create or replace function private.next_shipment_step(p_status text)
returns text
language sql
immutable
as $$
  select case p_status
    when 'confirmed' then 'preparing'
    when 'preparing' then 'shipped'
    when 'shipped' then 'in_transit'
    when 'in_transit' then 'arrived_state'
    when 'arrived_state' then 'out_for_delivery'
    when 'out_for_delivery' then 'delivered'
  end;
$$;

-- When p_status is due for this shipment, from the real time of the step it is
-- measured from. Null when that earlier step has not happened yet. The 'shipped' rule
-- is 24 hours after payment and not limited to business hours, which is the promise
-- stored in shipments.ship_by.
create or replace function private.shipment_step_due(p_shipment uuid, p_status text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  r public.shipment_step_rules%rowtype;
  v_base timestamptz;
  v_due timestamptz;
begin
  select * into r from public.shipment_step_rules where status = p_status;
  if not found then
    return null;
  end if;

  select max(occurred_at) into v_base
    from public.shipment_events
   where shipment_id = p_shipment and status = r.from_status;
  if v_base is null then
    return null;
  end if;

  v_due := v_base + make_interval(mins => r.offset_minutes);
  if r.business_hours_only then
    v_due := private.next_business_time(v_due);
  end if;
  return v_due;
end;
$$;

revoke all on function private.next_business_time(timestamptz) from public, anon;
revoke all on function private.shipment_step_due(uuid, text) from public, anon;
grant execute on function private.next_business_time(timestamptz) to authenticated;

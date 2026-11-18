-- A delay must ADD time, not just forbid anything earlier than N hours from now.
--
-- Before: an incident held the shipment until now + N hours. If the next step was already
-- 36 h away, a 48 h "delay" barely moved anything (and the calendar's overnight gaps absorbed
-- the rest). Now an incident adds N hours to the shipment's pending delay; that delay is added
-- to the due time of the NEXT step (before the carrier-hours rule is applied) and is cleared as
-- soon as that step happens, so every later step, measured from the real time of the previous
-- one, moves back by the same amount.

alter table public.shipments
  add column if not exists delay_minutes int not null default 0 check (delay_minutes >= 0);

-- due time of a step now includes the pending delay
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
  v_delay int;
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

  select delay_minutes into v_delay from public.shipments where id = p_shipment;
  v_due := v_base + make_interval(mins => r.offset_minutes + coalesce(v_delay, 0));
  if r.business_hours_only then
    v_due := private.next_business_time(v_due);
  end if;
  return v_due;
end;
$$;

-- recording a step consumes the pending delay
create or replace function private.record_shipment_event(
  p_shipment uuid,
  p_status text,
  p_source text,
  p_actor uuid default null,
  p_note text default null,
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_event uuid;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then
    raise exception 'Shipment not found';
  end if;

  if s.status in ('completed', 'cancelled') then
    raise exception 'This shipment is already closed';
  end if;

  if p_status = 'cancelled' then
    if s.status not in ('confirmed', 'preparing') then
      raise exception 'A shipment can only be cancelled before it ships';
    end if;
  elsif p_status = 'completed' then
    if s.status <> 'delivered' then
      raise exception 'Only a delivered shipment can be completed';
    end if;
  elsif private.shipment_rank(p_status) is null
        or private.shipment_rank(p_status) <= private.shipment_rank(s.status) then
    raise exception 'Invalid shipment transition % -> %', s.status, p_status;
  end if;

  insert into public.shipment_events (shipment_id, status, occurred_at, source, actor_id, note)
  values (p_shipment, p_status, p_at, p_source, p_actor, p_note)
  returning id into v_event;

  update public.shipments
     set status = p_status,
         shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, p_at) else shipped_at end,
         delivered_at = case when p_status = 'delivered' then p_at else delivered_at end,
         completed_at = case when p_status = 'completed' then p_at else completed_at end,
         delay_minutes = 0,
         updated_at = now()
   where id = p_shipment;

  return v_event;
end;
$$;

revoke all on function private.record_shipment_event(uuid, text, text, uuid, text, timestamptz) from public, anon, authenticated;

-- the customer-facing timeline: the first pending step carries the delay, the rest follow
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
  v_first_pending boolean := true;
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
          v_proj := v_base + make_interval(mins => v_rule.offset_minutes + case when v_first_pending then s.delay_minutes else 0 end);
          if s.hold_until is not null then
            v_proj := greatest(v_proj, s.hold_until);
          end if;
          if v_rule.business_hours_only then
            v_proj := private.next_business_time(v_proj);
          end if;
          v_times := v_times || jsonb_build_object(v_step, v_proj);
        end if;
      end if;
      v_first_pending := false;
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

-- delays and failed attempts now add time
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
    if s.status = 'delivered' then
      raise exception 'The package was already delivered';
    end if;
    update public.shipments
       set delay_minutes = least(delay_minutes + v_hours * 60, 168 * 60),
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

-- tracking notice: a pending delay, a pause, or a damaged package
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
                         when s.delay_minutes > 0 then
                           jsonb_build_object('kind', coalesce(
                             (select i.kind from public.shipment_incidents i
                               where i.shipment_id = s.id and i.kind in ('delay', 'failed_attempt')
                               order by i.created_at desc limit 1), 'delay'),
                             'until', (select t.at from public.shipment_timeline(s.id) t
                                        where t.status = 'delivered'))
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

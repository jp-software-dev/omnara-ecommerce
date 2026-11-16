-- What the customer sees: every step of a shipment, with the real time for the steps that
-- already happened and the projected time (from the same rules and calendar the scheduler
-- uses) for the ones still to come. Runs as the caller, so it only returns shipments
-- they are allowed to see.

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
  v_times jsonb := '{}'::jsonb;   -- step -> timestamp (real or projected)
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
      -- a cancelled shipment has no future
      continue;
    else
      v_proj := null;
      select * into v_rule from public.shipment_step_rules r where r.status = v_step;
      if found and v_times ? v_rule.from_status then
        v_base := (v_times ->> v_rule.from_status)::timestamptz;
        v_proj := v_base + make_interval(mins => v_rule.offset_minutes);
        if v_rule.business_hours_only then
          v_proj := private.next_business_time(v_proj);
        end if;
        v_times := v_times || jsonb_build_object(v_step, v_proj);
      end if;
      -- 'completed' has no schedule: it waits for the customer
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

revoke all on function public.shipment_timeline(uuid) from public, anon;
grant execute on function public.shipment_timeline(uuid) to authenticated;

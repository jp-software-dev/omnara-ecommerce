-- Database checks for the Omnara demo. Every block runs inside a transaction that is
-- ALWAYS rolled back, so nothing is left behind and no data is deleted.
--
-- Run the whole file against the project database (SQL editor, `psql -f`, or the
-- Supabase MCP `execute_sql`). A failing check raises an exception that starts with
-- "FAIL:"; when everything passes the last notice says "ALL CHECKS PASSED".
--
-- Needs: at least one admin in public.profiles. The payout and shipment checks also
-- need one order; they are skipped with a notice when there is none.

begin;

do $$
declare
  v_admin uuid;
  v_err text;
begin
  select id into v_admin from public.profiles where role = 'admin' limit 1;
  if v_admin is null then
    raise exception 'FAIL: no admin profile to run the checks with';
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 1. Return attachments -------------------------------------------------
  if private.is_return_participant('not-a-uuid') then
    raise exception 'FAIL: a malformed folder name must not be a participant';
  end if;

  begin
    perform public.add_return_message('00000000-0000-0000-0000-000000000001', 'hola', '../../etc/passwd');
    raise exception 'FAIL: a path outside the return folder must be rejected';
  exception when others then
    if sqlerrm <> 'Invalid attachment' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
  end;

  begin
    perform public.add_return_message('00000000-0000-0000-0000-000000000001', 'hola');
    raise exception 'FAIL: a message on an unknown return must be rejected';
  exception when others then
    if sqlerrm <> 'Return not found' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
  end;

  -- 2. Simulated payouts --------------------------------------------------
  declare
    v_vendor uuid;
    v_before jsonb;
    v_after jsonb;
    v_payout uuid;
    v_bps int;
  begin
    select vendor_id into v_vendor from public.order_items where vendor_id is not null limit 1;
    if v_vendor is null then
      raise notice 'SKIP: no order items, payout checks skipped';
    else
      update public.order_items
         set shipped_at = coalesce(shipped_at, now()), delivered_at = coalesce(delivered_at, now()), completed_at = coalesce(completed_at, now())
       where vendor_id = v_vendor;
      select commission_bps into v_bps from public.app_settings limit 1;
      v_before := public.seller_balance(v_vendor);

      if (v_before->>'commission_mxn_cents')::bigint
         <> round((v_before->>'gross_mxn_cents')::bigint * v_bps / 10000.0) then
        raise exception 'FAIL: commission is not commission_bps of the gross amount: %', v_before;
      end if;

      if (v_before->>'items')::int > 0 then
        v_payout := public.create_simulated_payout(v_vendor);
        v_after := public.seller_balance(v_vendor);
        if (v_after->>'items')::int <> 0 then
          raise exception 'FAIL: items remain payable after a payout: %', v_after;
        end if;
        begin
          perform public.create_simulated_payout(v_vendor);
          raise exception 'FAIL: the same items were paid out twice';
        exception when others then
          if sqlerrm <> 'Nothing to pay out' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
        end;
      end if;
    end if;
  end;

  -- 3. Shipments -----------------------------------------------------------
  declare
    v_order public.orders%rowtype;
    v_other uuid;
    v_count_before int;
  begin
    select * into v_order from public.orders limit 1;
    if v_order.id is null then
      raise notice 'SKIP: no orders, shipment checks skipped';
    else
      if exists (select 1 from public.order_items where vendor_id is not null and shipment_id is null) then
        raise exception 'FAIL: an item with a seller has no shipment';
      end if;

      select id into v_other from public.profiles
       where id not in (select vendor_id from public.order_items where order_id = v_order.id and vendor_id is not null)
       limit 1;
      select count(*) into v_count_before from public.shipments where order_id = v_order.id;

      insert into public.order_items (order_id, product_name_snapshot, quantity, unit_price_cents, vendor_id)
      values (v_order.id, '{"es":"t","en":"t"}', 1, 100, v_other),
             (v_order.id, '{"es":"t","en":"t"}', 1, 100, v_other);
      if (select count(*) from public.shipments where order_id = v_order.id) <> v_count_before + 1 then
        raise exception 'FAIL: two items of the same new seller must share ONE new shipment';
      end if;
      if (select ship_by - created_at from public.shipments where order_id = v_order.id and vendor_id = v_other) > interval '24 hours 1 minute' then
        raise exception 'FAIL: a new shipment must have a 24-hour ship_by deadline';
      end if;

      update public.order_items set shipped_at = now(), tracking_number = 'SIM-EXP-1234567890'
       where order_id = v_order.id and vendor_id = v_other;
      if (select status from public.shipments where order_id = v_order.id and vendor_id = v_other) <> 'shipped' then
        raise exception 'FAIL: shipping every item of a seller must move that shipment to shipped';
      end if;
      if exists (select 1 from public.shipments where order_id = v_order.id and vendor_id <> v_other and status = 'shipped')
         and exists (select 1 from public.order_items where order_id = v_order.id and vendor_id <> v_other and shipped_at is null) then
        raise exception 'FAIL: shipping one seller must not move another seller''s shipment';
      end if;

      begin
        insert into public.shipments (order_id, vendor_id) values (v_order.id, v_other);
        -- the superuser running this script bypasses RLS; the real guarantee is that
        -- no INSERT policy exists for authenticated users
      exception when unique_violation then null;
      end;
      if exists (select 1 from pg_policies where tablename = 'shipments' and cmd <> 'SELECT') then
        raise exception 'FAIL: shipments must have no write policies';
      end if;
    end if;
  end;

  -- 4. Shipment events and the status machine ---------------------------------
  declare
    v_ship uuid;
    v_err text;
  begin
    -- a brand-new shipment for a seller that has none in the first order
    insert into public.shipments (order_id, vendor_id)
    select o.id, p.id
      from (select id from public.orders limit 1) o
      join public.profiles p on p.id not in (select vendor_id from public.shipments where order_id = o.id)
     limit 1
    returning id into v_ship;

    if v_ship is not null then
      if not exists (select 1 from public.shipment_events where shipment_id = v_ship and status = 'confirmed') then
        raise exception 'FAIL: every shipment must start with a confirmed event';
      end if;

      perform private.record_shipment_event(v_ship, 'preparing', 'system');
      perform private.record_shipment_event(v_ship, 'shipped', 'vendor');
      perform private.record_shipment_event(v_ship, 'in_transit', 'system');
      perform private.record_shipment_event(v_ship, 'arrived_state', 'system');
      perform private.record_shipment_event(v_ship, 'out_for_delivery', 'system');
      perform private.record_shipment_event(v_ship, 'delivered', 'system');

      begin
        perform private.record_shipment_event(v_ship, 'in_transit', 'system');
        raise exception 'FAIL: a shipment moved backwards';
      exception when others then
        if sqlerrm not like 'Invalid shipment transition%' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
      end;
      begin
        perform private.record_shipment_event(v_ship, 'cancelled', 'admin');
        raise exception 'FAIL: a shipped shipment was cancelled';
      exception when others then
        if sqlerrm <> 'A shipment can only be cancelled before it ships' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
      end;

      perform private.record_shipment_event(v_ship, 'completed', 'customer');
      if (select completed_at from public.shipments where id = v_ship) is null then
        raise exception 'FAIL: completed_at was not set';
      end if;
      begin
        perform private.record_shipment_event(v_ship, 'delivered', 'system');
        raise exception 'FAIL: a completed shipment was reopened';
      exception when others then
        if sqlerrm <> 'This shipment is already closed' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
      end;

      begin
        update public.shipment_events set note = 'x' where shipment_id = v_ship;
        raise exception 'FAIL: an event was edited';
      exception when others then
        if sqlerrm <> 'Shipment events cannot be changed or deleted' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
      end;
      begin
        delete from public.shipment_events where shipment_id = v_ship;
        raise exception 'FAIL: an event was deleted';
      exception when others then
        if sqlerrm <> 'Shipment events cannot be changed or deleted' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
      end;
    end if;
  end;

  -- 5. Business calendar (America/Mexico_City, Mon-Sat 08:00-20:00, no holidays) ---
  declare
    v_tz text;
  begin
    select timezone into v_tz from public.shipping_calendar where id = 1;
    -- inside the window: unchanged
    if private.next_business_time(timestamp '2026-11-09 10:00' at time zone v_tz)
       <> timestamp '2026-11-09 10:00' at time zone v_tz then
      raise exception 'FAIL: a working moment must not move';
    end if;
    -- after closing: next morning
    if private.next_business_time(timestamp '2026-11-09 21:00' at time zone v_tz)
       <> timestamp '2026-11-10 08:00' at time zone v_tz then
      raise exception 'FAIL: after closing the next business time is the next morning';
    end if;
    -- Saturday night, Sunday off and Monday 16 Nov 2026 is a holiday: Tuesday morning
    if private.next_business_time(timestamp '2026-11-14 21:00' at time zone v_tz)
       <> timestamp '2026-11-17 08:00' at time zone v_tz then
      raise exception 'FAIL: weekend plus holiday must skip to Tuesday 08:00';
    end if;
    -- before opening: same day at opening
    if private.next_business_time(timestamp '2026-11-10 05:00' at time zone v_tz)
       <> timestamp '2026-11-10 08:00' at time zone v_tz then
      raise exception 'FAIL: before opening the next business time is opening';
    end if;
    -- Christmas (a Friday in 2026) is skipped
    if private.next_business_time(timestamp '2026-12-25 10:00' at time zone v_tz)
       <> timestamp '2026-12-26 08:00' at time zone v_tz then
      raise exception 'FAIL: a holiday must be skipped';
    end if;
    -- the 24-hour shipping promise is not limited to business hours
    if (select business_hours_only from public.shipment_step_rules where status = 'shipped')
       or (select offset_minutes from public.shipment_step_rules where status = 'shipped') <> 1440
       or (select from_status from public.shipment_step_rules where status = 'shipped') <> 'confirmed' then
      raise exception 'FAIL: shipping must be due exactly 24 hours after payment';
    end if;
  end;

  -- 6. The scheduler, with a simulated clock ----------------------------------
  -- A shipment confirmed on Tuesday 10 Nov 2026 at 10:00 (Mexico City) must reach each
  -- step at the time the rules and the calendar say, and be idempotent.
  declare
    v_tz text;
    v_ord uuid;
    v_sh uuid;
    v_expected text[][] := array[
      array['2026-11-10 11:00', 'confirmed'],
      array['2026-11-10 13:00', 'preparing'],
      array['2026-11-11 11:00', 'shipped'],
      array['2026-11-11 17:00', 'in_transit'],
      array['2026-11-13 09:00', 'arrived_state'],
      array['2026-11-14 09:00', 'out_for_delivery'],
      array['2026-11-14 15:00', 'delivered']
    ];
    i int;
  begin
    select timezone into v_tz from public.shipping_calendar where id = 1;
    select id into v_ord from public.orders limit 1;
    if v_ord is not null then
      insert into public.shipments (order_id, vendor_id, created_at, ship_by)
      select v_ord, p.id, timestamp '2026-11-10 10:00' at time zone v_tz, timestamp '2026-11-11 10:00' at time zone v_tz
        from public.profiles p
       where p.id not in (select vendor_id from public.shipments where order_id = v_ord)
       limit 1
      returning id into v_sh;

      for i in 1 .. array_length(v_expected, 1) loop
        perform private.advance_shipment(v_sh, v_expected[i][1]::timestamp at time zone v_tz);
        if (select status from public.shipments where id = v_sh) <> v_expected[i][2] then
          raise exception 'FAIL: at % the shipment should be % but is %', v_expected[i][1], v_expected[i][2],
            (select status from public.shipments where id = v_sh);
        end if;
      end loop;

      if (select tracking_number from public.shipments where id = v_sh) not like 'SIM-EXP-%' then
        raise exception 'FAIL: a shipment shipped by the system must get a simulated label';
      end if;
      if private.advance_shipment(v_sh, timestamp '2026-11-30 12:00' at time zone v_tz) <> 0 then
        raise exception 'FAIL: a delivered shipment must not advance by itself (the customer closes it)';
      end if;
      if (select occurred_at at time zone v_tz from public.shipment_events
           where shipment_id = v_sh and status = 'arrived_state') <> timestamp '2026-11-13 08:00' then
        raise exception 'FAIL: catch-up events must be stamped with the time they were due';
      end if;

      -- the order is completed once the customer has closed every one of its shipments
      -- (earlier checks leave other shipments of this order in different states)
      perform private.advance_due_shipments(now() + interval '60 days');
      if exists (select 1 from public.shipments where order_id = v_ord and status in ('confirmed', 'preparing', 'shipped', 'in_transit', 'arrived_state', 'out_for_delivery')) then
        raise exception 'FAIL: the scheduler left a shipment on the way after 60 days';
      end if;
      perform private.record_shipment_event(s.id, 'completed', 'customer') from public.shipments s where s.order_id = v_ord and s.status = 'delivered';
      if (select status from public.orders where id = v_ord) <> 'completed' then
        raise exception 'FAIL: the order should be completed once the customer closed every shipment';
      end if;
    end if;
  end;

  -- 7. A non-admin cannot read another seller's balance or create payouts ---
  perform set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated')::text, true);
  begin
    perform public.create_simulated_payout(v_admin);
    raise exception 'FAIL: a non-admin created a payout';
  exception when others then
    if sqlerrm <> 'Only an administrator can create payouts' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
  end;
  begin
    perform public.seller_balance(v_admin);
    raise exception 'FAIL: a non-admin read another seller''s balance';
  exception when others then
    if sqlerrm <> 'Not allowed' then raise exception 'FAIL: unexpected error %', sqlerrm; end if;
  end;

  raise notice 'ALL CHECKS PASSED';
end $$;

rollback;

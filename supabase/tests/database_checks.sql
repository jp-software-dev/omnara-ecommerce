-- Database checks for the Omnara demo. Every block runs inside a transaction that is
-- ALWAYS rolled back, so nothing is left behind and no data is deleted.
--
-- Run the whole file against the project database (SQL editor, `psql -f`, or the
-- Supabase MCP `execute_sql`). A failing check raises an exception that starts with
-- "FAIL:"; when everything passes the last notice says "ALL CHECKS PASSED".
--
-- Needs: at least one admin in public.profiles. The payout check also needs one
-- order item; it is skipped with a notice when there is none.

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
      update public.order_items set shipped_at = coalesce(shipped_at, now()) where vendor_id = v_vendor;
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

  -- 3. A non-admin cannot read another seller's balance or create payouts ---
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

-- Seller commission and SIMULATED payouts (educational demo: no money moves).
-- The marketplace keeps a commission on every sold item (default 3% = 300 bps) and an
-- admin can "pay out" what is owed to a seller. A payout only records the ledger entry.

alter table public.app_settings
  add column if not exists commission_bps integer not null default 300
  check (commission_bps between 0 and 5000);

create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id),
  gross_mxn_cents integer not null check (gross_mxn_cents >= 0),
  commission_mxn_cents integer not null check (commission_mxn_cents >= 0),
  net_mxn_cents integer not null check (net_mxn_cents >= 0),
  commission_bps integer not null,
  items_count integer not null check (items_count > 0),
  reference text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists seller_payouts_vendor_idx on public.seller_payouts (vendor_id, created_at desc);

alter table public.order_items
  add column if not exists payout_id uuid references public.seller_payouts(id);

create index if not exists order_items_payout_idx on public.order_items (payout_id) where payout_id is null;

alter table public.seller_payouts enable row level security;

drop policy if exists seller_payouts_select on public.seller_payouts;
create policy seller_payouts_select on public.seller_payouts
  for select to authenticated
  using (vendor_id = (select auth.uid()) or (select private.is_admin()));
-- no insert/update/delete policies: payouts are only created by create_simulated_payout()

-- An item is payable when it was shipped, belongs to a paid/fulfilled order, has not
-- been paid out and has no open or refunded return against it. Amounts are in MXN
-- (USD orders are converted with the current rate; fine for a demo ledger).
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
    and oi.shipped_at is not null
    and o.status in ('paid', 'fulfilled')
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

  -- lock the payable items so two admins cannot pay the same items twice
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
      and oi.shipped_at is not null
      and o.status in ('paid', 'fulfilled')
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

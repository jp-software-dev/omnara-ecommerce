-- Fulfillment analytics: how orders move through shipping and delivery, and how each seller does.
--
-- One function for admins (everything) and sellers (only their own shipments). Unit of
-- measurement is the shipment, because each seller ships their own part of an order.
-- "On time" means the shipment left within its 24-hour promise (ship_by).

create or replace function public.fulfillment_analytics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_scope uuid;                       -- null = everything (admin)
  v_start timestamptz;
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_funnel jsonb;
  v_timing jsonb;
  v_returns jsonb;
  v_vendors jsonb;
  v_payouts jsonb;
begin
  if uid is null then
    raise exception 'Not allowed';
  end if;
  if private.is_admin() then
    v_scope := null;
  elsif exists (select 1 from public.profiles where id = uid and role = 'vendor') then
    v_scope := uid;
  else
    raise exception 'Not allowed';
  end if;
  v_start := now() - make_interval(days => v_days);

  -- funnel: what happened to the shipments created in the period
  select jsonb_build_object(
           'shipments', count(*),
           'shipped', count(*) filter (where s.shipped_at is not null),
           'delivered', count(*) filter (where s.delivered_at is not null),
           'completed', count(*) filter (where s.status = 'completed'),
           'cancelled', count(*) filter (where s.status = 'cancelled'),
           'reviewed', count(*) filter (where s.status = 'completed' and exists (
               select 1
                 from public.order_items oi
                 join public.product_variants pv on pv.id = oi.variant_id
                 join public.orders o on o.id = oi.order_id
                 join public.reviews rv on rv.product_id = pv.product_id and rv.user_id = o.user_id
                where oi.shipment_id = s.id))
         )
    into v_funnel
    from public.shipments s
   where s.created_at >= v_start and (v_scope is null or s.vendor_id = v_scope);

  -- timing and punctuality
  select jsonb_build_object(
           'avg_prepare_hours', round((avg(extract(epoch from s.shipped_at - s.created_at) / 3600)
                                       filter (where s.shipped_at is not null))::numeric, 1),
           'avg_transit_hours', round((avg(extract(epoch from s.delivered_at - s.shipped_at) / 3600)
                                       filter (where s.delivered_at is not null))::numeric, 1),
           'avg_close_hours', round((avg(extract(epoch from s.completed_at - s.delivered_at) / 3600)
                                     filter (where s.completed_at is not null))::numeric, 1),
           'shipped_on_time', count(*) filter (where s.shipped_at is not null and s.ship_by is not null and s.shipped_at <= s.ship_by),
           'shipped_late', count(*) filter (where s.shipped_at is not null and s.ship_by is not null and s.shipped_at > s.ship_by),
           'overdue_now', count(*) filter (where s.shipped_at is null and s.status in ('confirmed', 'preparing')
                                           and s.ship_by is not null and s.ship_by < now())
         )
    into v_timing
    from public.shipments s
   where s.created_at >= v_start and (v_scope is null or s.vendor_id = v_scope);

  -- returns by reason
  select coalesce(jsonb_agg(jsonb_build_object('reason', x.reason, 'count', x.n, 'refunded', x.refunded) order by x.n desc), '[]'::jsonb)
    into v_returns
    from (
      select rr.reason, count(*) as n, count(*) filter (where rr.status = 'refunded') as refunded
        from public.return_requests rr
       where rr.created_at >= v_start and (v_scope is null or rr.vendor_id = v_scope)
       group by rr.reason
    ) x;

  -- per seller (the platform's own products appear as one row with no seller)
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.shipments desc), '[]'::jsonb)
    into v_vendors
    from (
      select s.vendor_id,
             coalesce(b.name, 'Omnara') as name,
             count(*) as shipments,
             count(*) filter (where s.shipped_at is not null) as shipped,
             case when count(*) filter (where s.shipped_at is not null) = 0 then null
                  else round(100.0 * count(*) filter (where s.shipped_at is not null and s.shipped_at <= s.ship_by)
                                   / count(*) filter (where s.shipped_at is not null), 0) end as on_time_pct,
             round((avg(extract(epoch from s.delivered_at - s.shipped_at) / 3600)
                    filter (where s.delivered_at is not null))::numeric, 1) as avg_transit_hours,
             count(*) filter (where s.status = 'cancelled') as cancelled,
             (select count(*) from public.return_requests rr
               where rr.created_at >= v_start and rr.vendor_id is not distinct from s.vendor_id) as returns,
             br.avg_rating
        from public.shipments s
        left join public.businesses b on b.owner_id = s.vendor_id
        left join public.business_ratings br on br.business_id = b.id
       where s.created_at >= v_start and (v_scope is null or s.vendor_id = v_scope)
       group by s.vendor_id, b.name, br.avg_rating
    ) x;

  -- commission and payouts in the period
  select jsonb_build_object(
           'payouts', count(*),
           'gross_mxn_cents', coalesce(sum(p.gross_mxn_cents), 0),
           'commission_mxn_cents', coalesce(sum(p.commission_mxn_cents), 0),
           'net_mxn_cents', coalesce(sum(p.net_mxn_cents), 0)
         )
    into v_payouts
    from public.seller_payouts p
   where p.created_at >= v_start and (v_scope is null or p.vendor_id = v_scope);

  return jsonb_build_object(
    'days', v_days,
    'scope', case when v_scope is null then 'admin' else 'vendor' end,
    'funnel', v_funnel,
    'timing', v_timing,
    'returns', v_returns,
    'vendors', v_vendors,
    'payouts', v_payouts
  );
end;
$$;

revoke all on function public.fulfillment_analytics(int) from public, anon;
grant execute on function public.fulfillment_analytics(int) to authenticated;

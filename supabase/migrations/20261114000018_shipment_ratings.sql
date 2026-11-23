-- Rating the shipping experience (separate from rating the product and the seller).
--
-- After the customer closes a shipment they can rate the delivery from 1 to 5, with an optional
-- comment. One rating per shipment, no edits. A guest rates with the order's secret token. The
-- average appears in the tracking (so the customer sees what they sent) and in the fulfillment
-- report, overall and per seller.

create table if not exists public.shipment_ratings (
  shipment_id uuid primary key references public.shipments(id),
  user_id uuid references public.profiles(id),               -- null for a guest order
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now()
);

alter table public.shipment_ratings enable row level security;
drop policy if exists shipment_ratings_select on public.shipment_ratings;
create policy shipment_ratings_select on public.shipment_ratings
  for select to authenticated
  using (shipment_id in (select id from public.shipments));
-- no write policies: ratings are created by rate_shipment only

create or replace function public.rate_shipment(
  p_shipment uuid,
  p_rating int,
  p_comment text default null,
  p_token uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.shipments%rowtype;
  v_comment text := left(nullif(btrim(coalesce(p_comment, '')), ''), 300);
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'The rating must be between 1 and 5';
  end if;

  select sh.* into s
    from public.shipments sh
    join public.orders o on o.id = sh.order_id
   where sh.id = p_shipment
     and ((uid is not null and o.user_id = uid)
          or (p_token is not null and o.demo_token = p_token));
  if not found then
    raise exception 'Shipment not found';
  end if;
  if s.status <> 'completed' then
    raise exception 'You can rate a shipment once you have confirmed the delivery';
  end if;

  begin
    insert into public.shipment_ratings (shipment_id, user_id, rating, comment)
    values (p_shipment, uid, p_rating, v_comment);
  exception when unique_violation then
    raise exception 'This shipment was already rated';
  end;
end;
$$;

revoke all on function public.rate_shipment(uuid, int, text, uuid) from public;
grant execute on function public.rate_shipment(uuid, int, text, uuid) to anon, authenticated;

-- tracking: add the rating the customer gave, if any
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
             'rating', (select jsonb_build_object('rating', r.rating, 'comment', r.comment)
                          from public.shipment_ratings r where r.shipment_id = s.id),
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

-- fulfillment report: the shipping rating, overall and per seller
create or replace function public.fulfillment_analytics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_scope uuid;
  v_start timestamptz;
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_funnel jsonb;
  v_timing jsonb;
  v_returns jsonb;
  v_vendors jsonb;
  v_payouts jsonb;
  v_rating jsonb;
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

  select jsonb_build_object('avg', round(avg(r.rating)::numeric, 1), 'count', count(*))
    into v_rating
    from public.shipment_ratings r
    join public.shipments s on s.id = r.shipment_id
   where s.created_at >= v_start and (v_scope is null or s.vendor_id = v_scope);

  select coalesce(jsonb_agg(jsonb_build_object('reason', x.reason, 'count', x.n, 'refunded', x.refunded) order by x.n desc), '[]'::jsonb)
    into v_returns
    from (
      select rr.reason, count(*) as n, count(*) filter (where rr.status = 'refunded') as refunded
        from public.return_requests rr
       where rr.created_at >= v_start and (v_scope is null or rr.vendor_id = v_scope)
       group by rr.reason
    ) x;

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
             br.avg_rating,
             (select round(avg(r.rating)::numeric, 1)
                from public.shipment_ratings r
                join public.shipments s2 on s2.id = r.shipment_id
               where s2.vendor_id is not distinct from s.vendor_id and s2.created_at >= v_start) as shipping_rating
        from public.shipments s
        left join public.businesses b on b.owner_id = s.vendor_id
        left join public.business_ratings br on br.business_id = b.id
       where s.created_at >= v_start and (v_scope is null or s.vendor_id = v_scope)
       group by s.vendor_id, b.name, br.avg_rating
    ) x;

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
    'shipping_rating', v_rating,
    'returns', v_returns,
    'vendors', v_vendors,
    'payouts', v_payouts
  );
end;
$$;

revoke all on function public.fulfillment_analytics(int) from public, anon;
grant execute on function public.fulfillment_analytics(int) to authenticated;

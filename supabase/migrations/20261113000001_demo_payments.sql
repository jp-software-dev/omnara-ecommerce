-- Omnara is an educational demo. This migration makes it fully usable without any
-- external payment account and without the service-role key:
--
--  1. validate_promo_code() and best_selling_product_ids() replace the two places
--     that needed the service-role key. Each returns only what the page needs, so
--     promo_codes and order_items stay locked down.
--  2. place_demo_order() creates a clearly-marked SIMULATED paid order (payment_method
--     = 'demo', no payment intent) when Stripe is not configured, repeating what the
--     Stripe webhook does: server-side prices, shipping, discount, stock and
--     inventory movements. It only works while app_settings.demo_payments_enabled is
--     true and is throttled (5 per buyer and 60 in total per hour).
--  3. get_demo_order() lets the buyer (even a guest) see their confirmation through
--     an unguessable per-order token.

alter table public.app_settings add column demo_payments_enabled boolean not null default false;
alter table public.orders add column demo_token uuid;

-- ---------------------------------------------------------------------------
create or replace function public.validate_promo_code(p_code text, p_subtotal_mxn_cents integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  pr promo_codes%rowtype;
  v_discount integer;
begin
  select * into pr from promo_codes where code = upper(btrim(coalesce(p_code, ''))) and is_active;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;
  if pr.expires_at is not null and pr.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  if pr.usage_limit is not null and pr.times_used >= pr.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'limit_reached');
  end if;
  if p_subtotal_mxn_cents < pr.min_order_cents then
    return jsonb_build_object('valid', false, 'reason', 'min_order');
  end if;

  if pr.discount_type = 'percentage' then
    v_discount := round(p_subtotal_mxn_cents * pr.discount_value / 100)::integer;
  else
    v_discount := round(pr.discount_value)::integer;
  end if;

  return jsonb_build_object(
    'valid', true,
    'discountCents', least(v_discount, p_subtotal_mxn_cents),
    'discountType', pr.discount_type
  );
end;
$$;

-- ---------------------------------------------------------------------------
create or replace function public.best_selling_product_ids(p_limit integer default 8)
returns table (product_id uuid, units bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pv.product_id, sum(oi.quantity)::bigint as units
    from order_items oi
    join orders o on o.id = oi.order_id
    join product_variants pv on pv.id = oi.variant_id
   where o.status in ('paid', 'fulfilled')
   group by pv.product_id
   order by units desc, pv.product_id
   limit greatest(least(coalesce(p_limit, 8), 50), 1);
$$;

-- ---------------------------------------------------------------------------
create or replace function public.place_demo_order(
  p_items jsonb,
  p_currency text,
  p_email text,
  p_promo text,
  p_ship jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  st app_settings%rowtype;
  uid uuid := auth.uid();
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_cur text := case when upper(coalesce(p_currency, 'MXN')) = 'USD' then 'USD' else 'MXN' end;
  v_rate numeric;
  v_item jsonb;
  v_variant_id uuid;
  v_qty integer;
  v record;
  v_unit_mxn integer;
  v_unit integer;
  v_subtotal integer := 0;
  v_subtotal_mxn integer := 0;
  v_lines jsonb := '[]'::jsonb;
  v_flat integer;
  v_threshold integer;
  v_shipping integer;
  v_discount integer := 0;
  v_promo jsonb;
  v_promo_code text := null;
  v_total integer;
  v_order uuid;
  v_number text;
  v_token uuid := gen_random_uuid();
  v_wh uuid;
  v_line jsonb;
begin
  select * into st from app_settings where id = 1;
  if not coalesce(st.demo_payments_enabled, false) then
    raise exception 'Demo payments are disabled';
  end if;
  if uid is null and (v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'A valid email is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Invalid items';
  end if;
  if p_ship is not null and (jsonb_typeof(p_ship) <> 'object' or octet_length(p_ship::text) > 2000) then
    raise exception 'Invalid address';
  end if;

  -- Brakes: a buyer can place 5 demo orders an hour, the whole site 60.
  if (select count(*) from orders
       where payment_method = 'demo' and created_at > now() - interval '1 hour'
         and ((uid is not null and user_id = uid) or (v_email is not null and customer_email = v_email))) >= 5 then
    raise exception 'Too many demo orders';
  end if;
  if (select count(*) from orders where payment_method = 'demo' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many demo orders';
  end if;

  v_rate := greatest(st.usd_exchange_rate, 0.0001);

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_variant_id := (v_item->>'variant_id')::uuid;
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Invalid items';
    end;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Invalid quantity';
    end if;

    select pv.id as id, pv.size as size, pv.color as color, pv.stock_quantity as stock_quantity,
           pv.price_override_mxn_cents as override_cents, p.base_price_mxn_cents as base_cents,
           p.name as name, p.vendor_id as vendor_id
      into v
      from product_variants pv
      join products p on p.id = pv.product_id
     where pv.id = v_variant_id and p.status = 'active'
       for update of pv;
    if not found then
      raise exception 'Product not available';
    end if;
    if v.stock_quantity < v_qty then
      raise exception 'Out of stock';
    end if;

    v_unit_mxn := coalesce(v.override_cents, v.base_cents);
    v_unit := case when v_cur = 'USD' then round(v_unit_mxn / v_rate)::integer else v_unit_mxn end;
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_subtotal_mxn := v_subtotal_mxn + v_unit_mxn * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', v.id, 'qty', v_qty, 'unit', v_unit, 'vendor_id', v.vendor_id,
      'name', v.name, 'attrs', jsonb_build_object('size', v.size, 'color', v.color)
    );

    -- Take the stock right away so the same variant repeated in the cart can't oversell.
    update product_variants set stock_quantity = stock_quantity - v_qty where id = v.id;
  end loop;

  v_flat := case when v_cur = 'USD' then round(9900 / v_rate)::integer else 9900 end;
  v_threshold := case when v_cur = 'USD'
                      then round(st.free_shipping_threshold_mxn_cents / v_rate)::integer
                      else st.free_shipping_threshold_mxn_cents end;
  v_shipping := case when v_subtotal >= v_threshold then 0 else v_flat end;

  if nullif(btrim(coalesce(p_promo, '')), '') is not null then
    v_promo := public.validate_promo_code(p_promo, v_subtotal_mxn);
    if (v_promo->>'valid')::boolean then
      -- The code is valued in MXN; convert it when paying in USD.
      v_discount := (v_promo->>'discountCents')::integer;
      if v_cur = 'USD' then
        v_discount := round(v_discount / v_rate)::integer;
      end if;
      v_discount := least(v_discount, v_subtotal);
      v_promo_code := upper(btrim(p_promo));
      update promo_codes set times_used = times_used + 1 where code = v_promo_code;
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;
  v_number := 'DEMO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into orders (
    order_number, user_id, status, currency, subtotal_cents, shipping_cents, discount_cents,
    promo_code, total_cents, shipping_address_snapshot, payment_method, customer_email, demo_token
  ) values (
    v_number, uid, 'paid', v_cur, v_subtotal, v_shipping, v_discount,
    v_promo_code, v_total, p_ship, 'demo', coalesce(v_email, private.email_of(uid)), v_token
  ) returning id into v_order;

  select id into v_wh from warehouses where is_default order by created_at limit 1;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into order_items (order_id, variant_id, vendor_id, product_name_snapshot,
                             variant_attrs_snapshot, unit_price_cents, quantity)
    values (v_order, (v_line->>'variant_id')::uuid, nullif(v_line->>'vendor_id', '')::uuid,
            v_line->'name', v_line->'attrs', (v_line->>'unit')::integer, (v_line->>'qty')::integer);

    insert into inventory_movements (variant_id, warehouse_id, quantity_change, reason, created_by)
    values ((v_line->>'variant_id')::uuid, v_wh, -(v_line->>'qty')::integer, 'sale', uid);
  end loop;

  return jsonb_build_object('order_id', v_order, 'order_number', v_number, 'token', v_token);
end;
$$;

-- ---------------------------------------------------------------------------
create or replace function public.get_demo_order(p_order uuid, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'currency', o.currency,
    'subtotal_cents', o.subtotal_cents,
    'shipping_cents', o.shipping_cents,
    'discount_cents', o.discount_cents,
    'promo_code', o.promo_code,
    'total_cents', o.total_cents,
    'created_at', o.created_at,
    'shipping_address_snapshot', o.shipping_address_snapshot,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'unit_price_cents', oi.unit_price_cents,
        'product_name_snapshot', oi.product_name_snapshot
      ) order by oi.id)
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  where o.id = p_order and o.demo_token = p_token and o.payment_method = 'demo';
$$;

revoke all on function public.validate_promo_code(text, integer) from public;
revoke all on function public.best_selling_product_ids(integer) from public;
revoke all on function public.place_demo_order(jsonb, text, text, text, jsonb) from public;
revoke all on function public.get_demo_order(uuid, uuid) from public;
grant execute on function public.validate_promo_code(text, integer) to anon, authenticated;
grant execute on function public.best_selling_product_ids(integer) to anon, authenticated;
grant execute on function public.place_demo_order(jsonb, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_demo_order(uuid, uuid) to anon, authenticated;

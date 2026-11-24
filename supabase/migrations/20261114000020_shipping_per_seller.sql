-- Shipping is charged per package. Every seller (and Omnara itself, for products with no seller)
-- ships its own shipment, so each one pays the flat rate unless ITS part of the cart reaches the
-- free-shipping threshold. Before, one flat rate was charged for the whole order.
--
-- Only the shipping calculation of place_demo_order changes; the rest is as before.

create or replace function public.place_demo_order(p_items jsonb, p_currency text, p_email text, p_promo text, p_ship jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

    update product_variants set stock_quantity = stock_quantity - v_qty where id = v.id;
  end loop;

  v_flat := case when v_cur = 'USD' then round(9900 / v_rate)::integer else 9900 end;
  v_threshold := case when v_cur = 'USD'
                      then round(st.free_shipping_threshold_mxn_cents / v_rate)::integer
                      else st.free_shipping_threshold_mxn_cents end;
  -- one package per seller (products with no seller ship from Omnara): each pays the flat rate
  -- unless its own part of the cart reaches the free-shipping threshold
  select coalesce(sum(case when g.amount >= v_threshold then 0 else v_flat end), 0)::integer
    into v_shipping
    from (
      select coalesce(l->>'vendor_id', 'platform') as seller,
             sum((l->>'unit')::integer * (l->>'qty')::integer) as amount
        from jsonb_array_elements(v_lines) l
       group by 1
    ) g;

  if nullif(btrim(coalesce(p_promo, '')), '') is not null then
    v_promo := public.validate_promo_code(p_promo, v_subtotal_mxn);
    if (v_promo->>'valid')::boolean then
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
$function$;

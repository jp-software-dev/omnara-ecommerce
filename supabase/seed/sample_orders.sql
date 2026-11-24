-- Sample orders in every state of the order cycle, for demos and for looking at the admin and
-- seller screens with data. They are guest orders (muestraN@example.com), placed through the real
-- place_demo_order and moved with the real event function, so they behave like any other order.
-- Run it once against the project database (it is NOT idempotent: each run places 7 more orders
-- and uses 7 units of stock). The scheduler keeps moving the ones that are not final, so after a
-- day or two they will have advanced on their own.

do $$
declare
  v_chain text[] := array['confirmed','preparing','shipped','in_transit','arrived_state','out_for_delivery','delivered','completed'];
  v_spec jsonb := '[
    {"slug":"playera-basica-algodon","to":"confirmed"},
    {"slug":"lampara-mesa","to":"preparing"},
    {"slug":"espejo-decorativo","to":"shipped"},
    {"slug":"tenis-running","to":"out_for_delivery"},
    {"slug":"portavelas-vidrio","to":"delivered"},
    {"slug":"mouse-inalambrico","to":"completed"},
    {"slug":"bufanda-lana-gris","to":"cancelled"}
  ]';
  v_item jsonb; v_i int := 0; v_var uuid; v_res jsonb; v_order uuid; v_token uuid; v_sh uuid; v_k int; v_to text;
  v_addr jsonb := jsonb_build_object('name','Cliente de ejemplo','address',jsonb_build_object('line1','Av. Reforma 100','city','Ciudad de México','state','CDMX','postal_code','06600','country','MX'));
begin
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  for v_item in select * from jsonb_array_elements(v_spec) loop
    v_i := v_i + 1;
    v_to := v_item->>'to';
    select pv.id into v_var from public.product_variants pv join public.products p on p.id = pv.product_id
     where p.slug = v_item->>'slug' and p.status = 'active' and pv.stock_quantity > 5 limit 1;
    if v_var is null then raise exception 'no variant for %', v_item->>'slug'; end if;
    v_res := public.place_demo_order(jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 1)),
      'MXN', 'muestra' || v_i || '@example.com', '', v_addr);
    v_order := (v_res->>'order_id')::uuid; v_token := (v_res->>'token')::uuid;
    select id into v_sh from public.shipments where order_id = v_order limit 1;
    if v_to = 'cancelled' then
      perform public.cancel_shipment(v_sh, v_token);
    else
      for v_k in 2 .. array_position(v_chain, v_to) loop
        perform private.record_shipment_event(v_sh, v_chain[v_k], case when v_chain[v_k] = 'completed' then 'customer' else 'system' end);
      end loop;
      if v_to = 'completed' then
        perform public.rate_shipment(v_sh, 5, 'Llegó bien y a tiempo (ejemplo).', v_token);
      end if;
    end if;
  end loop;
end $$;

-- A promo code stops counting as used when the order it was applied to is refunded in full.
--
-- Cancelling a whole order already gives the use back (cancel_shipment). A return can also end
-- with every item of the order refunded; then the order becomes 'refunded' and the code's use
-- is given back too. A partial refund keeps the use: the customer still bought part of the order
-- with the discount.

create or replace function public.mark_return_refunded(p_id uuid, p_refund_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_order uuid;
  v_promo text;
begin
  if not private.is_admin() then
    raise exception 'Only admins can record refunds';
  end if;
  if p_refund_id is null or btrim(p_refund_id) = '' then
    raise exception 'A refund id is required';
  end if;

  update return_requests
     set status = 'refunded', stripe_refund_id = p_refund_id, updated_at = now(), resolved_at = now()
   where id = p_id and status = 'approved'
   returning order_id into v_order;
  if not found then
    raise exception 'Return not found or not approved';
  end if;

  if not exists (
    select 1 from order_items oi
     where oi.order_id = v_order
       and not exists (
         select 1 from return_requests r where r.order_item_id = oi.id and r.status = 'refunded'
       )
  ) then
    update orders set status = 'refunded'
     where id = v_order and status in ('paid', 'fulfilled', 'completed')
     returning promo_code into v_promo;
    -- only when this refund is what made the order 'refunded' (not on a repeated call)
    if found and v_promo is not null then
      update promo_codes set times_used = greatest(times_used - 1, 0) where code = v_promo;
    end if;
  end if;
end;
$$;

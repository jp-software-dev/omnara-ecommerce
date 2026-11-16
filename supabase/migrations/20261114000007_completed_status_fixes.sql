-- The new 'completed' order status (the customer confirmed the delivery) was missing from
-- two functions that only knew 'paid' and 'fulfilled':
--   * best sellers ignored orders that had been completed
--   * recording a refund could not mark a completed order as refunded, and since returns
--     now open after the delivery, most refunds happen on completed orders

create or replace function public.best_selling_product_ids(p_limit integer default 8)
returns table(product_id uuid, units bigint)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select pv.product_id, sum(oi.quantity)::bigint as units
    from order_items oi
    join orders o on o.id = oi.order_id
    join product_variants pv on pv.id = oi.variant_id
   where o.status in ('paid', 'fulfilled', 'completed')
   group by pv.product_id
   order by units desc, pv.product_id
   limit greatest(least(coalesce(p_limit, 8), 50), 1);
$$;

create or replace function public.mark_return_refunded(p_id uuid, p_refund_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_order uuid;
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
    update orders set status = 'refunded' where id = v_order and status in ('paid', 'fulfilled', 'completed');
  end if;
end;
$$;

-- Shipments for products that have no seller.
--
-- 46 of the 50 products are sold by the platform itself (products.vendor_id is null). The
-- trigger that creates shipments skipped items without a seller, so an order of such products
-- had no shipment: nothing moved it and nobody could close it. A shipment may now have no
-- seller (it is Omnara's own); there is still one per (order, seller) and one for the platform.
-- The scheduler, the customer's tracking, confirming and cancelling work exactly the same; there
-- is simply no seller to notify and nothing to pay out (the platform keeps the sale).

alter table public.shipments alter column vendor_id drop not null;

alter table public.shipments drop constraint if exists shipments_order_id_vendor_id_key;
create unique index if not exists shipments_order_seller_uidx
  on public.shipments (order_id, coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function private.attach_item_to_shipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shipments (order_id, vendor_id, ship_by)
  values (new.order_id, new.vendor_id, now() + interval '24 hours')
  on conflict (order_id, (coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set updated_at = now()
  returning id into new.shipment_id;
  return new;
end;
$$;

-- Items that never got a shipment (platform products of orders that already exist).
insert into public.shipments (order_id, vendor_id, status, tracking_number, ship_by, shipped_at, created_at)
select oi.order_id,
       oi.vendor_id,
       case when bool_and(oi.shipped_at is not null) then 'shipped' else 'confirmed' end,
       max(oi.tracking_number),
       min(o.created_at) + interval '24 hours',
       case when bool_and(oi.shipped_at is not null) then max(oi.shipped_at) end,
       min(o.created_at)
from public.order_items oi
join public.orders o on o.id = oi.order_id
where oi.shipment_id is null
  and o.status in ('paid', 'fulfilled', 'completed')
group by oi.order_id, oi.vendor_id
on conflict do nothing;

update public.order_items oi
   set shipment_id = s.id
  from public.shipments s
 where oi.shipment_id is null
   and s.order_id = oi.order_id
   and coalesce(s.vendor_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(oi.vendor_id, '00000000-0000-0000-0000-000000000000'::uuid);

-- an unshipped item must not be sent twice by the seller's old action: it only applies to sellers

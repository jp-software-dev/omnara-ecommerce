-- Shipments: one row per (order, seller). An order can hold items from several
-- businesses and each one ships its own, so tracking belongs to the shipment, not to
-- the order. Educational demo: 100% domestic (Mexico), carriers are simulated.
--
-- Status path (later phases move it forward and record an event for each step):
--   confirmed -> preparing -> shipped -> in_transit -> arrived_state
--   -> out_for_delivery -> delivered -> completed   (or cancelled)
-- 'completed' is reached only when the CUSTOMER confirms the delivery.

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  vendor_id uuid not null references public.profiles(id),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'preparing', 'shipped', 'in_transit', 'arrived_state',
                      'out_for_delivery', 'delivered', 'completed', 'cancelled')),
  carrier text check (carrier is null or char_length(carrier) <= 40),
  tracking_number text check (tracking_number is null or char_length(tracking_number) <= 80),
  -- every order ships within 24 hours of being paid
  ship_by timestamptz,
  estimated_delivery_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, vendor_id)
);

create index if not exists shipments_vendor_idx on public.shipments (vendor_id, status);
create index if not exists shipments_order_idx on public.shipments (order_id);
-- the scheduler will look for shipments that still have to move
create index if not exists shipments_open_idx on public.shipments (status)
  where status not in ('completed', 'cancelled');

alter table public.order_items
  add column if not exists shipment_id uuid references public.shipments(id);
create index if not exists order_items_shipment_idx on public.order_items (shipment_id);

alter table public.shipments enable row level security;

-- Buyer of the order, the seller of the shipment, or an admin. No write policies:
-- shipments are only created and moved by the functions and triggers below.
drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments
  for select to authenticated
  using (
    vendor_id = (select auth.uid())
    or (select private.is_admin())
    or private.order_owner_matches(order_id)
  );

-- A new item joins (or creates) the shipment of its seller in that order. Orders are
-- only created once they are paid, so a new shipment starts as 'confirmed' with a
-- 24-hour deadline to ship.
create or replace function private.attach_item_to_shipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vendor_id is null then
    return new;
  end if;
  insert into public.shipments (order_id, vendor_id, ship_by)
  values (new.order_id, new.vendor_id, now() + interval '24 hours')
  on conflict (order_id, vendor_id) do update set updated_at = now()
  returning id into new.shipment_id;
  return new;
end;
$$;

drop trigger if exists order_items_attach_shipment on public.order_items;
create trigger order_items_attach_shipment
  before insert on public.order_items
  for each row execute function private.attach_item_to_shipment();

-- Keep the shipment coherent with the existing "seller ships my items" action: when
-- every item of a shipment has shipped, the shipment is 'shipped' with its tracking.
create or replace function private.sync_shipment_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.shipment_id is null
     or new.shipped_at is null
     or (old.shipped_at is not null and old.tracking_number is not distinct from new.tracking_number) then
    return new;
  end if;
  if not exists (
    select 1 from public.order_items
    where shipment_id = new.shipment_id and shipped_at is null
  ) then
    update public.shipments
       set status = case when status in ('confirmed', 'preparing') then 'shipped' else status end,
           shipped_at = coalesce(shipped_at, new.shipped_at),
           tracking_number = coalesce(new.tracking_number, tracking_number),
           updated_at = now()
     where id = new.shipment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_sync_shipment on public.order_items;
create trigger order_items_sync_shipment
  after update of shipped_at, tracking_number on public.order_items
  for each row execute function private.sync_shipment_from_items();

-- Backfill the orders that already exist (nothing is deleted or rewritten).
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
where oi.vendor_id is not null
  and o.status in ('paid', 'fulfilled')
group by oi.order_id, oi.vendor_id
on conflict (order_id, vendor_id) do nothing;

update public.order_items oi
   set shipment_id = s.id
  from public.shipments s
 where s.order_id = oi.order_id
   and s.vendor_id = oi.vendor_id
   and oi.shipment_id is null;

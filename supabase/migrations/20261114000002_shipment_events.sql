-- Shipment events: the history of a shipment. Append-only (no UPDATE or DELETE, enforced
-- by a trigger) so the tracking timeline can be trusted. Every status change goes
-- through private.record_shipment_event, which validates the transition, writes the
-- event and updates the shipment in one step.

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id),
  status text not null
    check (status in ('confirmed', 'preparing', 'shipped', 'in_transit', 'arrived_state',
                      'out_for_delivery', 'delivered', 'completed', 'cancelled')),
  -- when it really happened (a catch-up event is stamped with its scheduled time)
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('system', 'vendor', 'customer', 'admin')),
  actor_id uuid references public.profiles(id),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_idx
  on public.shipment_events (shipment_id, occurred_at);

alter table public.shipment_events enable row level security;

-- Whoever can see the shipment (buyer, seller, admin) can see its history: the
-- sub-select is itself filtered by the shipments policy.
drop policy if exists shipment_events_select on public.shipment_events;
create policy shipment_events_select on public.shipment_events
  for select to authenticated
  using (shipment_id in (select id from public.shipments));

create or replace function private.shipment_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Shipment events cannot be changed or deleted';
end;
$$;

drop trigger if exists shipment_events_no_change on public.shipment_events;
create trigger shipment_events_no_change
  before update or delete on public.shipment_events
  for each row execute function private.shipment_events_append_only();

-- Position of each status on the path; cancelled is outside it.
create or replace function private.shipment_rank(p_status text)
returns int
language sql
immutable
as $$
  select case p_status
    when 'confirmed' then 1
    when 'preparing' then 2
    when 'shipped' then 3
    when 'in_transit' then 4
    when 'arrived_state' then 5
    when 'out_for_delivery' then 6
    when 'delivered' then 7
    when 'completed' then 8
  end;
$$;

-- The one place where a shipment changes status. Rules:
--  * only forward along the path (skipping steps is allowed: an admin can force one)
--  * 'completed' only from 'delivered' (the customer confirms the delivery)
--  * 'cancelled' only before it ships
--  * completed and cancelled are final
-- p_at lets the scheduler record a catch-up step with the time it was due.
create or replace function private.record_shipment_event(
  p_shipment uuid,
  p_status text,
  p_source text,
  p_actor uuid default null,
  p_note text default null,
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_event uuid;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then
    raise exception 'Shipment not found';
  end if;

  if s.status in ('completed', 'cancelled') then
    raise exception 'This shipment is already closed';
  end if;

  if p_status = 'cancelled' then
    if s.status not in ('confirmed', 'preparing') then
      raise exception 'A shipment can only be cancelled before it ships';
    end if;
  elsif p_status = 'completed' then
    if s.status <> 'delivered' then
      raise exception 'Only a delivered shipment can be completed';
    end if;
  elsif private.shipment_rank(p_status) is null
        or private.shipment_rank(p_status) <= private.shipment_rank(s.status) then
    raise exception 'Invalid shipment transition % -> %', s.status, p_status;
  end if;

  insert into public.shipment_events (shipment_id, status, occurred_at, source, actor_id, note)
  values (p_shipment, p_status, p_at, p_source, p_actor, p_note)
  returning id into v_event;

  update public.shipments
     set status = p_status,
         shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, p_at) else shipped_at end,
         delivered_at = case when p_status = 'delivered' then p_at else delivered_at end,
         completed_at = case when p_status = 'completed' then p_at else completed_at end,
         updated_at = now()
   where id = p_shipment;

  return v_event;
end;
$$;

revoke all on function private.record_shipment_event(uuid, text, text, uuid, text, timestamptz) from public, anon, authenticated;

-- A new shipment starts with its 'confirmed' event.
create or replace function private.shipment_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shipment_events (shipment_id, status, occurred_at, source)
  values (new.id, 'confirmed', new.created_at, 'system');
  return new;
end;
$$;

drop trigger if exists shipments_created_event on public.shipments;
create trigger shipments_created_event
  after insert on public.shipments
  for each row execute function private.shipment_created_event();

-- The existing "seller ships my items" action now records a real event too.
create or replace function private.sync_shipment_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
begin
  if new.shipment_id is null
     or new.shipped_at is null
     or (old.shipped_at is not null and old.tracking_number is not distinct from new.tracking_number) then
    return new;
  end if;
  if exists (select 1 from public.order_items where shipment_id = new.shipment_id and shipped_at is null) then
    return new;
  end if;

  select * into s from public.shipments where id = new.shipment_id for update;
  if s.status in ('confirmed', 'preparing') then
    update public.shipments
       set tracking_number = coalesce(new.tracking_number, tracking_number)
     where id = s.id;
    perform private.record_shipment_event(s.id, 'shipped', 'vendor', auth.uid(), null, new.shipped_at);
  elsif new.tracking_number is not null then
    update public.shipments
       set tracking_number = new.tracking_number, updated_at = now()
     where id = s.id;
  end if;
  return new;
end;
$$;

-- Backfill: every existing shipment gets its history.
insert into public.shipment_events (shipment_id, status, occurred_at, source)
select s.id, 'confirmed', s.created_at, 'system'
from public.shipments s
where not exists (select 1 from public.shipment_events e where e.shipment_id = s.id and e.status = 'confirmed');

insert into public.shipment_events (shipment_id, status, occurred_at, source)
select s.id, 'shipped', s.shipped_at, 'vendor'
from public.shipments s
where s.shipped_at is not null
  and not exists (select 1 from public.shipment_events e where e.shipment_id = s.id and e.status = 'shipped');

-- In-site notifications (the bell in the header) with per-user preferences.
--
-- * A buyer with an account is notified at every shipment milestone (preparing, shipped,
--   arrived in the state, out for delivery, delivered).
-- * A seller is notified when a new shipment (a new sale) is created for them.
-- * Each person can switch each kind off. Guests have no account, so they only get the email.
-- * Notifications are created by a trigger on shipment_events; nothing can insert them from the
--   client, and a notification problem never blocks a shipment from moving.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shipment_updates boolean not null default true,
  sales boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;

create policy notification_preferences_select on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notification_preferences_update on public.notification_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('shipment_update', 'new_sale')),
  title jsonb not null,
  body jsonb not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_recent_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
-- no insert/update/delete policies: they are created by the trigger and marked read by a function

-- ------------------------------------------------------------------ creating them
create or replace function private.notify(p_user uuid, p_kind text, p_title jsonb, p_body jsonb, p_link text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is null then return; end if;
  if p_kind = 'shipment_update'
     and not coalesce((select shipment_updates from notification_preferences where user_id = p_user), true) then
    return;
  end if;
  if p_kind = 'new_sale'
     and not coalesce((select sales from notification_preferences where user_id = p_user), true) then
    return;
  end if;
  insert into notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
end;
$$;
revoke all on function private.notify(uuid, text, jsonb, jsonb, text) from public, anon, authenticated;

create or replace function private.trg_notify_shipment_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.shipments%rowtype;
  o public.orders%rowtype;
  v_es text;
  v_en text;
begin
  begin
    if new.status not in ('confirmed', 'preparing', 'shipped', 'arrived_state', 'out_for_delivery', 'delivered') then
      return new;
    end if;
    select * into s from public.shipments where id = new.shipment_id;
    select * into o from public.orders where id = s.order_id;

    if new.status = 'confirmed' then
      -- a new sale for the seller (products sold by the platform have no seller)
      perform private.notify(
        s.vendor_id, 'new_sale',
        jsonb_build_object('es', 'Nueva venta', 'en', 'New sale'),
        jsonb_build_object('es', 'Pedido ' || o.order_number || ': envíalo en menos de 24 horas.',
                           'en', 'Order ' || o.order_number || ': ship it within 24 hours.'),
        '/admin/pedidos');
      return new;
    end if;

    -- the buyer only has notifications when they have an account
    if o.user_id is null then return new; end if;
    v_es := case new.status
      when 'preparing' then 'Se está preparando tu pedido'
      when 'shipped' then 'Tu pedido fue enviado'
      when 'arrived_state' then 'Tu pedido llegó a tu estado'
      when 'out_for_delivery' then 'Tu pedido va en reparto'
      else 'Tu pedido fue entregado' end;
    v_en := case new.status
      when 'preparing' then 'We are preparing your order'
      when 'shipped' then 'Your order shipped'
      when 'arrived_state' then 'Your order arrived in your state'
      when 'out_for_delivery' then 'Your order is out for delivery'
      else 'Your order was delivered' end;
    perform private.notify(
      o.user_id, 'shipment_update',
      jsonb_build_object('es', v_es, 'en', v_en),
      jsonb_build_object('es', 'Pedido ' || o.order_number
                               || case when new.status = 'delivered' then ': confirma que lo recibiste.' else '.' end,
                         'en', 'Order ' || o.order_number
                               || case when new.status = 'delivered' then ': confirm that you received it.' else '.' end),
      '/cuenta/pedidos/' || o.id);
  exception when others then
    null;   -- a notification problem must never block a shipment from moving
  end;
  return new;
end;
$$;

drop trigger if exists shipment_events_notify on public.shipment_events;
create trigger shipment_events_notify
  after insert on public.shipment_events
  for each row execute function private.trg_notify_shipment_event();

-- ------------------------------------------------------------------ reading them
create or replace function public.my_notifications(p_limit integer default 20)
returns table (id uuid, kind text, title jsonb, body jsonb, link text, read_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.kind, n.title, n.body, n.link, n.read_at, n.created_at
    from public.notifications n
   where n.user_id = auth.uid()
   order by n.created_at desc
   limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

create or replace function public.my_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.notifications where user_id = auth.uid() and read_at is null;
$$;

-- p_ids = null marks all of the caller's notifications as read
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  update public.notifications
     set read_at = now()
   where user_id = uid and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.my_notifications(integer) from public, anon;
revoke all on function public.my_unread_notification_count() from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.my_notifications(integer) to authenticated;
grant execute on function public.my_unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

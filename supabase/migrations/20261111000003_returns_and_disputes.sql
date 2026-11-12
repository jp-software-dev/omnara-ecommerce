-- Returns, refunds and disputes. One request per order item. All writes go through
-- SECURITY DEFINER functions that check who is calling; there are no INSERT/UPDATE
-- policies on these tables.
--
-- Flow:  requested -> approved (seller) -> refunded (admin, after Stripe)
--        requested -> rejected (seller) -> escalated (buyer) -> approved | closed (admin)
--        items of admin-owned products start as escalated (no seller to decide).

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'escalated', 'closed', 'refunded')),
  -- In the order's currency (cents), proportional share of any promo discount, shipping excluded.
  refund_amount_cents integer not null check (refund_amount_cents > 0),
  currency text not null check (currency in ('MXN', 'USD')),
  stripe_refund_id text,
  decision_note text check (char_length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index return_requests_user_idx on public.return_requests (user_id);
create index return_requests_vendor_idx on public.return_requests (vendor_id);
create index return_requests_status_idx on public.return_requests (status);

create table public.return_messages (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Stored here because profiles can't be read across users (RLS).
  author_role text not null check (author_role in ('buyer', 'vendor', 'admin')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index return_messages_return_idx on public.return_messages (return_id, created_at);

alter table public.return_requests enable row level security;
alter table public.return_messages enable row level security;

create policy return_requests_select on public.return_requests
  for select to authenticated
  using (user_id = auth.uid() or vendor_id = auth.uid() or private.is_admin());

-- Messages are visible to whoever can see the request (RLS applies in the subquery).
create policy return_messages_select on public.return_messages
  for select to authenticated
  using (exists (select 1 from public.return_requests r where r.id = return_messages.return_id));

-- Buyer opens a request for one shipped item, within 30 days of shipping.
create or replace function public.request_return(p_order_item_id uuid, p_reason text, p_details text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  it record;
  v_line numeric;
  v_refund integer;
  v_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select oi.id, oi.order_id, oi.vendor_id, oi.unit_price_cents, oi.quantity, oi.shipped_at,
         o.user_id, o.status, o.currency, o.subtotal_cents, o.discount_cents
    into it
    from order_items oi
    join orders o on o.id = oi.order_id
   where oi.id = p_order_item_id;

  if not found or it.user_id is distinct from uid then
    raise exception 'Order item not found';
  end if;
  if it.status not in ('paid', 'fulfilled') then
    raise exception 'Order is not eligible for returns';
  end if;
  if it.shipped_at is null then
    raise exception 'Item has not shipped yet';
  end if;
  if now() > it.shipped_at + interval '30 days' then
    raise exception 'Return window has closed';
  end if;
  if exists (select 1 from return_requests where order_item_id = p_order_item_id) then
    raise exception 'A return was already requested for this item';
  end if;

  v_line := it.unit_price_cents::numeric * it.quantity;
  if it.subtotal_cents > 0 then
    v_refund := round(v_line * greatest(it.subtotal_cents - it.discount_cents, 0) / it.subtotal_cents);
  else
    v_refund := v_line;
  end if;
  v_refund := greatest(v_refund, 1);

  insert into return_requests (order_item_id, order_id, user_id, vendor_id, reason, details,
                               status, refund_amount_cents, currency)
  values (p_order_item_id, it.order_id, uid, it.vendor_id, p_reason,
          nullif(left(btrim(coalesce(p_details, '')), 1000), ''),
          case when it.vendor_id is null then 'escalated' else 'requested' end,
          v_refund, it.currency)
  returning id into v_id;

  return v_id;
end;
$$;

-- The item's seller approves or rejects a new request.
create or replace function public.decide_return(p_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update return_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
         updated_at = now()
   where id = p_id and vendor_id = auth.uid() and status = 'requested';
  if not found then
    raise exception 'Return not found or not awaiting your decision';
  end if;
end;
$$;

-- The buyer disagrees with a seller's rejection: it goes to the admin.
create or replace function public.escalate_return(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
begin
  update return_requests
     set status = 'escalated', updated_at = now()
   where id = p_id and user_id = uid and status = 'rejected';
  if not found then
    raise exception 'Return not found or cannot be escalated';
  end if;
  if v_note is not null then
    insert into return_messages (return_id, author_id, author_role, body)
    values (p_id, uid, 'buyer', v_note);
  end if;
end;
$$;

-- Admin settles an escalated (or stuck) request.
create or replace function public.admin_resolve_return(p_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can resolve returns';
  end if;
  update return_requests
     set status = case when p_approve then 'approved' else 'closed' end,
         decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
         updated_at = now(),
         resolved_at = case when p_approve then null else now() end
   where id = p_id and status in ('requested', 'rejected', 'escalated');
  if not found then
    raise exception 'Return not found or already settled';
  end if;
end;
$$;

-- Admin records that Stripe accepted the refund. If every item of the order has
-- now been refunded, the order itself becomes refunded.
create or replace function public.mark_return_refunded(p_id uuid, p_refund_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
    update orders set status = 'refunded' where id = v_order and status in ('paid', 'fulfilled');
  end if;
end;
$$;

-- Buyer, seller and admin talk in the request thread until it is settled.
create or replace function public.add_return_message(p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  r return_requests%rowtype;
  v_role text;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_body) not between 1 and 1000 then
    raise exception 'Message must be between 1 and 1000 characters';
  end if;

  select * into r from return_requests where id = p_id;
  if not found then
    raise exception 'Return not found';
  end if;
  if r.status in ('refunded', 'closed') then
    raise exception 'This return is already settled';
  end if;

  if private.is_admin() then
    v_role := 'admin';
  elsif r.user_id = uid then
    v_role := 'buyer';
  elsif r.vendor_id = uid then
    v_role := 'vendor';
  else
    raise exception 'Return not found';
  end if;

  insert into return_messages (return_id, author_id, author_role, body)
  values (p_id, uid, v_role, v_body);
end;
$$;

revoke all on function public.request_return(uuid, text, text) from public, anon;
revoke all on function public.decide_return(uuid, boolean, text) from public, anon;
revoke all on function public.escalate_return(uuid, text) from public, anon;
revoke all on function public.admin_resolve_return(uuid, boolean, text) from public, anon;
revoke all on function public.mark_return_refunded(uuid, text) from public, anon;
revoke all on function public.add_return_message(uuid, text) from public, anon;
grant execute on function public.request_return(uuid, text, text) to authenticated;
grant execute on function public.decide_return(uuid, boolean, text) to authenticated;
grant execute on function public.escalate_return(uuid, text) to authenticated;
grant execute on function public.admin_resolve_return(uuid, boolean, text) to authenticated;
grant execute on function public.mark_return_refunded(uuid, text) to authenticated;
grant execute on function public.add_return_message(uuid, text) to authenticated;

-- Email notifications. Database triggers queue a row in email_outbox when
-- something worth telling a person happens; the app sends the queue.
--
-- Every trigger body is wrapped so a failure while queueing an email can NEVER
-- roll back the payment, shipment, return or decision that caused it.

alter table public.orders add column customer_email text;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  locale text not null default 'es' check (locale in ('es', 'en')),
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_queue_idx on public.email_outbox (status, created_at);

-- Only admins can look at the queue; sending uses the service role (bypasses RLS).
alter table public.email_outbox enable row level security;
create policy email_outbox_admin_select on public.email_outbox
  for select to authenticated
  using (private.is_admin());

create or replace function private.email_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select email from auth.users where id = p_user;
$$;

create or replace function private.locale_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when (select preferred_locale from profiles where id = p_user) = 'en' then 'en' else 'es' end;
$$;

create or replace function private.enqueue_email(p_to text, p_locale text, p_template text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_to is null or btrim(p_to) = '' then
    return;
  end if;
  insert into email_outbox (to_email, locale, template, payload)
  values (btrim(p_to), case when p_locale = 'en' then 'en' else 'es' end, p_template, coalesce(p_payload, '{}'::jsonb));
end;
$$;

-- Buyer: order confirmation.
create or replace function private.trg_email_order_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform private.enqueue_email(
      coalesce(new.customer_email, private.email_of(new.user_id)),
      private.locale_of(new.user_id),
      'order_confirmation',
      jsonb_build_object('order_number', new.order_number, 'total_cents', new.total_cents, 'currency', new.currency)
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- Seller: someone bought from them (one email per order, however many items).
create or replace function private.trg_email_new_sale()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_number text;
begin
  begin
    if new.vendor_id is not null then
      v_email := private.email_of(new.vendor_id);
      if v_email is not null and not exists (
        select 1 from email_outbox
         where template = 'new_sale' and to_email = v_email and payload->>'order_id' = new.order_id::text
      ) then
        select order_number into v_number from orders where id = new.order_id;
        perform private.enqueue_email(
          v_email, private.locale_of(new.vendor_id), 'new_sale',
          jsonb_build_object('order_id', new.order_id, 'order_number', v_number, 'item_name', new.product_name_snapshot)
        );
      end if;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- Buyer: an item of their order shipped.
create or replace function private.trg_email_item_shipped()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o orders%rowtype;
begin
  begin
    if old.shipped_at is null and new.shipped_at is not null then
      select * into o from orders where id = new.order_id;
      perform private.enqueue_email(
        coalesce(o.customer_email, private.email_of(o.user_id)),
        private.locale_of(o.user_id),
        'item_shipped',
        jsonb_build_object('order_number', o.order_number, 'item_name', new.product_name_snapshot, 'tracking_number', new.tracking_number)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create or replace function private.notify_admins(p_template text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a record;
begin
  for a in select id from profiles where role = 'admin' loop
    perform private.enqueue_email(private.email_of(a.id), private.locale_of(a.id), p_template, p_payload);
  end loop;
end;
$$;

-- A new return: tell the seller (or the admins when there is no seller to decide).
create or replace function private.trg_email_return_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_number text;
  v_item jsonb;
  v_payload jsonb;
begin
  begin
    select order_number into v_number from orders where id = new.order_id;
    select product_name_snapshot into v_item from order_items where id = new.order_item_id;
    v_payload := jsonb_build_object('order_number', v_number, 'item_name', v_item, 'return_id', new.id);
    if new.vendor_id is not null then
      perform private.enqueue_email(private.email_of(new.vendor_id), private.locale_of(new.vendor_id), 'return_requested', v_payload);
    elsif new.status = 'escalated' then
      perform private.notify_admins('return_escalated', v_payload);
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- A return changed state: tell the buyer the outcome, the admins about disputes.
create or replace function private.trg_email_return_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o orders%rowtype;
  v_item jsonb;
  v_payload jsonb;
begin
  begin
    if new.status is distinct from old.status then
      select * into o from orders where id = new.order_id;
      select product_name_snapshot into v_item from order_items where id = new.order_item_id;
      v_payload := jsonb_build_object(
        'order_number', o.order_number, 'item_name', v_item, 'return_id', new.id,
        'status', new.status, 'refund_amount_cents', new.refund_amount_cents,
        'currency', new.currency, 'note', new.decision_note
      );
      if new.status in ('approved', 'rejected', 'closed', 'refunded') then
        perform private.enqueue_email(
          coalesce(o.customer_email, private.email_of(new.user_id)),
          private.locale_of(new.user_id), 'return_status', v_payload
        );
      elsif new.status = 'escalated' then
        perform private.notify_admins('return_escalated', v_payload);
      end if;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- Applicant: their seller application was decided.
create or replace function private.trg_email_application_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
      perform private.enqueue_email(
        private.email_of(new.user_id), private.locale_of(new.user_id), 'application_decision',
        jsonb_build_object('status', new.status, 'business_name', new.business_name, 'reason', new.rejection_reason)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger email_order_created after insert on public.orders
  for each row execute function private.trg_email_order_created();
create trigger email_new_sale after insert on public.order_items
  for each row execute function private.trg_email_new_sale();
create trigger email_item_shipped after update of shipped_at on public.order_items
  for each row execute function private.trg_email_item_shipped();
create trigger email_return_created after insert on public.return_requests
  for each row execute function private.trg_email_return_created();
create trigger email_return_status after update of status on public.return_requests
  for each row execute function private.trg_email_return_status();
create trigger email_application_decision after update of status on public.seller_applications
  for each row execute function private.trg_email_application_decision();

-- Internal helpers: nobody calls these through the API.
revoke all on function private.email_of(uuid) from public, anon, authenticated;
revoke all on function private.locale_of(uuid) from public, anon, authenticated;
revoke all on function private.enqueue_email(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.notify_admins(text, jsonb) from public, anon, authenticated;
revoke all on function private.trg_email_order_created() from public, anon, authenticated;
revoke all on function private.trg_email_new_sale() from public, anon, authenticated;
revoke all on function private.trg_email_item_shipped() from public, anon, authenticated;
revoke all on function private.trg_email_return_created() from public, anon, authenticated;
revoke all on function private.trg_email_return_status() from public, anon, authenticated;
revoke all on function private.trg_email_application_decision() from public, anon, authenticated;

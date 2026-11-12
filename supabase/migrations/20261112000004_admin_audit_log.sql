-- Audit trail of what admins change. Done with triggers so it covers every code
-- path (admin screens, RPCs, direct API calls) and can't be skipped by the app.
--
-- * Only changes made by an admin are recorded (auth.uid() is an admin).
-- * UPDATEs store just the columns that changed ({column: {from, to}}), never the
--   whole row, so personal data that did not change (e.g. an order's shipping
--   address) is not copied here.
-- * The table is append-only: admins can read it, nobody can edit or delete rows.
-- * A failure while logging raises a WARNING instead of blocking the admin action.

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_record_idx on public.admin_audit_log (table_name, record_id);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_admin_select on public.admin_audit_log
  for select to authenticated
  using (private.is_admin());
-- No INSERT/UPDATE/DELETE policies on purpose: rows are only written by the trigger below.

create or replace function private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_changes jsonb;
  v_id text;
begin
  begin
    if not private.is_admin() then
      return coalesce(new, old);
    end if;

    if tg_op = 'UPDATE' then
      select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
        into v_changes
        from jsonb_each(to_jsonb(old)) o
        join jsonb_each(to_jsonb(new)) n on n.key = o.key
       where o.value is distinct from n.value and n.key <> 'updated_at';
      if v_changes = '{}'::jsonb then
        return new;
      end if;
    elsif tg_op = 'INSERT' then
      v_changes := to_jsonb(new);
    else
      v_changes := to_jsonb(old);
    end if;

    v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', '');
    insert into admin_audit_log (actor_id, table_name, record_id, action, changes)
    values (auth.uid(), tg_table_name, v_id, tg_op, v_changes);
  exception when others then
    raise warning 'audit log failed: %', sqlerrm;
  end;
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_admin_change() from public, anon, authenticated;

-- Catalogue and configuration: every change.
create trigger audit_products after insert or update or delete on public.products
  for each row execute function private.audit_admin_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function private.audit_admin_change();
create trigger audit_businesses after insert or update or delete on public.businesses
  for each row execute function private.audit_admin_change();
create trigger audit_promo_codes after insert or update or delete on public.promo_codes
  for each row execute function private.audit_admin_change();
create trigger audit_app_settings after update on public.app_settings
  for each row execute function private.audit_admin_change();

-- People and money: only the sensitive transitions, and only the columns that changed.
create trigger audit_profiles_role after update of role on public.profiles
  for each row execute function private.audit_admin_change();
create trigger audit_orders after update on public.orders
  for each row execute function private.audit_admin_change();
create trigger audit_reviews_moderation after update of is_hidden on public.reviews
  for each row execute function private.audit_admin_change();
create trigger audit_questions_moderation after update of is_hidden on public.product_questions
  for each row execute function private.audit_admin_change();
create trigger audit_applications after update of status on public.seller_applications
  for each row execute function private.audit_admin_change();
create trigger audit_returns after update of status on public.return_requests
  for each row execute function private.audit_admin_change();

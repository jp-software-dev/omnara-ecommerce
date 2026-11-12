-- Exported unchanged from the Supabase migration history of this project
-- (version 20260807192652, name fix_orders_order_items_rls_recursion). It is already applied to the live database.

create or replace function private.is_order_item_vendor(order_id_input uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from order_items
    where order_id = order_id_input and vendor_id = auth.uid()
  );
$$;

create or replace function private.order_owner_matches(order_id_input uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from orders
    where id = order_id_input and user_id = auth.uid()
  );
$$;

grant execute on function private.is_order_item_vendor(uuid) to anon, authenticated;
grant execute on function private.order_owner_matches(uuid) to anon, authenticated;

drop policy if exists orders_select_own_vendor_admin on orders;
create policy orders_select_own_vendor_admin on orders
  for select
  using (
    user_id = auth.uid()
    or private.is_admin()
    or private.is_order_item_vendor(id)
  );

drop policy if exists order_items_select_related on order_items;
create policy order_items_select_related on order_items
  for select
  using (
    vendor_id = auth.uid()
    or private.is_admin()
    or private.order_owner_matches(order_id)
  );

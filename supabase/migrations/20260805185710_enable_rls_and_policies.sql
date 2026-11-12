-- Exported unchanged from the Supabase migration history of this project
-- (version 20260805185710, name enable_rls_and_policies). It is already applied to the live database.

-- =========================================================
-- Role helper functions (security definer avoids RLS recursion)
-- =========================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_vendor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'vendor');
$$;

create or replace function public.is_admin_or_vendor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','vendor'));
$$;

-- =========================================================
-- Enable RLS everywhere
-- =========================================================
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.promo_codes enable row level security;
alter table public.wishlists enable row level security;
alter table public.app_settings enable row level security;

-- =========================================================
-- profiles
-- =========================================================
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- =========================================================
-- addresses (own only, admin full)
-- =========================================================
create policy "addresses_all_own_or_admin" on public.addresses for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- =========================================================
-- categories (public read, admin write)
-- =========================================================
create policy "categories_public_read" on public.categories for select
  using (true);
create policy "categories_admin_write" on public.categories for insert
  with check (public.is_admin());
create policy "categories_admin_update" on public.categories for update
  using (public.is_admin());
create policy "categories_admin_delete" on public.categories for delete
  using (public.is_admin());

-- =========================================================
-- warehouses (admin + vendor read, admin write)
-- =========================================================
create policy "warehouses_read" on public.warehouses for select
  using (public.is_admin_or_vendor());
create policy "warehouses_admin_write" on public.warehouses for insert
  with check (public.is_admin());
create policy "warehouses_admin_update" on public.warehouses for update
  using (public.is_admin());
create policy "warehouses_admin_delete" on public.warehouses for delete
  using (public.is_admin());

-- =========================================================
-- products (public read active, vendor manages own, admin all)
-- =========================================================
create policy "products_public_read_active" on public.products for select
  using (status = 'active' or vendor_id = auth.uid() or public.is_admin());
create policy "products_insert_own_or_admin" on public.products for insert
  with check (vendor_id = auth.uid() or public.is_admin());
create policy "products_update_own_or_admin" on public.products for update
  using (vendor_id = auth.uid() or public.is_admin());
create policy "products_delete_own_or_admin" on public.products for delete
  using (vendor_id = auth.uid() or public.is_admin());

-- =========================================================
-- product_variants (public read if parent product active, owner/admin manage)
-- =========================================================
create policy "variants_public_read" on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.status = 'active' or p.vendor_id = auth.uid() or public.is_admin())
    )
  );
create policy "variants_write_owner_or_admin" on public.product_variants for insert
  with check (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );
create policy "variants_update_owner_or_admin" on public.product_variants for update
  using (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );
create policy "variants_delete_owner_or_admin" on public.product_variants for delete
  using (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );

-- =========================================================
-- product_images (mirrors variants policy via product)
-- =========================================================
create policy "images_public_read" on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.status = 'active' or p.vendor_id = auth.uid() or public.is_admin())
    )
  );
create policy "images_write_owner_or_admin" on public.product_images for insert
  with check (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );
create policy "images_update_owner_or_admin" on public.product_images for update
  using (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );
create policy "images_delete_owner_or_admin" on public.product_images for delete
  using (
    exists (select 1 from public.products p where p.id = product_id and (p.vendor_id = auth.uid() or public.is_admin()))
  );

-- =========================================================
-- inventory_movements (owner vendor + admin only, internal audit log)
-- =========================================================
create policy "inventory_read_owner_or_admin" on public.inventory_movements for select
  using (
    exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = inventory_movements.variant_id
        and (p.vendor_id = auth.uid() or public.is_admin())
    )
  );
create policy "inventory_insert_owner_or_admin" on public.inventory_movements for insert
  with check (
    exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = variant_id
        and (p.vendor_id = auth.uid() or public.is_admin())
    )
  );

-- =========================================================
-- carts / cart_items (authenticated owner only; guest carts handled server-side with service role)
-- =========================================================
create policy "carts_owner_all" on public.carts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cart_items_owner_all" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- =========================================================
-- orders / order_items (own orders; vendor sees own line items; admin all; writes via service role only)
-- =========================================================
create policy "orders_select_own_vendor_admin" on public.orders for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.vendor_id = auth.uid())
  );
create policy "orders_admin_update" on public.orders for update
  using (public.is_admin());

create policy "order_items_select_related" on public.order_items for select
  using (
    vendor_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- =========================================================
-- reviews (public read, own write)
-- =========================================================
create policy "reviews_public_read" on public.reviews for select
  using (true);
create policy "reviews_insert_own" on public.reviews for insert
  with check (user_id = auth.uid());
create policy "reviews_update_own_or_admin" on public.reviews for update
  using (user_id = auth.uid() or public.is_admin());
create policy "reviews_delete_own_or_admin" on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());

-- =========================================================
-- promo_codes (admin only; validation happens via a security-definer RPC, added later)
-- =========================================================
create policy "promo_codes_admin_all" on public.promo_codes for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- wishlists (own only)
-- =========================================================
create policy "wishlists_owner_all" on public.wishlists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================
-- app_settings (public read, admin write)
-- =========================================================
create policy "app_settings_public_read" on public.app_settings for select
  using (true);
create policy "app_settings_admin_update" on public.app_settings for update
  using (public.is_admin());

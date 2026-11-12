-- Exported unchanged from the Supabase migration history of this project
-- (version 20260805185604, name create_core_schema). It is already applied to the live database.

-- =========================================================
-- Omnara e-commerce: initial schema
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- profiles (extends auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('admin','vendor','customer')),
  preferred_locale text not null default 'es' check (preferred_locale in ('es','en')),
  preferred_currency text not null default 'MXN' check (preferred_currency in ('MXN','USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- addresses ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'MX',
  type text not null default 'shipping' check (type in ('shipping','billing')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses(user_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name jsonb not null default '{}'::jsonb,        -- {"es": "...", "en": "..."}
  description jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index categories_parent_id_idx on public.categories(parent_id);

-- ---------- warehouses ----------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name jsonb not null default '{}'::jsonb,
  description_short jsonb not null default '{}'::jsonb,
  description_long jsonb not null default '{}'::jsonb,
  base_price_mxn_cents integer not null check (base_price_mxn_cents >= 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_vendor_id_idx on public.products(vendor_id);
create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);

-- ---------- product_variants ----------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  price_override_mxn_cents integer check (price_override_mxn_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_id_idx on public.product_variants(product_id);

-- ---------- product_images ----------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0
);
create index product_images_product_id_idx on public.product_images(product_id);

-- ---------- inventory_movements ----------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  quantity_change integer not null,
  reason text not null check (reason in ('restock','sale','adjustment','return')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_id_idx on public.inventory_movements(variant_id);

-- ---------- carts ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  currency text not null default 'MXN' check (currency in ('MXN','USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_check check (user_id is not null or session_id is not null)
);
create index carts_user_id_idx on public.carts(user_id);
create index carts_session_id_idx on public.carts(session_id);

-- ---------- cart_items ----------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index cart_items_cart_id_idx on public.cart_items(cart_id);

-- ---------- orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  currency text not null default 'MXN' check (currency in ('MXN','USD')),
  subtotal_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents integer not null default 0,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  billing_address_id uuid references public.addresses(id) on delete set null,
  payment_method text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);

-- ---------- order_items ----------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  vendor_id uuid references public.profiles(id) on delete set null,
  product_name_snapshot jsonb not null,
  variant_attrs_snapshot jsonb not null default '{}'::jsonb,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0)
);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_vendor_id_idx on public.order_items(vendor_id);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_id_idx on public.reviews(product_id);

-- ---------- promo_codes ----------
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_order_cents integer not null default 0,
  expires_at timestamptz,
  usage_limit integer,
  times_used integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- wishlists ----------
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- app_settings (single row) ----------
create table public.app_settings (
  id integer primary key default 1,
  usd_exchange_rate numeric not null default 18.0,
  free_shipping_threshold_mxn_cents integer not null default 150000,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1);

-- ---------- default warehouse ----------
insert into public.warehouses (name, is_default) values ('Almacén principal', true);

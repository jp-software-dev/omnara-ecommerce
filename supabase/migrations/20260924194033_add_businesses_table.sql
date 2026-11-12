-- Exported unchanged from the Supabase migration history of this project
-- (version 20260924194033, name add_businesses_table). It is already applied to the live database.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  banner_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "businesses_public_read" on public.businesses
  for select using (true);

create policy "businesses_admin_insert" on public.businesses
  for insert with check (private.is_admin());

create policy "businesses_owner_or_admin_update" on public.businesses
  for update using (owner_id = auth.uid() or private.is_admin());

create policy "businesses_admin_delete" on public.businesses
  for delete using (private.is_admin());

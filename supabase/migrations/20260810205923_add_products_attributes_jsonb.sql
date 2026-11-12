-- Exported unchanged from the Supabase migration history of this project
-- (version 20260810205923, name add_products_attributes_jsonb). It is already applied to the live database.

alter table public.products add column attributes jsonb not null default '{}'::jsonb;

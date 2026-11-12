-- Exported unchanged from the Supabase migration history of this project
-- (version 20260831231512, name add_order_fulfillment_fields). It is already applied to the live database.

alter table public.orders
  add column shipping_address_snapshot jsonb,
  add column tracking_number text,
  add column discount_cents integer not null default 0,
  add column promo_code text;

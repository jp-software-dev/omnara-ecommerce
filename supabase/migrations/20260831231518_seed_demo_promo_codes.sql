-- Exported unchanged from the Supabase migration history of this project
-- (version 20260831231518, name seed_demo_promo_codes). It is already applied to the live database.

insert into public.promo_codes (code, discount_type, discount_value, min_order_cents, usage_limit)
values
  ('BIENVENIDO10', 'percentage', 10, 0, null),
  ('PRIMERACOMPRA', 'fixed', 10000, 50000, 200);

-- Exported unchanged from the Supabase migration history of this project
-- (version 20260807191044, name add_unique_stripe_payment_intent_id). It is already applied to the live database.

create unique index orders_stripe_payment_intent_id_key on public.orders (stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- Exported unchanged from the Supabase migration history of this project
-- (version 20260806145601, name create_product_images_bucket). It is already applied to the live database.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- public read
create policy "product_images_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

-- temporary: allow anon inserts only to seed the demo catalog, tightened afterwards
create policy "product_images_temp_seed_insert"
on storage.objects for insert
with check (bucket_id = 'product-images');

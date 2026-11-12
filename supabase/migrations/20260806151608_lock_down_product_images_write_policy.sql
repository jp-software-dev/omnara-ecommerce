-- Exported unchanged from the Supabase migration history of this project
-- (version 20260806151608, name lock_down_product_images_write_policy). It is already applied to the live database.

drop policy "product_images_temp_seed_insert" on storage.objects;

create policy "product_images_admin_write"
on storage.objects for insert
with check (bucket_id = 'product-images' and private.is_admin());

create policy "product_images_admin_update"
on storage.objects for update
using (bucket_id = 'product-images' and private.is_admin());

create policy "product_images_admin_delete"
on storage.objects for delete
using (bucket_id = 'product-images' and private.is_admin());

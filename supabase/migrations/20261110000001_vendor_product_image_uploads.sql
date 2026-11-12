-- Applied to the live project as migration "vendor_product_image_uploads".
-- Vendors may upload/replace/delete only inside their own folder (<auth.uid()>/...) of product-images.
create policy product_images_vendor_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and private.is_vendor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy product_images_vendor_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and private.is_vendor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy product_images_vendor_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and private.is_vendor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The bucket had no limits: cap size and restrict to image types.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
where id = 'product-images';

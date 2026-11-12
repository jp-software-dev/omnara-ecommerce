-- A product's seller is the owner of a business. Linking products.vendor_id to
-- businesses.owner_id (unique) lets the API embed the business in any product
-- list in one query, e.g. products?select=name,businesses(name,slug).
--
-- Consequences: a vendor who has no business yet can't create products (the
-- admin creates the business first, which already promotes the user), and a
-- business that still has products can't be deleted.
-- Checked before applying: every existing product has either no vendor or a
-- vendor with a business.
alter table public.products
  add constraint products_vendor_business_fkey
  foreign key (vendor_id) references public.businesses (owner_id);

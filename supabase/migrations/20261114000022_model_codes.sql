-- Model codes for the catalog. The "same item" comparison matches products of different
-- businesses by their `modelo` attribute; only 6 products had one. Every other active product
-- gets an internal catalog code (OMN-<letters of the slug>-<number>), clearly not a
-- manufacturer's code, because no product of this educational demo is real.
-- Idempotent: products that already have a `modelo` are left alone.

with numbered as (
  select id, slug, row_number() over (order by slug) rn
    from public.products
   where status = 'active' and not (attributes ? 'modelo')
)
update public.products p
   set attributes = coalesce(p.attributes, '{}'::jsonb) || jsonb_build_object(
         'modelo', 'OMN-' || upper(left(regexp_replace(n.slug, '[^a-z]', '', 'g'), 3)) || '-' || lpad(n.rn::text, 3, '0'))
  from numbered n
 where p.id = n.id;

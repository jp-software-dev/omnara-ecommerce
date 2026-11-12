-- Seller rating = average of the visible reviews of the business's products.
-- security_invoker makes the view run with the CALLER's permissions, so row
-- level security still applies: hidden reviews and products of other states are
-- left out exactly as they are everywhere else.
create or replace view public.business_ratings
with (security_invoker = true) as
select
  b.id as business_id,
  count(r.id)::int as review_count,
  round(avg(r.rating)::numeric, 2) as avg_rating
from public.businesses b
join public.products p on p.vendor_id = b.owner_id
join public.reviews r on r.product_id = p.id
where r.is_hidden = false
group by b.id;

grant select on public.business_ratings to anon, authenticated;

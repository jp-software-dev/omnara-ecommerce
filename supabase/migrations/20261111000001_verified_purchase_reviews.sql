-- Reviews are only allowed for buyers of the product, and the "verified purchase"
-- flag is set by the database, never by the client.

-- Internal check: has this user paid for an order containing this product?
create or replace function private.user_purchased(p_user uuid, p_product uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from order_items oi
    join orders o on o.id = oi.order_id
    join product_variants pv on pv.id = oi.variant_id
    where o.user_id = p_user
      and o.status in ('paid', 'fulfilled')
      and pv.product_id = p_product
  );
$$;
revoke all on function private.user_purchased(uuid, uuid) from public, anon, authenticated;

-- Used by the RLS policy: always about the CURRENT user, so it can't be used to
-- probe what other people bought.
create or replace function private.has_purchased(p_product uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.user_purchased(auth.uid(), p_product);
$$;
revoke all on function private.has_purchased(uuid) from public, anon;
grant execute on function private.has_purchased(uuid) to authenticated;

drop policy reviews_insert_own on public.reviews;
create policy reviews_insert_buyers on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and private.has_purchased(product_id));

-- The flag is computed on insert and frozen afterwards; a review can't be
-- re-pointed to another product or another user.
create or replace function private.reviews_set_verified()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.is_verified_purchase := private.user_purchased(new.user_id, new.product_id);
  else
    new.is_verified_purchase := old.is_verified_purchase;
    new.product_id := old.product_id;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create trigger reviews_set_verified
  before insert or update on public.reviews
  for each row execute function private.reviews_set_verified();

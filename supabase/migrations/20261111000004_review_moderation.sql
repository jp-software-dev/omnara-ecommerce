-- Review moderation: an admin can hide a review instead of deleting it.
-- Hidden reviews disappear from the storefront for everyone except their author
-- and admins, so product pages, averages and seller ratings drop them automatically.

alter table public.reviews
  add column is_hidden boolean not null default false;

drop policy reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select
  using (not is_hidden or user_id = auth.uid() or private.is_admin());

-- Same trigger as before (verified flag frozen after insert) plus: only an admin
-- can change is_hidden, so an author can't un-hide their own hidden review.
create or replace function private.reviews_set_verified()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.is_verified_purchase := private.user_purchased(new.user_id, new.product_id);
    new.is_hidden := false;
  else
    new.is_verified_purchase := old.is_verified_purchase;
    new.product_id := old.product_id;
    new.user_id := old.user_id;
    if new.is_hidden is distinct from old.is_hidden and not private.is_admin() then
      new.is_hidden := old.is_hidden;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.moderate_review(p_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can moderate reviews';
  end if;
  update reviews set is_hidden = p_hidden where id = p_id;
  if not found then
    raise exception 'Review not found';
  end if;
end;
$$;

revoke all on function public.moderate_review(uuid, boolean) from public, anon;
grant execute on function public.moderate_review(uuid, boolean) to authenticated;

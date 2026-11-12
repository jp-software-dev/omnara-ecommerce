-- Saved addresses: the table already existed (RLS: own rows or admin) but was
-- unused. This adds the rules the address book needs. The table had 0 rows when
-- these constraints were applied.
--
-- Lengths are deliberately small: a chosen address travels to Stripe in the
-- checkout session metadata, whose values are capped at 500 characters.

alter table public.addresses
  add constraint addresses_country_check check (country in ('MX', 'US')),
  add constraint addresses_postal_code_check check (
    (country = 'MX' and postal_code ~ '^[0-9]{5}$')
    or (country = 'US' and postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')
  ),
  add constraint addresses_lengths_check check (
    char_length(recipient_name) between 2 and 60
    and char_length(line1) between 3 and 80
    and (line2 is null or char_length(line2) <= 80)
    and char_length(city) between 2 and 50
    and char_length(state) between 2 and 50
    and (phone is null or char_length(phone) <= 20)
    and (label is null or char_length(label) <= 30)
  );

-- At most one default per person and type.
create unique index addresses_one_default_per_type
  on public.addresses (user_id, type) where is_default;

-- Keeps the "one default" rule and caps the book at 10 addresses.
create or replace function public.addresses_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and (select count(*) from addresses where user_id = new.user_id) >= 10 then
    raise exception 'Address limit reached';
  end if;

  -- The first address of a type becomes the default automatically.
  if tg_op = 'INSERT' and not exists (
    select 1 from addresses where user_id = new.user_id and type = new.type
  ) then
    new.is_default := true;
  end if;

  if new.is_default then
    update addresses
       set is_default = false
     where user_id = new.user_id and type = new.type and is_default and id is distinct from new.id;
  end if;
  return new;
end;
$$;

create trigger addresses_before_write
  before insert or update on public.addresses
  for each row execute function public.addresses_before_write();

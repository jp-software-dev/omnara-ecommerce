-- Deliveries only inside Mexico (the project is 100% domestic).
--   * saved addresses must be in Mexico
--   * an order cannot be created with a shipping address outside Mexico, whatever path created it
-- Nothing outside Mexico existed (checked before applying), so no data changes.

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.addresses'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%country%'
  loop
    execute format('alter table public.addresses drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.addresses
  add constraint addresses_country_mx_only check (country = 'MX');

create or replace function private.orders_domestic_only()
returns trigger
language plpgsql
as $$
declare
  v_country text := coalesce(new.shipping_address_snapshot -> 'address' ->> 'country', new.shipping_address_snapshot ->> 'country');
begin
  if v_country is not null and upper(v_country) <> 'MX' then
    raise exception 'We only deliver within Mexico';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_domestic_only on public.orders;
create trigger orders_domestic_only
  before insert or update of shipping_address_snapshot on public.orders
  for each row execute function private.orders_domestic_only();

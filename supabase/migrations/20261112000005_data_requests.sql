-- Account deletion is a REQUEST that an administrator handles, not an automatic
-- wipe: orders and payments have to be kept for legal reasons, so a person decides
-- what can be removed or anonymised. Writes only go through the functions below.

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'deletion' check (kind in ('deletion')),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  admin_note text check (char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

-- One open request per person and kind.
create unique index data_requests_one_pending
  on public.data_requests (user_id, kind) where status = 'pending';

alter table public.data_requests enable row level security;
create policy data_requests_select on public.data_requests
  for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from data_requests where user_id = uid and kind = 'deletion' and status = 'pending') then
    raise exception 'A request is already pending';
  end if;
  insert into data_requests (user_id, kind) values (uid, 'deletion') returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resolve_data_request(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can resolve data requests';
  end if;
  if p_status not in ('done', 'rejected') then
    raise exception 'Invalid status';
  end if;
  update data_requests
     set status = p_status,
         admin_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = p_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already resolved';
  end if;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.resolve_data_request(uuid, text, text) from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.resolve_data_request(uuid, text, text) to authenticated;

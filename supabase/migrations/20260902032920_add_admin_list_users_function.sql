-- Exported unchanged from the Supabase migration history of this project
-- (version 20260902032920, name add_admin_list_users_function). It is already applied to the live database.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, u.email, p.full_name, p.role, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where private.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

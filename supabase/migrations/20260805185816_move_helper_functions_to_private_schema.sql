-- Exported unchanged from the Supabase migration history of this project
-- (version 20260805185816, name move_helper_functions_to_private_schema). It is already applied to the live database.

create schema if not exists private;

alter function public.is_admin() set schema private;
alter function public.is_vendor() set schema private;
alter function public.is_admin_or_vendor() set schema private;
alter function public.handle_new_user() set schema private;

revoke all on function private.is_admin() from anon, authenticated, public;
revoke all on function private.is_vendor() from anon, authenticated, public;
revoke all on function private.is_admin_or_vendor() from anon, authenticated, public;
revoke all on function private.handle_new_user() from anon, authenticated, public;

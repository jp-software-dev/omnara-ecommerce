-- Exported unchanged from the Supabase migration history of this project
-- (version 20260805185906, name fix_helper_function_execute_grants). It is already applied to the live database.

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_vendor() to anon, authenticated;
grant execute on function private.is_admin_or_vendor() to anon, authenticated;

-- Exported unchanged from the Supabase migration history of this project
-- (version 20260831231514, name add_contact_messages_table). It is already applied to the live database.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','read')),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact_messages_insert_public" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "contact_messages_admin_all" on public.contact_messages
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Photo attachments on return/dispute messages (private bucket, only the people in
-- the return can upload or view them).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-attachments', 'return-attachments', false, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Admin, the buyer or the seller of the return. Takes text so a malformed folder name
-- in a storage path simply answers false instead of raising a cast error.
create or replace function private.is_return_participant(p_return text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_return ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      private.is_admin()
      or exists (
        select 1 from public.return_requests r
        where r.id = p_return::uuid
          and (r.user_id = auth.uid() or r.vendor_id = auth.uid())
      )
    );
$$;

drop policy if exists return_attachments_insert on storage.objects;
create policy return_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'return-attachments'
    and private.is_return_participant((storage.foldername(name))[1])
  );

drop policy if exists return_attachments_select on storage.objects;
create policy return_attachments_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'return-attachments'
    and private.is_return_participant((storage.foldername(name))[1])
  );

alter table public.return_messages
  add column if not exists attachment_path text
  check (attachment_path is null or char_length(attachment_path) <= 150);

-- Same rules as before plus an optional attachment that must live in this return's folder.
create or replace function public.add_return_message(p_id uuid, p_body text, p_attachment text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  uid uuid := auth.uid();
  r return_requests%rowtype;
  v_role text;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_body) not between 1 and 1000 then
    raise exception 'Message must be between 1 and 1000 characters';
  end if;
  if p_attachment is not null
     and p_attachment !~ ('^' || p_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid attachment';
  end if;

  select * into r from return_requests where id = p_id;
  if not found then
    raise exception 'Return not found';
  end if;
  if r.status in ('refunded', 'closed') then
    raise exception 'This return is already settled';
  end if;

  if private.is_admin() then
    v_role := 'admin';
  elsif r.user_id = uid then
    v_role := 'buyer';
  elsif r.vendor_id = uid then
    v_role := 'vendor';
  else
    raise exception 'Return not found';
  end if;

  insert into return_messages (return_id, author_id, author_role, body, attachment_path)
  values (p_id, uid, v_role, v_body, p_attachment);
end;
$$;

drop function if exists public.add_return_message(uuid, text);

revoke all on function public.add_return_message(uuid, text, text) from public;
grant execute on function public.add_return_message(uuid, text, text) to authenticated;

-- Self-service seller applications with admin approval and an identity document.

create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 80),
  description text check (char_length(description) <= 500),
  phone text check (char_length(phone) <= 30),
  -- Path inside the private seller-documents bucket; must live in the applicant's folder.
  document_path text not null check (document_path like user_id::text || '/%'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text check (char_length(rejection_reason) <= 300),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- One open application per person.
create unique index seller_applications_one_pending
  on public.seller_applications (user_id) where status = 'pending';

alter table public.seller_applications enable row level security;

create policy seller_applications_select_own_or_admin on public.seller_applications
  for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

-- Only plain customers may apply, and only for themselves, as pending.
create policy seller_applications_insert_customer on public.seller_applications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer')
  );
-- No UPDATE/DELETE policies: decisions go through the functions below.

-- Approve: promote to vendor, create the business and close the application, atomically.
create or replace function public.approve_seller_application(p_id uuid, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  app seller_applications%rowtype;
  owner_role text;
  new_business uuid;
begin
  if not private.is_admin() then
    raise exception 'Only admins can approve applications';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 2 and 60 then
    raise exception 'Invalid slug';
  end if;

  select * into app from seller_applications where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Application not found or already reviewed';
  end if;

  select role into owner_role from profiles where id = app.user_id;
  if owner_role = 'admin' then
    raise exception 'An admin cannot own a business';
  end if;
  if exists (select 1 from businesses where owner_id = app.user_id) then
    raise exception 'This user already has a business';
  end if;

  update profiles set role = 'vendor' where id = app.user_id;

  insert into businesses (owner_id, slug, name, description)
  values (app.user_id, p_slug, app.business_name, app.description)
  returning id into new_business;

  update seller_applications
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;

  return new_business;
end;
$$;

create or replace function public.reject_seller_application(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can reject applications';
  end if;
  update seller_applications
     set status = 'rejected',
         rejection_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id and status = 'pending';
  if not found then
    raise exception 'Application not found or already reviewed';
  end if;
end;
$$;

revoke all on function public.approve_seller_application(uuid, text) from public, anon;
revoke all on function public.reject_seller_application(uuid, text) from public, anon;
grant execute on function public.approve_seller_application(uuid, text) to authenticated;
grant execute on function public.reject_seller_application(uuid, text) to authenticated;

-- Private bucket for identity documents: the applicant can add files to their
-- own folder, only admins can read or delete them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-documents', 'seller-documents', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy seller_documents_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'seller-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy seller_documents_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'seller-documents' and private.is_admin());

create policy seller_documents_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'seller-documents' and private.is_admin());

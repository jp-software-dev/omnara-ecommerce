-- Public questions and answers on products. Anyone signed in can ask; the
-- product's seller (or an admin) answers; an admin can hide a question without
-- deleting it. Writes go through SECURITY DEFINER functions.

create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null check (char_length(question) between 5 and 500),
  answer text check (char_length(answer) between 1 and 1000),
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_questions_product_idx on public.product_questions (product_id, created_at desc);
create index product_questions_user_idx on public.product_questions (user_id, created_at desc);

alter table public.product_questions enable row level security;

-- Visible to everyone unless hidden; hidden ones stay visible to their author and admins.
create policy product_questions_select on public.product_questions
  for select
  using (not is_hidden or user_id = auth.uid() or private.is_admin());

create or replace function public.ask_question(p_product_id uuid, p_question text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_question text := btrim(coalesce(p_question, ''));
  v_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_question) not between 5 and 500 then
    raise exception 'Question must be between 5 and 500 characters';
  end if;
  if not exists (select 1 from products where id = p_product_id and status = 'active') then
    raise exception 'Product not found';
  end if;
  -- Simple abuse brake: five questions per person per hour.
  if (select count(*) from product_questions
       where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many questions, try again later';
  end if;

  insert into product_questions (product_id, user_id, question)
  values (p_product_id, uid, v_question)
  returning id into v_id;
  return v_id;
end;
$$;

-- The product's seller or an admin answers (and may edit the answer later).
create or replace function public.answer_question(p_id uuid, p_answer text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_answer text := btrim(coalesce(p_answer, ''));
  v_vendor uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_answer) not between 1 and 1000 then
    raise exception 'Answer must be between 1 and 1000 characters';
  end if;

  select p.vendor_id into v_vendor
    from product_questions q join products p on p.id = q.product_id
   where q.id = p_id;
  if not found then
    raise exception 'Question not found';
  end if;
  if not (private.is_admin() or v_vendor = uid) then
    raise exception 'Only the seller of this product can answer';
  end if;

  update product_questions
     set answer = v_answer, answered_by = uid, answered_at = now()
   where id = p_id;
end;
$$;

create or replace function public.moderate_question(p_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can moderate questions';
  end if;
  update product_questions set is_hidden = p_hidden where id = p_id;
  if not found then
    raise exception 'Question not found';
  end if;
end;
$$;

revoke all on function public.ask_question(uuid, text) from public, anon;
revoke all on function public.answer_question(uuid, text) from public, anon;
revoke all on function public.moderate_question(uuid, boolean) from public, anon;
grant execute on function public.ask_question(uuid, text) to authenticated;
grant execute on function public.answer_question(uuid, text) to authenticated;
grant execute on function public.moderate_question(uuid, boolean) to authenticated;

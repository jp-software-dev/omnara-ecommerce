-- contact_messages used to accept ANY insert from anyone holding the public key
-- (policy check = true, no size limits, no rate limit). Direct inserts are now
-- closed; the only way in is submit_contact_message(), which validates sizes and
-- throttles. The table had 0 rows when this was applied.

alter table public.contact_messages
  add constraint contact_messages_lengths_check check (
    char_length(name) between 2 and 80
    and char_length(email) between 5 and 120
    and (subject is null or char_length(subject) <= 120)
    and char_length(message) between 10 and 2000
  );

drop policy contact_messages_insert_public on public.contact_messages;

create or replace function public.submit_contact_message(
  p_name text, p_email text, p_subject text, p_message text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 2 and 80 then
    raise exception 'Invalid name';
  end if;
  if char_length(v_email) not between 5 and 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email';
  end if;
  if v_subject is not null and char_length(v_subject) > 120 then
    raise exception 'Subject too long';
  end if;
  if char_length(v_message) not between 10 and 2000 then
    raise exception 'Invalid message length';
  end if;

  -- Brakes: three messages per address per hour, forty in total per hour.
  if (select count(*) from contact_messages
       where lower(email) = v_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many messages';
  end if;
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many messages';
  end if;

  insert into contact_messages (name, email, subject, message)
  values (v_name, v_email, v_subject, v_message);
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text) to anon, authenticated;

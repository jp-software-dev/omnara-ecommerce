-- Programmed sending of the email queue, and the tools the admin needs to run it.
--
-- Emails are queued by database triggers and normally sent right after the action that caused
-- them (flushEmailsSoon). The ones that cannot go out then (an outage, a retry, the reminders
-- created by pg_cron) need something that comes back for them. That is this job: every 5
-- minutes, IF something is pending, it asks the app's /api/cron/send-emails route to send it.
--
-- The call is authenticated with a secret kept in Supabase Vault under the name
-- 'omnara_cron_secret'. The same value must be the CRON_SECRET of the app. Until the secret
-- exists the job selects no rows and does nothing, so it is safe to leave installed.
--
--   to activate it (after setting CRON_SECRET in the app's environment to the same value):
--     select vault.create_secret('<the value>', 'omnara_cron_secret');

do $$
begin
  if exists (select 1 from cron.job where jobname = 'omnara-send-emails') then
    perform cron.unschedule('omnara-send-emails');
  end if;
  perform cron.schedule(
    'omnara-send-emails',
    '*/5 * * * *',
    $job$
    select net.http_post(
      url := 'https://omnara-ecommerce.vercel.app/api/cron/send-emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    )
    from vault.decrypted_secrets s
    where s.name = 'omnara_cron_secret'
      and exists (select 1 from public.email_outbox where status = 'pending');
    $job$
  );
end $$;

-- What the admin page shows about the programmed sending. It never returns the secret.
create or replace function public.email_scheduler_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can read this';
  end if;
  return jsonb_build_object(
    'secret_configured', exists (select 1 from vault.decrypted_secrets where name = 'omnara_cron_secret'),
    'job_active', coalesce((select active from cron.job where jobname = 'omnara-send-emails'), false),
    'pending', (select count(*) from public.email_outbox where status = 'pending'),
    'oldest_pending_at', (select min(created_at) from public.email_outbox where status = 'pending')
  );
end;
$$;

revoke all on function public.email_scheduler_status() from public, anon;
grant execute on function public.email_scheduler_status() to authenticated;

-- Puts failed emails back in the queue (one, or all when no id is given). Admin only.
create or replace function public.retry_failed_emails(p_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can retry emails';
  end if;
  update public.email_outbox
     set status = 'pending', attempts = 0, last_error = null
   where status = 'failed' and (p_id is null or id = p_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.retry_failed_emails(uuid) from public, anon;
grant execute on function public.retry_failed_emails(uuid) to authenticated;

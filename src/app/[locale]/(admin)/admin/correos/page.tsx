import { Badge } from "@/components/ui/badge";
import { isEmailConfigured } from "@/lib/email";
import { durationLabel, emailTemplateLabel } from "@/lib/email-labels";
import { getEmailOutbox, getEmailSchedulerStatus } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { ProcessButton } from "./process-button";
import { RetryButton } from "./retry-button";

export default async function AdminEmailsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const [{ rows, counts }, scheduler] = await Promise.all([getEmailOutbox(), getEmailSchedulerStatus()]);
  const configured = isEmailConfigured();
  const failed = counts.get("failed") ?? 0;

  const t = {
    title: en ? "Email notifications" : "Notificaciones por correo",
    on: en ? "Email is configured: notifications are sent automatically." : "El correo está configurado: las notificaciones se envían solas.",
    off: en
      ? "Email is NOT configured. Notifications are queued but not sent until RESEND_API_KEY and EMAIL_FROM are set on the server."
      : "El correo NO está configurado. Las notificaciones quedan en cola y no se envían hasta definir RESEND_API_KEY y EMAIL_FROM en el servidor.",
    pending: en ? "Pending" : "Pendientes",
    sent: en ? "Sent" : "Enviados",
    failed: en ? "Failed" : "Con error",
    empty: en ? "No emails have been queued yet." : "Todavía no se ha puesto ningún correo en cola.",
    schedule: en ? "Programmed sending" : "Envío programado",
    scheduleOn: en
      ? "Active: every 5 minutes the queue is sent if something is pending."
      : "Activo: cada 5 minutos se envía la cola si hay algo pendiente.",
    scheduleNoSecret: en
      ? "Not active yet: the scheduled job exists but has no shared secret, so it does nothing. Set CRON_SECRET in the app and the same value in Supabase Vault as omnara_cron_secret (see the README)."
      : "Todavía no está activo: la tarea programada existe pero no tiene el secreto compartido, así que no hace nada. Define CRON_SECRET en la app y el mismo valor en Supabase Vault como omnara_cron_secret (ver el README).",
    scheduleUnknown: en ? "The state of the scheduled job could not be read." : "No se pudo leer el estado de la tarea programada.",
    oldest: en ? "Oldest pending email" : "Correo pendiente más antiguo",
    attempts: en ? "attempts" : "intentos",
    retry: en ? "Retry" : "Reintentar",
    retryAll: en ? "Retry all failed" : "Reintentar todos los fallidos",
    failedHelp: en
      ? "An email is retried up to 5 times; after that it stays as failed until you retry it."
      : "Cada correo se reintenta hasta 5 veces; después queda con error hasta que lo reintentes.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className={`mt-2 max-w-2xl text-sm ${configured ? "text-muted-foreground" : "text-destructive"}`}>
        {configured ? t.on : t.off}
      </p>

      <section className="mt-4 max-w-2xl rounded-lg border p-4 text-sm">
        <h2 className="font-medium">{t.schedule}</h2>
        <p
          className={`mt-1 ${
            scheduler && scheduler.job_active && scheduler.secret_configured ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {!scheduler ? t.scheduleUnknown : scheduler.job_active && scheduler.secret_configured ? t.scheduleOn : t.scheduleNoSecret}
        </p>
        {scheduler?.oldest_pending_minutes != null ? (
          <p className="mt-1 text-muted-foreground">
            {t.oldest}: {durationLabel(scheduler.oldest_pending_minutes)}
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
        {(["pending", "sent", "failed"] as const).map((status) => (
          <div key={status} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t[status]}</p>
            <p className="mt-1 text-2xl font-semibold">{counts.get(status) ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ProcessButton locale={locale} />
        {failed > 0 ? <RetryButton locale={locale} label={`${t.retryAll} (${failed})`} /> : null}
      </div>
      {failed > 0 ? <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{t.failedHelp}</p> : null}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-6 max-w-3xl divide-y rounded-lg border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span>
                <span className="font-medium">{emailTemplateLabel(row.template, locale)}</span>
                <span className="text-muted-foreground"> · {row.to_email}</span>
                {row.attempts > 0 && row.status !== "sent" ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.attempts} {t.attempts}
                  </span>
                ) : null}
                {row.last_error ? <span className="block text-xs text-destructive">{row.last_error}</span> : null}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {new Date(row.created_at).toLocaleString(en ? "en-US" : "es-MX", { timeZone: "America/Mexico_City" })}
                <Badge variant={row.status === "sent" ? "default" : row.status === "failed" ? "destructive" : "secondary"}>
                  {row.status === "sent" ? t.sent : row.status === "failed" ? t.failed : t.pending}
                </Badge>
                {row.status === "failed" ? <RetryButton locale={locale} emailId={row.id} label={t.retry} /> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

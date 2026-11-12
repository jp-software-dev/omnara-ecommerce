import { Badge } from "@/components/ui/badge";
import { isEmailConfigured } from "@/lib/email";
import { getEmailOutbox } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { ProcessButton } from "./process-button";

export default async function AdminEmailsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const { rows, counts } = await getEmailOutbox();
  const configured = isEmailConfigured();

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
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className={`mt-2 max-w-2xl text-sm ${configured ? "text-muted-foreground" : "text-destructive"}`}>
        {configured ? t.on : t.off}
      </p>

      <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
        {(["pending", "sent", "failed"] as const).map((status) => (
          <div key={status} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t[status]}</p>
            <p className="mt-1 text-2xl font-semibold">{counts.get(status) ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <ProcessButton locale={locale} />
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-6 max-w-3xl divide-y rounded-lg border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span>
                <span className="font-medium">{row.template}</span>
                <span className="text-muted-foreground"> · {row.to_email}</span>
                {row.last_error ? (
                  <span className="block text-xs text-destructive">{row.last_error}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {new Date(row.created_at).toLocaleString(en ? "en-US" : "es-MX")}
                <Badge variant={row.status === "sent" ? "default" : row.status === "failed" ? "destructive" : "secondary"}>
                  {row.status === "sent" ? t.sent : row.status === "failed" ? t.failed : t.pending}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { Badge } from "@/components/ui/badge";
import { getDataRequests } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { ResolveForm } from "./resolve-form";

export default async function AdminDataRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const requests = await getDataRequests();
  const pending = requests.filter((request) => request.status === "pending").length;
  const date = (value: string) => new Date(value).toLocaleDateString(en ? "en-US" : "es-MX");

  const statusLabel: Record<string, string> = {
    pending: en ? "Pending" : "Pendiente",
    done: en ? "Completed" : "Atendida",
    rejected: en ? "Rejected" : "Rechazada",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{en ? "Data requests" : "Solicitudes de datos"}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {en
          ? "Account deletion requests. Nothing is deleted automatically: remove or anonymise the account yourself (this is an educational project with no real sales, so test orders can be kept or removed as you see fit), then mark the request as done."
          : "Solicitudes para eliminar una cuenta. Nada se borra automáticamente: elimina o anonimiza la cuenta tú mismo (es un proyecto educativo sin ventas reales, así que los pedidos de prueba se pueden conservar o quitar según decidas) y luego marca la solicitud como atendida."}{" "}
        <span className="font-medium text-foreground">
          {pending} {en ? "pending" : "pendientes"}
        </span>
      </p>

      {requests.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{en ? "There are no requests." : "No hay solicitudes."}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{request.profiles?.full_name ?? (en ? "Unnamed user" : "Usuario sin nombre")}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {date(request.created_at)}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{request.user_id}</span>
                </span>
                <Badge variant={request.status === "pending" ? "secondary" : request.status === "done" ? "default" : "destructive"}>
                  {statusLabel[request.status] ?? request.status}
                </Badge>
              </div>
              {request.admin_note ? <p className="mt-2 text-muted-foreground">{request.admin_note}</p> : null}
              {request.status === "pending" ? <ResolveForm requestId={request.id} locale={locale} /> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

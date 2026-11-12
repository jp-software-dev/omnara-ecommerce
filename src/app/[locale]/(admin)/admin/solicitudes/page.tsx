import { Badge } from "@/components/ui/badge";
import { getSellerApplications, getApplicationDocumentUrl } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { ReviewActions } from "./review-actions";

export default async function AdminApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const applications = await getSellerApplications();
  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  // Signed links for the private identity documents (valid for 10 minutes).
  const documentUrls = new Map(
    await Promise.all(
      pending.map(async (a) => [a.id, await getApplicationDocumentUrl(a.document_path)] as const)
    )
  );

  const t = {
    title: en ? "Seller applications" : "Solicitudes de vendedores",
    pending: en ? "Pending" : "Pendientes",
    history: en ? "Reviewed" : "Revisadas",
    none: en ? "No pending applications." : "No hay solicitudes pendientes.",
    applicant: en ? "Applicant" : "Solicitante",
    phone: en ? "Phone" : "Teléfono",
    document: en ? "View identity document" : "Ver documento de identificación",
    noDocument: en ? "Document unavailable" : "Documento no disponible",
    approved: en ? "Approved" : "Aprobada",
    rejected: en ? "Rejected" : "Rechazada",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <h2 className="mt-6 text-lg font-semibold">
        {t.pending} ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="mt-3 grid max-w-2xl gap-4">
          {pending.map((application) => {
            const documentUrl = documentUrls.get(application.id);
            return (
              <li key={application.id} className="rounded-lg border p-4 text-sm">
                <p className="text-base font-semibold">{application.business_name}</p>
                <p className="mt-1 text-muted-foreground">
                  {t.applicant}: {application.profiles?.full_name ?? "—"}
                  {application.phone ? ` · ${t.phone}: ${application.phone}` : ""}
                </p>
                {application.description ? <p className="mt-2">{application.description}</p> : null}
                <p className="mt-2">
                  {documentUrl ? (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4"
                    >
                      {t.document}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t.noDocument}</span>
                  )}
                </p>
                <ReviewActions
                  locale={locale}
                  applicationId={application.id}
                  businessName={application.business_name}
                />
              </li>
            );
          })}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <>
          <h2 className="mt-10 text-lg font-semibold">{t.history}</h2>
          <ul className="mt-3 max-w-2xl divide-y rounded-lg border">
            {reviewed.map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span>
                  {application.business_name}
                  <span className="text-muted-foreground">
                    {" · "}
                    {application.profiles?.full_name ?? "—"}
                  </span>
                </span>
                <Badge variant={application.status === "approved" ? "default" : "secondary"}>
                  {application.status === "approved" ? t.approved : t.rejected}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}

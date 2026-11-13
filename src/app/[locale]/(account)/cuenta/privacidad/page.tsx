import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyDataRequests } from "@/lib/supabase/queries";
import { DeleteRequestButton } from "./delete-request-button";

export default async function PrivacyAccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const requests = await getMyDataRequests(user.id);
  const hasPending = requests.some((request) => request.status === "pending");
  const date = (value: string) => new Date(value).toLocaleDateString(en ? "en-US" : "es-MX");

  const statusLabel: Record<string, string> = {
    pending: en ? "Pending" : "Pendiente",
    done: en ? "Completed" : "Completada",
    rejected: en ? "Rejected" : "Rechazada",
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/cuenta"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {en ? "My account" : "Mi cuenta"}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{en ? "Privacy and my data" : "Privacidad y mis datos"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {en ? "See " : "Consulta el "}
        <Link href="/privacidad" className="underline underline-offset-4">
          {en ? "the privacy notice" : "aviso de privacidad"}
        </Link>
        {en ? " to learn what we keep and why." : " para saber qué guardamos y para qué."}
      </p>

      <section className="mt-6 rounded-lg border p-5">
        <h2 className="font-semibold">{en ? "Download my data" : "Descargar mis datos"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {en
            ? "A JSON file with your account, addresses, orders, reviews, questions, favorites, returns and requests."
            : "Un archivo JSON con tu cuenta, direcciones, pedidos, reseñas, preguntas, favoritos, devoluciones y solicitudes."}
        </p>
        {/* A plain link: the browser downloads the file, no JavaScript needed. */}
        <a
          href="/api/account/export"
          download
          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <Download className="size-4" />
          {en ? "Download (JSON)" : "Descargar (JSON)"}
        </a>
      </section>

      <section className="mt-4 rounded-lg border p-5">
        <h2 className="font-semibold">{en ? "Delete my account" : "Eliminar mi cuenta"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {en
            ? "Send a request and an administrator will review it and let you know. This is an educational project with no real sales, so the test orders you made may be kept while the project lasts, without your contact details where possible."
            : "Envía una solicitud y un administrador la revisará y te avisará. Este es un proyecto educativo sin ventas reales, así que los pedidos de prueba que hiciste pueden conservarse mientras dure el proyecto, sin tus datos de contacto cuando sea posible."}
        </p>
        <div className="mt-3">
          {hasPending ? (
            <p className="text-sm font-medium">{en ? "You already have a pending request." : "Ya tienes una solicitud pendiente."}</p>
          ) : (
            <DeleteRequestButton locale={locale} />
          )}
        </div>

        {requests.length > 0 ? (
          <ul className="mt-4 divide-y rounded-md border text-sm">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  {date(request.created_at)}
                  {request.admin_note ? <span className="block text-xs text-muted-foreground">{request.admin_note}</span> : null}
                </span>
                <Badge variant={request.status === "pending" ? "secondary" : request.status === "done" ? "default" : "destructive"}>
                  {statusLabel[request.status] ?? request.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

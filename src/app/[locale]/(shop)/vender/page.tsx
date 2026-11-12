import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMySellerApplication } from "@/lib/supabase/queries";
import { ApplicationForm } from "./application-form";

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "customer";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = profile?.role ?? "customer";
  }
  const application = user ? await getMySellerApplication() : null;

  const t = {
    title: en ? "Sell on Omnara" : "Vende en Omnara",
    intro: en
      ? "Open your own business inside the marketplace. Tell us about it and attach an ID; the Omnara team reviews every application."
      : "Abre tu propio negocio dentro del marketplace. Cuéntanos de qué se trata y adjunta una identificación; el equipo de Omnara revisa cada solicitud.",
    loginPrompt: en ? "Sign in to apply." : "Inicia sesión para enviar tu solicitud.",
    login: en ? "Sign in" : "Inicia sesión",
    alreadySeller: en ? "You already sell on Omnara." : "Ya vendes en Omnara.",
    panel: en ? "Go to your panel" : "Ir a tu panel",
    pending: en
      ? "Your application is under review. We will enable your business once it is approved."
      : "Tu solicitud está en revisión. Activaremos tu negocio cuando sea aprobada.",
    rejected: en ? "Your last application was not approved." : "Tu última solicitud no fue aprobada.",
    reason: en ? "Reason" : "Motivo",
    again: en ? "You can send a new one:" : "Puedes enviar una nueva:",
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-muted-foreground">{t.intro}</p>

      <div className="mt-6">
        {!user ? (
          <p className="text-sm">
            {t.loginPrompt}{" "}
            <Link href="/login" className="font-medium underline underline-offset-4">
              {t.login}
            </Link>
          </p>
        ) : role === "vendor" || role === "admin" ? (
          <p className="text-sm">
            {t.alreadySeller}{" "}
            <Link href="/admin" className="font-medium underline underline-offset-4">
              {t.panel}
            </Link>
          </p>
        ) : application?.status === "pending" ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">{application.business_name}</p>
            <p className="mt-1 text-muted-foreground">{t.pending}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {application?.status === "rejected" ? (
              <div className="rounded-lg border border-destructive/40 p-4 text-sm">
                <p className="font-medium">{t.rejected}</p>
                {application.rejection_reason ? (
                  <p className="mt-1 text-muted-foreground">
                    {t.reason}: {application.rejection_reason}
                  </p>
                ) : null}
                <p className="mt-1 text-muted-foreground">{t.again}</p>
              </div>
            ) : null}
            <ApplicationForm locale={locale} />
          </div>
        )}
      </div>
    </main>
  );
}

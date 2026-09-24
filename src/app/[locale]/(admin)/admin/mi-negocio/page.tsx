import { getMyBusiness } from "@/lib/supabase/queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { MyBusinessForm } from "./my-business-form";

export default async function MyBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["vendor", "admin"], locale);

  const business = await getMyBusiness();

  const t = {
    title: locale === "en" ? "My business" : "Mi negocio",
    none:
      locale === "en"
        ? "You don't have a business associated with your account yet. Ask an administrator to set one up for you."
        : "Todavía no tienes un negocio asociado a tu cuenta. Pídele a un administrador que lo dé de alta.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <div className="mt-6">
        {business ? (
          <MyBusinessForm
            locale={locale}
            initial={{
              name: business.name,
              description: business.description ?? "",
              logoUrl: business.logo_url ?? "",
              bannerUrl: business.banner_url ?? "",
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        )}
      </div>
    </main>
  );
}

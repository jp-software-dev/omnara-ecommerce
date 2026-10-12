import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getBusinessById } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { EditBusinessForm } from "./edit-business-form";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole(["admin"], locale);

  const business = await getBusinessById(id);
  if (!business) {
    redirect({ href: "/admin/negocios", locale });
    return null;
  }

  const t = {
    back: locale === "en" ? "Back to businesses" : "Volver a negocios",
    owner: locale === "en" ? "Owner" : "Dueño",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <Link
        href="/admin/negocios"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          {t.owner}: {business.profiles?.full_name || "—"} · <span className="font-mono">{business.slug}</span>
        </p>

        <div className="mt-4">
          <EditBusinessForm
            locale={locale}
            businessId={business.id}
            initial={{
              name: business.name,
              description: business.description ?? "",
              logoUrl: business.logo_url ?? "",
              bannerUrl: business.banner_url ?? "",
              isActive: business.is_active,
            }}
          />
        </div>
      </div>
    </main>
  );
}

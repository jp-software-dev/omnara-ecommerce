import Image from "next/image";
import { Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getActiveBusinesses } from "@/lib/supabase/queries";

export default async function BusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const businesses = await getActiveBusinesses();

  const t = {
    title: locale === "en" ? "Businesses" : "Negocios",
    subtitle:
      locale === "en"
        ? "Meet the independent businesses selling on Omnara."
        : "Conoce a los negocios independientes que venden en Omnara.",
    empty: locale === "en" ? "No businesses yet." : "Todavía no hay negocios.",
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-muted-foreground">{t.subtitle}</p>

      {businesses.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/negocio/${business.slug}`}
              className="group overflow-hidden rounded-xl border transition-shadow hover:shadow-lg hover:shadow-foreground/5"
            >
              <div className="relative aspect-[16/7] bg-muted">
                {business.banner_url ? (
                  <Image
                    src={business.banner_url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="flex items-start gap-3 p-4">
                <div className="relative -mt-8 size-14 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted">
                  {business.logo_url ? (
                    <Image src={business.logo_url} alt={business.name} fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Store className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{business.name}</p>
                  {business.description ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{business.description}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

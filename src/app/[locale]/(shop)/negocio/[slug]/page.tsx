import Image from "next/image";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { getBusinessBySlug, getProductsByBusiness } from "@/lib/supabase/queries";
import { ProductCard } from "@/components/shop/product-card";

export default async function BusinessStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  const business = await getBusinessBySlug(slug);
  if (!business) {
    notFound();
  }

  const products = await getProductsByBusiness(business.owner_id);

  const t = {
    empty: locale === "en" ? "This business has no active products yet." : "Este negocio todavía no tiene productos activos.",
  };

  return (
    <main className="flex-1">
      <div className="relative aspect-[16/5] w-full bg-muted sm:aspect-[16/4]">
        {business.banner_url ? (
          <Image src={business.banner_url} alt="" fill sizes="100vw" className="object-cover" priority />
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="flex items-end gap-4 -mt-10">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted">
            {business.logo_url ? (
              <Image src={business.logo_url} alt={business.name} fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Store className="size-8" />
              </div>
            )}
          </div>
          <h1 className="pb-1 text-2xl font-semibold tracking-tight">{business.name}</h1>
        </div>

        {business.description ? (
          <p className="mt-4 max-w-2xl text-muted-foreground">{business.description}</p>
        ) : null}

        <div className="mt-8 pb-10">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

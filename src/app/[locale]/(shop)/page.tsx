import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getBestSellers,
  getCategoryShowcases,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { ProductCard } from "@/components/shop/product-card";
import { HeroCarousel } from "@/components/shop/hero-carousel";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const [showcases, featuredProducts, newArrivals, bestSellers] = await Promise.all([
    getCategoryShowcases(),
    getFeaturedProducts(8),
    getNewArrivals(8),
    getBestSellers(8),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <HeroCarousel slides={showcases} locale={locale} />

      <section className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-16 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-xl font-semibold tracking-tight">
          {locale === "en" ? "Shop by category" : "Compra por categoría"}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {showcases.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-muted"
            >
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={pickLocale(category.name, locale)}
                  fill
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  className="object-cover transition-transform duration-(--duration-expressive) ease-(--ease-expressive) group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <p className="absolute bottom-3 left-3 font-heading text-base font-semibold text-white sm:text-lg">
                {pickLocale(category.name, locale)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {newArrivals.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-10">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">
            {locale === "en" ? "New arrivals" : "Lo más nuevo"}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {bestSellers.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-10">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">
            {locale === "en" ? "Best sellers" : "Lo más comprado"}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {featuredProducts.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-10">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">
            {locale === "en" ? "Featured" : "Destacados"}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

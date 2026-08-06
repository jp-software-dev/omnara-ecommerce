import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, getFeaturedProducts } from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { ProductCard } from "@/components/shop/product-card";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-16 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center text-sm font-medium transition-colors hover:bg-muted"
            >
              {pickLocale(category.name, locale)}
            </Link>
          ))}
        </div>
      </section>

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

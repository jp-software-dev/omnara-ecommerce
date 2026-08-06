import { notFound } from "next/navigation";
import { getProductsByCategory } from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { CategoryFilters } from "@/components/shop/category-filters";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  const { category, products } = await getProductsByCategory(slug).catch(() => ({
    category: null,
    products: null,
  }));

  if (!category || !products) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pickLocale(category.name, locale)}
        </h1>
      </div>
      <CategoryFilters products={products} locale={locale} />
    </main>
  );
}

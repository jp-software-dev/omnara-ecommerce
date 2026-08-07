import { SearchX } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { searchProducts } from "@/lib/supabase/queries";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  const products = q ? await searchProducts(q) : [];

  const t = {
    title: locale === "en" ? "Search results" : "Resultados de búsqueda",
    empty:
      locale === "en"
        ? `No products found for "${q}".`
        : `No encontramos productos para "${q}".`,
    prompt: locale === "en" ? "Search for something above." : "Busca algo usando la barra de arriba.",
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.title}
        {q ? <span className="text-muted-foreground"> — &ldquo;{q}&rdquo;</span> : null}
      </h1>

      {products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <SearchX className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{q ? t.empty : t.prompt}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}

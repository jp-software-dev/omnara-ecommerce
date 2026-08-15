import { ProductCard, type ProductCardData } from "@/components/shop/product-card";

export function RelatedProducts({
  products,
  locale,
}: {
  products: ProductCardData[];
  locale: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="border-t pt-8">
      <h2 className="text-xl font-heading font-semibold tracking-tight">
        {locale === "en" ? "You might also like" : "También te puede interesar"}
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}

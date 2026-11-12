import Image from "next/image";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/shop/product-price";
import { CATEGORY_ATTRIBUTES } from "@/lib/category-attributes";
import { pickLocale } from "@/lib/format";
import { getProductsForComparison } from "@/lib/supabase/queries";
import { RemoveFromComparison } from "./remove-button";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  const { ids } = await searchParams;
  const en = locale === "en";

  const products = await getProductsForComparison((ids ?? "").split(",").filter(Boolean));
  const remaining = (excludeId: string) => products.filter((p) => p.id !== excludeId).map((p) => p.id);

  const t = {
    title: en ? "Compare products" : "Comparar productos",
    empty: en
      ? "Pick at least two products with the Compare button to see them side by side."
      : "Elige al menos dos productos con el botón Comparar para verlos lado a lado.",
    one: en ? "Add another product to compare." : "Agrega otro producto para comparar.",
    browse: en ? "Keep shopping" : "Seguir comprando",
    remove: en ? "Remove from comparison" : "Quitar de la comparación",
    price: en ? "Price" : "Precio",
    best: en ? "Best price" : "Mejor precio",
    soldBy: en ? "Sold by" : "Vendido por",
    rating: en ? "Rating" : "Calificación",
    noReviews: en ? "No reviews yet" : "Sin reseñas",
    reviews: en ? "reviews" : "reseñas",
    category: en ? "Category" : "Categoría",
    sizes: en ? "Sizes in stock" : "Tallas disponibles",
    colors: en ? "Colors in stock" : "Colores disponibles",
    availability: en ? "Availability" : "Disponibilidad",
    inStock: en ? "In stock" : "Disponible",
    outOfStock: en ? "Sold out" : "Agotado",
    specs: en ? "Specifications" : "Características",
  };

  if (products.length < 2) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-muted-foreground">{products.length === 0 ? t.empty : t.one}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          {t.browse}
        </Link>
      </main>
    );
  }

  const lowestPrice = Math.min(...products.map((p) => p.base_price_mxn_cents));

  // Spec rows: every attribute any of the products defines, labelled in the
  // current language when it is a known category field.
  const labelFor = new Map<string, string>();
  for (const fields of Object.values(CATEGORY_ATTRIBUTES)) {
    for (const field of fields) labelFor.set(field.key, field.label[en ? "en" : "es"]);
  }
  const attributeKeys = [
    ...new Set(
      products.flatMap((p) =>
        Object.entries((p.attributes as Record<string, string> | null) ?? {})
          .filter(([, value]) => value)
          .map(([key]) => key)
      )
    ),
  ];

  const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))];
  const inStock = (p: (typeof products)[number]) => p.product_variants.filter((v) => v.stock_quantity > 0);

  const rows: { label: string; render: (p: (typeof products)[number]) => React.ReactNode }[] = [
    {
      label: t.price,
      render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-lg font-semibold">
            <ProductPrice mxnCents={p.base_price_mxn_cents} locale={locale} />
          </span>
          {p.base_price_mxn_cents === lowestPrice ? <Badge>{t.best}</Badge> : null}
        </div>
      ),
    },
    {
      label: t.soldBy,
      render: (p) =>
        p.business ? (
          <Link href={`/negocio/${p.business.slug}`} className="underline underline-offset-4">
            {p.business.name}
          </Link>
        ) : (
          "Omnara"
        ),
    },
    {
      label: t.rating,
      render: (p) =>
        p.ratingAvg === null ? (
          <span className="text-muted-foreground">{t.noReviews}</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Star className="size-4 fill-current text-amber-500" />
            {p.ratingAvg.toFixed(1)}
            <span className="text-muted-foreground">
              ({p.ratingCount} {t.reviews})
            </span>
          </span>
        ),
    },
    {
      label: t.category,
      render: (p) => (p.categories ? pickLocale(p.categories.name, locale) : "—"),
    },
    {
      label: t.sizes,
      render: (p) => unique(inStock(p).map((v) => v.size)).join(", ") || "—",
    },
    {
      label: t.colors,
      render: (p) => unique(inStock(p).map((v) => v.color)).join(", ") || "—",
    },
    {
      label: t.availability,
      render: (p) =>
        inStock(p).length > 0 ? (
          <span>{t.inStock}</span>
        ) : (
          <span className="text-destructive">{t.outOfStock}</span>
        ),
    },
    ...attributeKeys.map((key) => ({
      label: labelFor.get(key) ?? key,
      render: (p: (typeof products)[number]) =>
        ((p.attributes as Record<string, string> | null) ?? {})[key] || "—",
    })),
  ];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b align-top">
              <th scope="col" className="sticky left-0 w-36 bg-background p-3 text-left font-medium text-muted-foreground">
                <span className="sr-only">{t.title}</span>
              </th>
              {products.map((p) => {
                const image = [...p.product_images].sort((a, b) => a.position - b.position)[0];
                return (
                  <th key={p.id} scope="col" className="p-3 text-left font-normal">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/producto/${p.slug}`} className="group block w-full">
                        <div className="relative aspect-square w-full max-w-[180px] overflow-hidden rounded-lg bg-muted">
                          {image ? (
                            <Image
                              src={image.url}
                              alt={pickLocale(p.name, locale)}
                              fill
                              sizes="180px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <p className="mt-2 font-medium group-hover:underline">{pickLocale(p.name, locale)}</p>
                      </Link>
                      <RemoveFromComparison
                        productId={p.id}
                        remainingIds={remaining(p.id)}
                        label={t.remove}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.label} className="border-b last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 bg-background p-3 text-left align-top font-medium text-muted-foreground"
                >
                  {index === rows.length - attributeKeys.length && attributeKeys.length > 0 ? (
                    <span className="block text-xs uppercase tracking-wide">{t.specs}</span>
                  ) : null}
                  {row.label}
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-3 align-top">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

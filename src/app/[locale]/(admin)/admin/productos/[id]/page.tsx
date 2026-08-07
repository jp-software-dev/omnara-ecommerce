import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/supabase/queries";
import { getAdminProduct } from "@/lib/supabase/admin-queries";
import { pickLocale } from "@/lib/format";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id).catch(() => null),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const name = product.name as { es?: string; en?: string } | null;

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{pickLocale(product.name, locale)}</h1>

      <div className="mt-6">
        <ProductForm
          locale={locale}
          categories={categories}
          productId={product.id}
          initial={{
            nameEs: name?.es ?? "",
            nameEn: name?.en ?? "",
            basePriceMxnCents: product.base_price_mxn_cents,
            categoryId: product.category_id,
            status: product.status,
          }}
        />
      </div>

      {product.product_variants.length > 0 ? (
        <div className="mt-10 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {locale === "en" ? "Variants" : "Variantes"}
            </h2>
            <Link
              href="/admin/inventario"
              className="text-sm font-medium underline underline-offset-4"
            >
              {locale === "en" ? "Manage stock" : "Gestionar inventario"}
            </Link>
          </div>
          <ul className="mt-3 divide-y rounded-lg border">
            {product.product_variants.map((variant) => (
              <li key={variant.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {[variant.sku, variant.size, variant.color].filter(Boolean).join(" · ")}
                </span>
                <span className="text-muted-foreground">
                  {locale === "en" ? "Stock" : "Inventario"}: {variant.stock_quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}

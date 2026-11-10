import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/supabase/queries";
import { getAdminProduct } from "@/lib/supabase/admin-queries";
import { pickLocale } from "@/lib/format";
import { ProductForm } from "../product-form";
import { ImagesManager } from "./images-manager";
import { VariantsManager } from "./variants-manager";

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
            attributes: (product.attributes as Record<string, string> | null) ?? {},
          }}
        />
      </div>

      <ImagesManager
        locale={locale}
        productId={product.id}
        productName={pickLocale(product.name, locale)}
        images={product.product_images}
      />

      <VariantsManager locale={locale} productId={product.id} variants={product.product_variants} />

      <Link
        href="/admin/inventario"
        className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
      >
        {locale === "en" ? "Manage stock" : "Gestionar inventario"}
      </Link>
    </main>
  );
}

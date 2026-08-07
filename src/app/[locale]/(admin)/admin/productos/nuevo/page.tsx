import { getCategories } from "@/lib/supabase/queries";
import { ProductForm } from "../product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = await getCategories();

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {locale === "en" ? "New product" : "Nuevo producto"}
      </h1>
      <div className="mt-6">
        <ProductForm locale={locale} categories={categories} />
      </div>
    </main>
  );
}

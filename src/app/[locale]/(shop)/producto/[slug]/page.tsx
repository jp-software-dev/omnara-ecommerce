import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/supabase/queries";
import { formatPrice, pickLocale } from "@/lib/format";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductActions } from "@/components/shop/product-actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  const product = await getProductBySlug(slug).catch(() => null);

  if (!product) {
    notFound();
  }

  const category = product.categories;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link href="/">{locale === "en" ? "Home" : "Inicio"}</Link>}
            />
          </BreadcrumbItem>
          {category ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link href={`/categoria/${category.slug}`}>
                      {pickLocale(category.name, locale)}
                    </Link>
                  }
                />
              </BreadcrumbItem>
            </>
          ) : null}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pickLocale(product.name, locale)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.product_images}
          productName={pickLocale(product.name, locale)}
        />

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {pickLocale(product.name, locale)}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {pickLocale(product.description_short, locale)}
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {formatPrice(product.base_price_mxn_cents, "MXN", locale)}
            </p>
          </div>

          <ProductActions variants={product.product_variants} locale={locale} />

          <Accordion defaultValue={["description"]}>
            <AccordionItem value="description">
              <AccordionTrigger>
                {locale === "en" ? "Description" : "Descripción"}
              </AccordionTrigger>
              <AccordionContent>
                {pickLocale(product.description_long, locale)}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>
                {locale === "en" ? "Shipping & returns" : "Envíos y devoluciones"}
              </AccordionTrigger>
              <AccordionContent>
                {locale === "en"
                  ? "Standard shipping, estimated delivery shown at checkout."
                  : "Envío estándar, la fecha estimada se muestra en el checkout."}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </main>
  );
}

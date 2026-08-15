import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
} from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { getCategoryAttributeFields } from "@/lib/category-attributes";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductActions } from "@/components/shop/product-actions";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { ProductPrice } from "@/components/shop/product-price";
import { ProductReviews } from "@/components/shop/product-reviews";
import { ReviewForm } from "@/components/shop/review-form";
import { RelatedProducts } from "@/components/shop/related-products";
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
  const [reviews, relatedProducts] = await Promise.all([
    getProductReviews(product.id),
    getRelatedProducts(product.category_id, product.id),
  ]);

  const attributeValues = (product.attributes as Record<string, string> | null) ?? {};
  const attributeFields = getCategoryAttributeFields(category?.slug).filter(
    (field) => attributeValues[field.key]
  );

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

        <div className="space-y-8">
          <div>
            {category ? (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {pickLocale(category.name, locale)}
              </p>
            ) : null}
            <div className="mt-1 flex items-start justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">
                {pickLocale(product.name, locale)}
              </h1>
              <WishlistButton
                productId={product.id}
                locale={locale}
                className="shrink-0 border"
              />
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              {pickLocale(product.description_short, locale)}
            </p>
            <p className="mt-4 text-3xl font-heading font-semibold">
              <ProductPrice mxnCents={product.base_price_mxn_cents} locale={locale} />
            </p>
          </div>

          <ProductActions
            variants={product.product_variants}
            locale={locale}
            productSlug={product.slug}
            productName={pickLocale(product.name, locale)}
            productImage={
              [...product.product_images].sort((a, b) => a.position - b.position)[0]?.url ??
              null
            }
            unitPriceMxnCents={product.base_price_mxn_cents}
            categorySlug={category?.slug}
          />

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
            {attributeFields.length > 0 ? (
              <AccordionItem value="specs">
                <AccordionTrigger>
                  {locale === "en" ? "Specifications" : "Características"}
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="divide-y">
                    {attributeFields.map((field) => (
                      <div key={field.key} className="flex justify-between gap-4 py-2 text-sm">
                        <dt className="text-muted-foreground">
                          {field.label[locale === "en" ? "en" : "es"]}
                        </dt>
                        <dd className="font-medium">{attributeValues[field.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>

          <div className="border-t pt-8">
            <ProductReviews reviews={reviews} locale={locale} />
            <ReviewForm productId={product.id} locale={locale} />
          </div>
        </div>
      </div>

      <div className="mt-16">
        <RelatedProducts products={relatedProducts} locale={locale} />
      </div>
    </main>
  );
}

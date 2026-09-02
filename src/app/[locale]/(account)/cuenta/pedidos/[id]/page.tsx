import { ArrowLeft, Star } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { OrderInvoice } from "@/components/shop/order-invoice";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const order = await getOrderDetail(id);

  // RLS also lets a vendor see an order that includes their own item — but this
  // is the *customer's* account section, so only the buyer gets to view it here.
  if (!order || order.user_id !== user.id) {
    redirect({ href: "/cuenta/pedidos", locale });
    return null;
  }

  const t = {
    back: locale === "en" ? "Back to my orders" : "Volver a mis pedidos",
    delivered: locale === "en" ? "Already received it?" : "¿Ya recibiste tu pedido?",
    deliveredHint:
      locale === "en"
        ? "Let others know what you think."
        : "Cuéntale a otros compradores qué te pareció.",
    review: locale === "en" ? "Leave a review" : "Dejar reseña",
  };

  const purchasedProducts = Array.from(
    new Map(
      order.order_items
        .map((item) => ({
          slug: item.product_variants?.products?.slug,
          name: pickLocale(item.product_name_snapshot, locale) || "Producto",
        }))
        .filter((product): product is { slug: string; name: string } => Boolean(product.slug))
        .map((product) => [product.slug, product] as const)
    ).values()
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/cuenta/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="mt-4">
        <OrderInvoice order={order} locale={locale} />
      </div>

      {order.status === "fulfilled" && purchasedProducts.length > 0 ? (
        <div className="mt-6 rounded-lg border p-5">
          <p className="flex items-center gap-2 font-medium">
            <Star className="size-4" />
            {t.delivered}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t.deliveredHint}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {purchasedProducts.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/producto/${product.slug}`}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {t.review}: {product.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}

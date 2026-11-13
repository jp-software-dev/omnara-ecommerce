import { ArrowLeft, Star } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail, getReturnsByOrder } from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { OrderInvoice } from "@/components/shop/order-invoice";
import { RequestReturnForm } from "@/components/shop/request-return-form";
import { isReturnEligible, statusLabel } from "@/lib/returns";
import { Badge } from "@/components/ui/badge";
import { ShipmentTimeline } from "@/components/shop/shipment-timeline";

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

  const returnsByItem = await getReturnsByOrder(order.id);
  const returnableItems = order.order_items.filter(
    (item) => returnsByItem.has(item.id) || isReturnEligible(item, order.status)
  );

  const t = {
    returnsTitle: locale === "en" ? "Returns" : "Devoluciones",
    returnsHint:
      locale === "en"
        ? "Items that have shipped can be returned within 30 days."
        : "Los artículos que ya se enviaron se pueden devolver dentro de 30 días.",
    viewReturn: locale === "en" ? "View return" : "Ver devolución",
    back: locale === "en" ? "Back to my orders" : "Volver a mis pedidos",
    delivered: locale === "en" ? "Already received it?" : "¿Ya recibiste tu pedido?",
    deliveredHint:
      locale === "en"
        ? "Let others know what you think."
        : "Cuéntale a otros compradores qué te pareció.",
    review: locale === "en" ? "Leave a review" : "Dejar reseña",
  };

  // Only items that already shipped are worth reviewing. The database lets a buyer
  // review from the moment the order is paid, but one order can mix several sellers
  // who ship separately, so waiting for the whole order to be "fulfilled" meant the
  // prompt rarely showed up.
  const purchasedProducts = Array.from(
    new Map(
      order.order_items
        .filter((item) => item.shipped_at)
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

      {Array.from(
        new Map(
          order.order_items
            .filter((item) => item.shipped_at && item.tracking_number)
            .map((item) => [item.tracking_number, item])
        ).values()
      ).map((item) => (
        <ShipmentTimeline
          key={item.tracking_number}
          tracking={item.tracking_number}
          shippedAt={item.shipped_at}
          locale={locale}
        />
      ))}

      {returnableItems.length > 0 ? (
        <div className="mt-6 rounded-lg border p-5">
          <p className="font-medium">{t.returnsTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.returnsHint}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {returnableItems.map((item) => {
              const existing = returnsByItem.get(item.id);
              return (
                <li key={item.id} className="text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {pickLocale(item.product_name_snapshot, locale) || "Producto"}
                    </span>
                    {existing ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">{statusLabel(existing.status, locale)}</Badge>
                        <Link
                          href={`/cuenta/devoluciones/${existing.id}`}
                          className="font-medium underline underline-offset-4"
                        >
                          {t.viewReturn}
                        </Link>
                      </span>
                    ) : null}
                  </div>
                  {existing ? null : <RequestReturnForm orderItemId={item.id} locale={locale} />}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {(order.status === "paid" || order.status === "fulfilled") && purchasedProducts.length > 0 ? (
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

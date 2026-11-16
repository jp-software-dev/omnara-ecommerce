import { ArrowLeft, Star } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail, getOrderTracking, getReturnsByOrder } from "@/lib/supabase/queries";
import { pickLocale } from "@/lib/format";
import { OrderInvoice } from "@/components/shop/order-invoice";
import { RequestReturnForm } from "@/components/shop/request-return-form";
import { isReturnEligible, statusLabel } from "@/lib/returns";
import { Badge } from "@/components/ui/badge";
import { ShipmentTracker } from "@/components/shop/shipment-tracker";

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

  // Lazy scheduler: opening an order applies any step that is already due, so the
  // timeline is right even before the periodic job has run. Errors are not fatal.
  await supabase.rpc("advance_order_shipments", { p_order: id });

  const order = await getOrderDetail(id);

  // RLS also lets a vendor see an order that includes their own item — but this
  // is the *customer's* account section, so only the buyer gets to view it here.
  if (!order || order.user_id !== user.id) {
    redirect({ href: "/cuenta/pedidos", locale });
    return null;
  }

  const [returnsByItem, tracking] = await Promise.all([getReturnsByOrder(order.id), getOrderTracking(order.id)]);
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

  // A review is offered once the customer has confirmed the delivery of that item
  // (completed_at). One order can mix several sellers who ship separately, so this is
  // decided per item, not per order.
  const purchasedProducts = Array.from(
    new Map(
      order.order_items
        .filter((item) => item.completed_at)
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

      <ShipmentTracker shipments={tracking} locale={locale} />

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

      {(order.status === "paid" || order.status === "fulfilled" || order.status === "completed") && purchasedProducts.length > 0 ? (
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

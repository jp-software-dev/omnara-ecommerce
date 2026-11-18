import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getOrderDetail, getOrderTracking } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ShipmentTracker } from "@/components/shop/shipment-tracker";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { OrderInvoice } from "@/components/shop/order-invoice";
import { TrackingInput } from "./tracking-input";
import { ShipMyItems } from "./ship-my-items";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { role, user } = await requireRole(["admin", "vendor"], locale);

  // Opening the order applies any step that is already due (the periodic job does it too).
  const supabase = await createClient();
  await supabase.rpc("advance_order_shipments", { p_order: id });

  const order = await getOrderDetail(id);
  if (!order) {
    redirect({ href: "/admin/pedidos", locale });
    return null;
  }

  const myItems = order.order_items.filter((item) => item.vendor_id === user.id);
  const [tracking, { data: myShipment }] = await Promise.all([
    getOrderTracking(order.id),
    supabase.from("shipments").select("id, status").eq("order_id", order.id).eq("vendor_id", user.id).maybeSingle(),
  ]);

  const t = {
    back: locale === "en" ? "Back to orders" : "Volver a pedidos",
    trackingPlaceholder: locale === "en" ? "e.g. 1Z999AA10123456784" : "ej. 1Z999AA10123456784",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="mx-auto mt-4 max-w-2xl">
        <OrderInvoice
          order={order}
          locale={locale}
          ticketHref={`/api/orders/${order.id}/ticket?lang=${locale}`}
          trackingSlot={
            role === "admin" ? (
              <TrackingInput
                orderId={order.id}
                initialValue={order.tracking_number ?? ""}
                placeholder={t.trackingPlaceholder}
              />
            ) : undefined
          }
        />

        <ShipmentTracker shipments={tracking} locale={locale} canConfirm={false} />

        {role === "vendor" ? (
          <ShipMyItems
            locale={locale}
            orderId={order.id}
            orderStatus={order.status}
            shipped={myItems.length > 0 && myItems.every((item) => item.shipped_at)}
            initialTracking={myItems.find((item) => item.tracking_number)?.tracking_number ?? ""}
            shipment={myShipment ?? null}
          />
        ) : null}
      </div>
    </main>
  );
}

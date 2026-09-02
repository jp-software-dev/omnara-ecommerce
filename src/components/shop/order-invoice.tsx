import type { ReactNode } from "react";
import { pickLocale, formatPrice } from "@/lib/format";
import type { Json } from "@/lib/supabase/types";
import { OrderStatusStepper } from "./order-status-stepper";
import { PrintButton } from "./print-button";

type InvoiceItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  product_name_snapshot: Json;
};

type ShippingSnapshot = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
} | null;

export type InvoiceOrder = {
  order_number: string;
  status?: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  promo_code: string | null;
  total_cents: number;
  created_at: string;
  shipping_address_snapshot?: Json | null;
  tracking_number?: string | null;
  order_items: InvoiceItem[];
};

export function OrderInvoice({
  order,
  locale,
  trackingSlot,
}: {
  order: InvoiceOrder;
  locale: string;
  trackingSlot?: ReactNode;
}) {
  const currency = order.currency === "USD" ? "USD" : "MXN";
  const price = (cents: number) => formatPrice(cents, currency, locale);
  const shipping = order.shipping_address_snapshot as ShippingSnapshot;

  const t = {
    orderNumber: locale === "en" ? "Order number" : "Número de pedido",
    items: locale === "en" ? "Items" : "Artículos",
    subtotal: locale === "en" ? "Subtotal" : "Subtotal",
    discount: locale === "en" ? "Discount" : "Descuento",
    shippingLabel: locale === "en" ? "Shipping" : "Envío",
    free: locale === "en" ? "Free" : "Gratis",
    total: locale === "en" ? "Total" : "Total",
    shipTo: locale === "en" ? "Shipping to" : "Enviar a",
    tracking: locale === "en" ? "Tracking number" : "Número de rastreo",
    print: locale === "en" ? "Print receipt" : "Imprimir recibo",
  };

  return (
    <div className="rounded-lg border p-6 print:border-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.orderNumber}</p>
          <p className="font-mono text-lg font-semibold">{order.order_number}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-MX")}
          </p>
        </div>
        {order.status ? <OrderStatusStepper status={order.status} locale={locale} /> : null}
      </div>

      <ul className="mt-6 divide-y">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div>
              <p className="font-medium">{pickLocale(item.product_name_snapshot, locale) || "Producto"}</p>
              <p className="text-muted-foreground">× {item.quantity}</p>
            </div>
            <p className="font-medium">{price(item.unit_price_cents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.subtotal}</span>
          <span>{price(order.subtotal_cents)}</span>
        </div>
        {order.discount_cents > 0 ? (
          <div className="flex justify-between text-primary">
            <span>
              {t.discount}
              {order.promo_code ? ` (${order.promo_code})` : ""}
            </span>
            <span>-{price(order.discount_cents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.shippingLabel}</span>
          <span>{order.shipping_cents === 0 ? t.free : price(order.shipping_cents)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>{t.total}</span>
          <span>{price(order.total_cents)}</span>
        </div>
      </div>

      {shipping?.address ? (
        <div className="mt-6 border-t pt-4 text-sm">
          <p className="font-medium">{t.shipTo}</p>
          <p className="mt-1 text-muted-foreground">
            {shipping.name}
            <br />
            {[shipping.address.line1, shipping.address.line2].filter(Boolean).join(", ")}
            <br />
            {[shipping.address.city, shipping.address.state, shipping.address.postal_code]
              .filter(Boolean)
              .join(", ")}
            <br />
            {shipping.address.country}
          </p>
        </div>
      ) : null}

      {order.tracking_number || trackingSlot ? (
        <div className="mt-4 border-t pt-4 text-sm">
          <p className="font-medium">{t.tracking}</p>
          {trackingSlot ?? (
            <p className="mt-1 font-mono text-muted-foreground">{order.tracking_number}</p>
          )}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end print:hidden">
        <PrintButton label={t.print} />
      </div>
    </div>
  );
}

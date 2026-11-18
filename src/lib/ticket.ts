import { z } from "zod";
import { formatPrice } from "@/lib/format";

// The purchase ticket (comprobante): one document, three uses: the confirmation email, its PDF
// attachment and the PDF download. It comes from the database (order_ticket*) as JSON.

const text = z.string().nullable().optional();

const itemSchema = z.object({
  name: z.unknown(),
  attrs: z.record(z.string(), z.unknown()).nullable().optional(),
  quantity: z.number(),
  unit_price_cents: z.number(),
  seller: text,
});

const shipmentSchema = z.object({
  seller: text,
  status: z.string(),
  tracking_number: text,
  estimated_delivery_at: text,
});

const ticketSchema = z.object({
  order_id: z.string(),
  order_number: z.string(),
  created_at: z.string(),
  status: z.string(),
  currency: z.enum(["MXN", "USD"]),
  subtotal_cents: z.number(),
  shipping_cents: z.number(),
  discount_cents: z.number(),
  promo_code: text,
  total_cents: z.number(),
  customer_email: text,
  shipping_address: z.unknown().optional(),
  demo: z.boolean(),
  has_account: z.boolean(),
  items: z.array(itemSchema),
  shipments: z.array(shipmentSchema),
  estimated_delivery_at: text,
});

export type Ticket = z.infer<typeof ticketSchema>;
export type Locale = "es" | "en";

/** Validates what the database returned; null when it is not a ticket (or is missing). */
export function parseTicket(value: unknown): Ticket | null {
  const parsed = ticketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const TIMEZONE = "America/Mexico_City";

export function formatTicketDate(value: string, locale: Locale, withTime = true): string {
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "es-MX", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function ticketMoney(cents: number, ticket: Ticket, locale: Locale): string {
  return formatPrice(cents, ticket.currency, locale);
}

/** Product name in the right language, followed by its variant ("Transparente · M"). */
export function ticketItemLabel(item: Ticket["items"][number], locale: Locale): string {
  let name = "";
  if (item.name && typeof item.name === "object") {
    const record = item.name as Record<string, unknown>;
    name = String(record[locale] ?? record.es ?? record.en ?? "");
  } else if (typeof item.name === "string") {
    name = item.name;
  }
  const attrs = item.attrs ?? {};
  const variant = [attrs.color, attrs.size].filter((v): v is string => typeof v === "string" && v !== "").join(" · ");
  return variant ? `${name} (${variant})` : name;
}

/** Address lines from the snapshot saved on the order (works for both snapshot shapes). */
export function ticketAddressLines(ticket: Ticket): string[] {
  const snapshot = (ticket.shipping_address ?? null) as Record<string, unknown> | null;
  if (!snapshot || typeof snapshot !== "object") return [];
  const address = (snapshot.address ?? snapshot) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const cityLine = [str(address.city), str(address.state), str(address.postal_code)].filter(Boolean).join(", ");
  return [str(snapshot.name), str(address.line1), str(address.line2), cityLine, str(address.country)].filter(Boolean);
}

const STATUS_TEXT: Record<string, { es: string; en: string }> = {
  confirmed: { es: "Confirmado", en: "Confirmed" },
  preparing: { es: "Preparando", en: "Preparing" },
  shipped: { es: "Enviado", en: "Shipped" },
  in_transit: { es: "En tránsito", en: "In transit" },
  arrived_state: { es: "Llegó a tu estado", en: "Arrived in your state" },
  out_for_delivery: { es: "En reparto", en: "Out for delivery" },
  delivered: { es: "Entregado", en: "Delivered" },
  completed: { es: "Completado", en: "Completed" },
  cancelled: { es: "Cancelado", en: "Cancelled" },
};

export function ticketShipmentStatus(status: string, locale: Locale): string {
  return STATUS_TEXT[status]?.[locale] ?? status;
}

export const TICKET_NOTICE: Record<Locale, string> = {
  es: "COMPROBANTE DE EJEMPLO. Omnara es un proyecto educativo de demostración: este documento no es una factura fiscal, no se realizó ningún cargo y ningún producto es real ni se vende realmente.",
  en: "SAMPLE RECEIPT. Omnara is an educational demo project: this document is not a tax invoice, no charge was made and no product is real or actually sold.",
};

export function ticketFilename(ticket: Ticket): string {
  return `comprobante-${ticket.order_number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

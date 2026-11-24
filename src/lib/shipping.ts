// Flat demo shipping rate — a real deployment would price this per carrier/zone.
export const FLAT_SHIPPING_MXN_CENTS = 9900;

export function computeShippingCents(
  subtotalCents: number,
  freeThresholdCents: number,
  flatRateCents: number
) {
  return subtotalCents >= freeThresholdCents ? 0 : flatRateCents;
}

/**
 * Shipping is charged per shipment: every seller (and the platform itself, `null`) ships its own
 * package, so each one pays the flat rate unless ITS part of the cart reaches the free-shipping
 * threshold. Mirrors place_demo_order, which is what really charges.
 */
export function computeShippingBySeller(
  lines: { sellerId: string | null | undefined; amountCents: number }[],
  freeThresholdCents: number,
  flatRateCents: number
): { totalCents: number; shipments: number; perSeller: { sellerId: string | null; subtotalCents: number; shippingCents: number }[] } {
  const groups = new Map<string, { sellerId: string | null; subtotalCents: number }>();
  for (const line of lines) {
    const sellerId = line.sellerId ?? null;
    const key = sellerId ?? "platform";
    const group = groups.get(key) ?? { sellerId, subtotalCents: 0 };
    group.subtotalCents += line.amountCents;
    groups.set(key, group);
  }
  const perSeller = [...groups.values()].map((group) => ({
    ...group,
    shippingCents: computeShippingCents(group.subtotalCents, freeThresholdCents, flatRateCents),
  }));
  return {
    totalCents: perSeller.reduce((sum, group) => sum + group.shippingCents, 0),
    shipments: perSeller.length,
    perSeller,
  };
}

// SIMULATED carriers for the educational demo: no real carrier is contacted. A
// simulated tracking number starts with "SIM-" and its history is derived from how
// long ago the item shipped, so the customer sees a believable tracking timeline.

export const SIM_CARRIERS = [
  { code: "EXP", name: "Omnara Express" },
  { code: "DPQ", name: "DemoPaq" },
  { code: "ECO", name: "EcoEnvíos" },
] as const;

export type SimCarrierCode = (typeof SIM_CARRIERS)[number]["code"];

export function generateSimulatedTracking(carrier: SimCarrierCode, random: () => number = Math.random): string {
  let digits = "";
  for (let i = 0; i < 10; i++) digits += Math.floor(random() * 10);
  return `SIM-${carrier}-${digits}`;
}

export function isSimulatedTracking(tracking: string | null | undefined): boolean {
  return /^SIM-[A-Z]{3}-\d{10}$/.test(tracking ?? "");
}

export function carrierName(tracking: string | null | undefined): string | null {
  const match = /^SIM-([A-Z]{3})-/.exec(tracking ?? "");
  return SIM_CARRIERS.find((carrier) => carrier.code === match?.[1])?.name ?? null;
}

// The steps of a shipment, in order. The database moves a shipment through them on a
// real-time schedule; the customer closes the last one.
export const SHIPMENT_STEPS = [
  "confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "arrived_state",
  "out_for_delivery",
  "delivered",
  "completed",
] as const;

export type ShipmentStep = (typeof SHIPMENT_STEPS)[number] | "cancelled";

const STEP_LABELS: Record<ShipmentStep, { es: string; en: string }> = {
  confirmed: { es: "Pedido confirmado y pagado", en: "Order confirmed and paid" },
  preparing: { es: "Se está preparando tu pedido", en: "We are preparing your order" },
  shipped: { es: "Tu pedido fue enviado", en: "Your order has shipped" },
  in_transit: { es: "En tránsito", en: "In transit" },
  arrived_state: { es: "Ya llegó a tu estado", en: "Arrived in your state" },
  out_for_delivery: { es: "En reparto a tu domicilio", en: "Out for delivery to your address" },
  delivered: { es: "Entregado", en: "Delivered" },
  completed: { es: "Recibido y cerrado por ti", en: "Received and closed by you" },
  cancelled: { es: "Envío cancelado", en: "Shipment cancelled" },
};

export function shipmentStepLabel(step: string, locale: string): string {
  const label = STEP_LABELS[step as ShipmentStep];
  return label ? label[locale === "en" ? "en" : "es"] : step;
}

/** Dates are shown in Mexico City time whatever the server's timezone is. */
export function formatShipmentTime(value: string | Date, locale: string): string {
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "es-MX", {
    timeZone: "America/Mexico_City",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ShipmentNotice = { kind: "paused" | "delay" | "failed_attempt" | "damaged"; until: string | null };

/** The message shown to the customer for a pause, a delay, a failed attempt or damage. */
export function shipmentNoticeText(notice: ShipmentNotice, locale: string, untilLabel: string | null): string {
  const en = locale === "en";
  // a date like "02:00 p.m." already ends with a dot: do not add a second one
  const stop = untilLabel?.endsWith(".") ? "" : ".";
  const when = untilLabel ? (en ? ` New estimated delivery: ${untilLabel}${stop}` : ` Nueva entrega estimada: ${untilLabel}${stop}`) : "";
  switch (notice.kind) {
    case "paused":
      return en
        ? "This shipment is paused for a review. We'll let you know when it continues."
        : "Este envío está en pausa por una revisión. Te avisaremos cuando continúe.";
    case "delay":
      return (en ? "Your shipment has a delay." : "Tu envío tiene un retraso.") + when;
    case "failed_attempt":
      return (en ? "We couldn't deliver your order on the first attempt." : "No pudimos entregar tu pedido en el primer intento.") + when;
    case "damaged":
      return en
        ? "A problem with the package was reported. If it arrives damaged you can request a return from this order."
        : "Se reportó un problema con el paquete. Si llega dañado, puedes pedir una devolución desde este pedido.";
  }
}

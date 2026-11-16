// Flat demo shipping rate — a real deployment would price this per carrier/zone.
export const FLAT_SHIPPING_MXN_CENTS = 9900;

export function computeShippingCents(
  subtotalCents: number,
  freeThresholdCents: number,
  flatRateCents: number
) {
  return subtotalCents >= freeThresholdCents ? 0 : flatRateCents;
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

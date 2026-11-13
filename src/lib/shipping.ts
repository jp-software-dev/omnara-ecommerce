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

export type TimelineStep = { key: "picked_up" | "in_transit" | "out_for_delivery" | "delivered"; at: Date; done: boolean };

const HOUR = 3_600_000;
// Hours after shipping at which each step is reached.
const OFFSETS: [TimelineStep["key"], number][] = [
  ["picked_up", 0],
  ["in_transit", 12],
  ["out_for_delivery", 48],
  ["delivered", 60],
];

export function trackingTimeline(shippedAt: string | Date, now: number = Date.now()): TimelineStep[] {
  const start = new Date(shippedAt).getTime();
  return OFFSETS.map(([key, hours]) => ({
    key,
    at: new Date(start + hours * HOUR),
    done: now >= start + hours * HOUR,
  }));
}

export function timelineLabel(key: TimelineStep["key"], locale: string): string {
  const en = locale === "en";
  switch (key) {
    case "picked_up":
      return en ? "Picked up by the carrier" : "Recolectado por la paquetería";
    case "in_transit":
      return en ? "In transit" : "En tránsito";
    case "out_for_delivery":
      return en ? "Out for delivery" : "En reparto";
    case "delivered":
      return en ? "Delivered" : "Entregado";
  }
}

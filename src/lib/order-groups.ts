// "My orders" is grouped by where each order stands, not just listed by date, so the one that
// needs the customer (a delivered order waiting for their confirmation) comes first.

export type OrderStage = "awaiting_confirmation" | "in_progress" | "closed" | "cancelled";

export const ORDER_STAGES: OrderStage[] = ["awaiting_confirmation", "in_progress", "closed", "cancelled"];

export type StagedOrder = {
  status: string;
  shipments?: { status: string }[] | null;
};

export function orderStage(order: StagedOrder): OrderStage {
  if (order.status === "cancelled" || order.status === "refunded") return "cancelled";
  if (order.status === "completed") return "closed";
  // paid / fulfilled: a delivered shipment is waiting for the customer to say they got it
  if ((order.shipments ?? []).some((shipment) => shipment.status === "delivered")) return "awaiting_confirmation";
  return "in_progress";
}

/** Orders keep their incoming order (newest first) inside each group; empty groups are omitted. */
export function groupOrders<T extends StagedOrder>(orders: T[]): { stage: OrderStage; orders: T[] }[] {
  return ORDER_STAGES.map((stage) => ({ stage, orders: orders.filter((order) => orderStage(order) === stage) })).filter(
    (group) => group.orders.length > 0
  );
}

const STAGE_LABELS: Record<OrderStage, { es: string; en: string; hint: { es: string; en: string } }> = {
  awaiting_confirmation: {
    es: "Entregados, por confirmar",
    en: "Delivered, waiting for you",
    hint: { es: "Confirma que los recibiste para cerrarlos y poder reseñar.", en: "Confirm you received them to close them and leave a review." },
  },
  in_progress: {
    es: "En curso",
    en: "In progress",
    hint: { es: "Se están preparando o van en camino.", en: "Being prepared or on their way." },
  },
  closed: {
    es: "Cerrados",
    en: "Closed",
    hint: { es: "Ya los recibiste y los confirmaste.", en: "You received and confirmed them." },
  },
  cancelled: {
    es: "Cancelados y reembolsados",
    en: "Cancelled and refunded",
    hint: { es: "", en: "" },
  },
};

export function stageLabel(stage: OrderStage, locale: string): string {
  return STAGE_LABELS[stage][locale === "en" ? "en" : "es"];
}

export function stageHint(stage: OrderStage, locale: string): string {
  return STAGE_LABELS[stage].hint[locale === "en" ? "en" : "es"];
}

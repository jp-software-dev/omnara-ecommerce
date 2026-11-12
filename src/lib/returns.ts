// Labels and rules for returns, shared by server and client components.

export const RETURN_WINDOW_DAYS = 30;

export const RETURN_REASONS = [
  "damaged",
  "wrong_item",
  "not_as_described",
  "changed_mind",
  "other",
] as const;

type Bilingual = { es: string; en: string };

const REASONS: Record<string, Bilingual> = {
  damaged: { es: "Llegó dañado", en: "Arrived damaged" },
  wrong_item: { es: "Recibí otro producto", en: "Received the wrong item" },
  not_as_described: { es: "No es como se describía", en: "Not as described" },
  changed_mind: { es: "Ya no lo quiero", en: "Changed my mind" },
  other: { es: "Otro motivo", en: "Other reason" },
};

const STATUSES: Record<string, Bilingual> = {
  requested: { es: "Esperando al vendedor", en: "Waiting for the seller" },
  approved: { es: "Aprobada, reembolso pendiente", en: "Approved, refund pending" },
  rejected: { es: "Rechazada por el vendedor", en: "Rejected by the seller" },
  escalated: { es: "En disputa, la revisa Omnara", en: "In dispute, Omnara is reviewing" },
  closed: { es: "Cerrada", en: "Closed" },
  refunded: { es: "Reembolsada", en: "Refunded" },
};

const ROLES: Record<string, Bilingual> = {
  buyer: { es: "Comprador", en: "Buyer" },
  vendor: { es: "Vendedor", en: "Seller" },
  admin: { es: "Omnara", en: "Omnara" },
};

const pick = (table: Record<string, Bilingual>, key: string, locale: string) =>
  table[key]?.[locale === "en" ? "en" : "es"] ?? key;

export const reasonLabel = (reason: string, locale: string) => pick(REASONS, reason, locale);
export const statusLabel = (status: string, locale: string) => pick(STATUSES, status, locale);
export const roleLabel = (role: string, locale: string) => pick(ROLES, role, locale);

/** Settled requests can't be discussed or changed any more. */
export const isSettled = (status: string) => status === "refunded" || status === "closed";

/**
 * Whether the buyer can still open a return for an item. The database enforces
 * the same rule when the request is created; this only decides what to show.
 */
export function isReturnEligible(
  item: { shipped_at?: string | null },
  orderStatus: string,
  now = Date.now()
) {
  if (orderStatus !== "paid" && orderStatus !== "fulfilled") return false;
  if (!item.shipped_at) return false;
  const deadline = new Date(item.shipped_at).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now <= deadline;
}

/** Maps the database's exception messages to something a person can act on. */
export function returnErrorMessage(message: string, locale: string): string {
  const en = locale === "en";
  const known: [string, Bilingual][] = [
    ["not eligible", { es: "Este pedido no admite devoluciones.", en: "This order doesn't accept returns." }],
    ["not shipped", { es: "El artículo todavía no se ha enviado.", en: "The item hasn't shipped yet." }],
    ["has not shipped", { es: "El artículo todavía no se ha enviado.", en: "The item hasn't shipped yet." }],
    ["window has closed", { es: "Ya pasaron los 30 días para devolver este artículo.", en: "The 30-day return window has closed." }],
    ["already requested", { es: "Ya pediste la devolución de este artículo.", en: "You already requested a return for this item." }],
    ["already settled", { es: "Esta devolución ya está resuelta.", en: "This return is already settled." }],
    ["already reviewed", { es: "Esta devolución ya fue revisada.", en: "This return was already reviewed." }],
    ["cannot be escalated", { es: "Esta devolución no se puede escalar.", en: "This return can't be escalated." }],
    ["not awaiting your decision", { es: "Esta devolución ya no espera tu decisión.", en: "This return no longer awaits your decision." }],
    ["not approved", { es: "La devolución no está aprobada.", en: "The return isn't approved." }],
    ["Message must be", { es: "El mensaje debe tener entre 1 y 1000 caracteres.", en: "The message must be 1 to 1000 characters." }],
  ];
  const hit = known.find(([needle]) => message.includes(needle));
  return hit ? hit[1][en ? "en" : "es"] : message;
}

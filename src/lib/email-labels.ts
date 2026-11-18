// Readable names for the email templates, for the admin screen (the stored value is the
// template key, which is meaningless to a person).

const LABELS: Record<string, { es: string; en: string }> = {
  order_confirmation: { es: "Confirmación de compra y ticket", en: "Purchase confirmation and receipt" },
  new_sale: { es: "Nueva venta (al vendedor)", en: "New sale (to the seller)" },
  item_shipped: { es: "Artículo enviado", en: "Item shipped" },
  shipment_update: { es: "Avance del envío", en: "Shipment update" },
  confirm_delivery_reminder: { es: "Recordatorio: confirmar la entrega", en: "Reminder: confirm the delivery" },
  review_reminder: { es: "Recordatorio: dejar una reseña", en: "Reminder: leave a review" },
  delivery_confirmed: { es: "Entrega confirmada (al vendedor)", en: "Delivery confirmed (to the seller)" },
  return_requested: { es: "Devolución solicitada (al vendedor)", en: "Return requested (to the seller)" },
  return_status: { es: "Estado de la devolución", en: "Return status" },
  return_escalated: { es: "Disputa por revisar (al administrador)", en: "Dispute to review (to the admin)" },
  application_decision: { es: "Decisión sobre la solicitud de vendedor", en: "Seller application decision" },
  application_received: { es: "Solicitud de vendedor recibida", en: "Seller application received" },
};

export function emailTemplateLabel(template: string, locale: string): string {
  return LABELS[template]?.[locale === "en" ? "en" : "es"] ?? template;
}

/** "5 min", "3 h", "5 d": a duration given in minutes, for the age of the oldest pending email. */
export function durationLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.round(safe / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

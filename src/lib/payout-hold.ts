import { shipmentStepLabel } from "@/lib/shipping";

// Why a sold item is not in the seller's balance yet. The database decides what is payable
// (a closed shipment and no open or refunded return); this only explains the rest.

export type HeldItem = {
  completed_at: string | null;
  shipmentStatus: string | null;
  returnStatus: string | null;
};

export type HoldReason =
  | { kind: "return"; status: string }
  | { kind: "awaiting_customer" }
  | { kind: "in_progress"; status: string }
  | { kind: "no_shipment" };

export function holdReason(item: HeldItem): HoldReason {
  // an open or refunded return always wins: the money waits for it
  if (item.returnStatus && ["requested", "approved", "escalated", "refunded"].includes(item.returnStatus)) {
    return { kind: "return", status: item.returnStatus };
  }
  if (!item.shipmentStatus) return { kind: "no_shipment" };
  if (item.shipmentStatus === "delivered") return { kind: "awaiting_customer" };
  return { kind: "in_progress", status: item.shipmentStatus };
}

const RETURN_STATUS: Record<string, { es: string; en: string }> = {
  requested: { es: "pendiente de tu decisión", en: "waiting for your decision" },
  approved: { es: "aprobada, falta el reembolso", en: "approved, refund pending" },
  escalated: { es: "en disputa", en: "in dispute" },
  refunded: { es: "reembolsada", en: "refunded" },
};

export function holdReasonText(reason: HoldReason, locale: string): string {
  const en = locale === "en";
  switch (reason.kind) {
    case "return":
      return en
        ? `There is a return (${RETURN_STATUS[reason.status]?.en ?? reason.status}); the money waits for it.`
        : `Hay una devolución (${RETURN_STATUS[reason.status]?.es ?? reason.status}); el dinero espera a que se resuelva.`;
    case "awaiting_customer":
      return en ? "Delivered: waiting for the customer to confirm it." : "Entregado: esperando que el cliente lo confirme.";
    case "in_progress":
      return en
        ? `On its way (${shipmentStepLabel(reason.status, locale)}). It is paid once the customer confirms the delivery.`
        : `En camino (${shipmentStepLabel(reason.status, locale)}). Se paga cuando el cliente confirme la entrega.`;
    case "no_shipment":
      return en ? "Waiting to be shipped." : "Esperando ser enviado.";
  }
}

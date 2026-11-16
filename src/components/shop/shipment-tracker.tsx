import { Check, Circle, CircleDot } from "lucide-react";
import { carrierName, formatShipmentTime, shipmentStepLabel } from "@/lib/shipping";
import type { TrackedShipment } from "@/lib/supabase/queries";
import { ConfirmDeliveryButton } from "./confirm-delivery-button";

/**
 * Tracking of every shipment of an order. Past steps show the real time; steps still to
 * come show the estimated time from the same calendar the scheduler follows. When a
 * shipment is delivered, the customer closes it with "Ya lo recibí".
 */
export function ShipmentTracker({
  shipments,
  locale,
  canConfirm = true,
}: {
  shipments: TrackedShipment[];
  locale: string;
  canConfirm?: boolean;
}) {
  if (shipments.length === 0) return null;
  const en = locale === "en";

  return (
    <div className="mt-4 grid gap-4 print:hidden">
      {shipments.map((shipment, index) => {
        const current = shipment.steps.filter((step) => step.done).at(-1)?.status ?? shipment.status;
        const delivery = shipment.steps.find((step) => step.status === "delivered");
        return (
          <section key={shipment.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                {shipments.length > 1
                  ? en
                    ? `Shipment ${index + 1} of ${shipments.length}`
                    : `Envío ${index + 1} de ${shipments.length}`
                  : en
                    ? "Shipment tracking"
                    : "Seguimiento del envío"}
                {shipment.sellerName ? <span className="font-normal text-muted-foreground"> · {shipment.sellerName}</span> : null}
              </h2>
              <span className="text-sm font-medium">{shipmentStepLabel(current, locale)}</span>
            </div>

            {shipment.tracking_number ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {carrierName(shipment.tracking_number) ?? (en ? "Carrier" : "Paquetería")} ·{" "}
                <span className="font-mono">{shipment.tracking_number}</span> ·{" "}
                {en ? "simulated carrier (educational demo)" : "paquetería simulada (demostración educativa)"}
              </p>
            ) : null}

            {delivery && !delivery.done && shipment.status !== "cancelled" ? (
              <p className="mt-2 text-sm">
                {en ? "Estimated delivery: " : "Entrega estimada: "}
                <strong>{delivery.at ? formatShipmentTime(delivery.at, locale) : "—"}</strong>
              </p>
            ) : null}

            <ol className="mt-3 grid gap-2 text-sm">
              {shipment.steps.map((step) => {
                const isCurrent = step.status === current && step.done;
                return (
                  <li
                    key={step.status}
                    className={`flex items-center gap-2 ${step.done ? "" : "text-muted-foreground"}`}
                  >
                    {step.done ? (
                      isCurrent ? <CircleDot className="size-4 text-primary" /> : <Check className="size-4 text-primary" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                    <span className={step.done ? "font-medium" : ""}>{shipmentStepLabel(step.status, locale)}</span>
                    {step.at ? (
                      <span className="text-muted-foreground">
                        {step.done ? "" : "est. "}
                        {formatShipmentTime(step.at, locale)}
                      </span>
                    ) : step.status === "completed" && !step.done ? (
                      <span className="text-muted-foreground">
                        {en ? "when you confirm the delivery" : "cuando confirmes la entrega"}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {canConfirm && shipment.status === "delivered" ? (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {en
                    ? "Did your order arrive? Confirming closes the order and lets you review the product."
                    : "¿Ya te llegó tu pedido? Al confirmarlo se cierra el pedido y puedes reseñar el producto."}
                </p>
                <ConfirmDeliveryButton shipmentId={shipment.id} locale={locale} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

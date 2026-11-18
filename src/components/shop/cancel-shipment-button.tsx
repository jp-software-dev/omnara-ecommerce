"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cancelShipment } from "@/app/[locale]/(account)/cuenta/pedidos/actions";

export function CancelShipmentButton({
  shipmentId,
  locale,
  token,
}: {
  shipmentId: string;
  locale: string;
  /** The order's secret token, for a guest who has no account. */
  token?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function cancel() {
    const message = en
      ? "Cancel this shipment? The items go back to stock and the payment is refunded (simulated). This can't be undone."
      : "¿Cancelar este envío? Los artículos regresan al inventario y se reembolsa el pago (simulado). No se puede deshacer.";
    if (!window.confirm(message)) return;
    startTransition(async () => {
      try {
        const { refundCents, currency } = await cancelShipment(shipmentId, locale, token);
        toast.success(
          en
            ? `Shipment cancelled. Refund: ${formatPrice(refundCents, currency, locale)} (simulated).`
            : `Envío cancelado. Reembolso: ${formatPrice(refundCents, currency, locale)} (simulado).`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={cancel}>
      {en ? "Cancel this shipment" : "Cancelar este envío"}
    </Button>
  );
}

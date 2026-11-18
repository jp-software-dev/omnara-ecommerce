"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { confirmDelivery } from "@/app/[locale]/(account)/cuenta/pedidos/actions";

export function ConfirmDeliveryButton({
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

  function confirm() {
    const message = en
      ? "Confirm that you received this shipment? The order will be closed."
      : "¿Confirmas que recibiste este envío? El pedido se cerrará.";
    if (!window.confirm(message)) return;
    startTransition(async () => {
      try {
        await confirmDelivery(shipmentId, locale, token);
        toast.success(en ? "Thanks! The order is closed." : "¡Gracias! El pedido quedó cerrado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" className="mt-3" disabled={pending} onClick={confirm}>
      {en ? "I received it" : "Ya lo recibí"}
    </Button>
  );
}

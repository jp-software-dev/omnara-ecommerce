"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { refundReturn } from "../actions";

export function RefundButton({
  returnId,
  amountLabel,
  locale,
}: {
  returnId: string;
  amountLabel: string;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function refund() {
    const message = en
      ? `Refund ${amountLabel} to the customer? Through Stripe for a Stripe order; simulated (no money moves) for a demo order. This can't be undone.`
      : `¿Reembolsar ${amountLabel} al cliente? Por Stripe si el pedido fue con Stripe; simulado (no se mueve dinero) si es un pedido de demostración. No se puede deshacer.`;
    if (!window.confirm(message)) return;

    startTransition(async () => {
      try {
        await refundReturn(returnId, locale);
        toast.success(en ? "Refund sent." : "Reembolso enviado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm">
        {en
          ? "Approved. Refund the customer (through Stripe, or simulated for a demo order)."
          : "Aprobada. Reembolsa al cliente (por Stripe, o simulado si es un pedido de demostración)."}
      </p>
      <Button type="button" size="sm" className="justify-self-start" disabled={pending} onClick={refund}>
        {en ? `Refund ${amountLabel}` : `Reembolsar ${amountLabel}`}
      </Button>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createPayout } from "./actions";

export function PayoutButton({
  vendorId,
  amountLabel,
  locale,
}: {
  vendorId: string;
  amountLabel: string;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function pay() {
    const message = en
      ? `Record a simulated payout of ${amountLabel}? No money moves.`
      : `¿Registrar un pago simulado de ${amountLabel}? No se mueve dinero.`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      try {
        await createPayout(vendorId);
        toast.success(en ? "Simulated payout recorded." : "Pago simulado registrado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" size="sm" disabled={pending} onClick={pay}>
      {en ? "Simulate payout" : "Simular pago"}
    </Button>
  );
}

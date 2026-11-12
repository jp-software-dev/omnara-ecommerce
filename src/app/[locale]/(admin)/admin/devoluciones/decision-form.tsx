"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideReturn, resolveReturn } from "../actions";

// "vendor": the seller answers a new request. "admin": Omnara settles a case.
export function DecisionForm({
  returnId,
  locale,
  mode,
}: {
  returnId: string;
  locale: string;
  mode: "vendor" | "admin";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const en = locale === "en";

  const t = {
    prompt:
      mode === "vendor"
        ? en
          ? "Approve the return to send it to Omnara for the refund, or reject it with a reason."
          : "Aprueba la devolución para que Omnara haga el reembolso, o recházala indicando el motivo."
        : en
          ? "Settle this case. Approving queues the refund; closing ends it without a refund."
          : "Resuelve este caso. Aprobar deja el reembolso pendiente; cerrar lo termina sin reembolso.",
    note: en ? "Note (the buyer will see it)" : "Nota (la verá el comprador)",
    approve: en ? "Approve" : "Aprobar",
    deny: mode === "vendor" ? (en ? "Reject" : "Rechazar") : en ? "Close without refund" : "Cerrar sin reembolso",
    done: en ? "Decision saved." : "Decisión guardada.",
  };

  function decide(approve: boolean) {
    startTransition(async () => {
      try {
        if (mode === "vendor") await decideReturn(returnId, approve, note, locale);
        else await resolveReturn(returnId, approve, note, locale);
        toast.success(t.done);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm">{t.prompt}</p>
      <Input value={note} maxLength={500} placeholder={t.note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => decide(true)}>
          {t.approve}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => decide(false)}>
          {t.deny}
        </Button>
      </div>
    </div>
  );
}

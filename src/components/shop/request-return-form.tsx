"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reasonLabel, RETURN_REASONS, RETURN_WINDOW_DAYS } from "@/lib/returns";
import { requestReturn } from "@/app/[locale]/(account)/cuenta/devoluciones/actions";

export function RequestReturnForm({
  orderItemId,
  locale,
}: {
  orderItemId: string;
  locale: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState<(typeof RETURN_REASONS)[number]>("damaged");
  const [details, setDetails] = useState("");
  const en = locale === "en";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const id = await requestReturn({ orderItemId, reason, details }, locale);
        toast.success(en ? "Return requested." : "Devolución solicitada.");
        router.push(`/cuenta/devoluciones/${id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {en ? "Request a return" : "Solicitar devolución"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 grid gap-3 rounded-md border p-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{en ? "Reason" : "Motivo"}</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as (typeof RETURN_REASONS)[number])}
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          {RETURN_REASONS.map((value) => (
            <option key={value} value={value} className="text-foreground">
              {reasonLabel(value, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{en ? "Details (optional)" : "Detalle (opcional)"}</span>
        <Textarea value={details} maxLength={1000} onChange={(event) => setDetails(event.target.value)} />
      </label>
      <p className="text-xs text-muted-foreground">
        {en
          ? `You can request a return up to ${RETURN_WINDOW_DAYS} days after the item shipped. The seller will review it.`
          : `Puedes pedir la devolución hasta ${RETURN_WINDOW_DAYS} días después del envío. El vendedor la revisará.`}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {en ? "Send request" : "Enviar solicitud"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          {en ? "Cancel" : "Cancelar"}
        </Button>
      </div>
    </form>
  );
}

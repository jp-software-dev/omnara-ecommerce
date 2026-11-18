"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addShipmentIncident, forceNextStep, setShipmentHold } from "./actions";

/** The controls of one shipment: pause/resume, force the next step, record an incident. */
export function ShipmentActions({
  shipmentId,
  locale,
  onHold,
  canForce,
}: {
  shipmentId: string;
  locale: string;
  onHold: boolean;
  /** False when the only step left is the customer's confirmation. */
  canForce: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("delay");
  const [hours, setHours] = useState("24");
  const [note, setNote] = useState("");
  const en = locale === "en";

  const t = {
    pause: en ? "Pause" : "Pausar",
    resume: en ? "Resume" : "Reanudar",
    force: en ? "Force next step" : "Forzar siguiente paso",
    incident: en ? "Incident" : "Incidente",
    delay: en ? "Delay" : "Retraso",
    failed: en ? "Failed delivery attempt" : "Intento de entrega fallido",
    damaged: en ? "Damaged package" : "Paquete dañado",
    hours: en ? "Hours of delay" : "Horas de retraso",
    note: en ? "Note for the customer (optional)" : "Nota para el cliente (opcional)",
    save: en ? "Record and notify" : "Registrar y avisar",
    reason: en ? "Reason for the pause (optional, shown to nobody):" : "Motivo de la pausa (opcional, no lo ve el cliente):",
    saved: en ? "Done." : "Listo.",
  };

  function run(task: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await task();
        toast.success(t.saved);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  function togglePause() {
    if (onHold) return run(() => setShipmentHold(shipmentId, false));
    const reason = window.prompt(t.reason) ?? null;
    if (reason === null) return;
    run(() => setShipmentHold(shipmentId, true, reason));
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        <Button type="button" size="xs" variant="outline" disabled={pending} onClick={togglePause}>
          {onHold ? t.resume : t.pause}
        </Button>
        {canForce ? (
          <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => run(() => forceNextStep(shipmentId))}>
            {t.force}
          </Button>
        ) : null}
        <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => setOpen((value) => !value)}>
          {t.incident}
        </Button>
      </div>
      {open ? (
        <div className="grid w-64 gap-2 rounded-md border bg-card p-3 text-left text-sm">
          <select
            aria-label={t.incident}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            <option value="delay" className="text-foreground">{t.delay}</option>
            <option value="failed_attempt" className="text-foreground">{t.failed}</option>
            <option value="damaged" className="text-foreground">{t.damaged}</option>
          </select>
          {kind !== "damaged" ? (
            <Input aria-label={t.hours} type="number" min={1} max={168} value={hours} onChange={(event) => setHours(event.target.value)} placeholder={t.hours} />
          ) : null}
          <Input aria-label={t.note} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t.note} />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await addShipmentIncident(shipmentId, { kind, note, hours: Number(hours) });
                setOpen(false);
                setNote("");
              })
            }
          >
            {t.save}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

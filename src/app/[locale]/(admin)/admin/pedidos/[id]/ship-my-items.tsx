"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shipMyItems } from "../../actions";
import { generateSimulatedTracking, SIM_CARRIERS, type SimCarrierCode } from "@/lib/shipping";

export function ShipMyItems({
  locale,
  orderId,
  orderStatus,
  shipped,
  initialTracking,
}: {
  locale: string;
  orderId: string;
  orderStatus: string;
  shipped: boolean;
  initialTracking: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(initialTracking);
  const [carrier, setCarrier] = useState<SimCarrierCode>(SIM_CARRIERS[0].code);

  const en = locale === "en";
  const t = {
    title: en ? "Your shipment" : "Tu envío",
    help: en
      ? "Marks only your items as shipped. The order becomes fulfilled when every seller has shipped."
      : "Marca como enviados solo tus artículos. El pedido pasa a enviado cuando todos los vendedores hayan enviado.",
    notPaid: en ? "This order is not paid yet, so it can't be shipped." : "Este pedido todavía no está pagado, no se puede enviar.",
    placeholder: en ? "Tracking number (optional)" : "Número de rastreo (opcional)",
    ship: en ? "Mark my items as shipped" : "Marcar mis artículos como enviados",
    update: en ? "Update tracking" : "Actualizar rastreo",
    done: en ? "Saved." : "Guardado.",
    generate: en ? "Generate simulated label" : "Generar guía simulada",
    simHint: en
      ? "Demo carriers: no real carrier is contacted; the customer sees a simulated tracking history."
      : "Paqueterías de demostración: no se contacta a ninguna paquetería real; el cliente ve un seguimiento simulado.",
  };

  const canShip = orderStatus === "paid" || orderStatus === "fulfilled";

  function submit() {
    startTransition(async () => {
      try {
        await shipMyItems(orderId, tracking);
        toast.success(t.done);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <section className="mt-4 rounded-lg border p-4 print:hidden">
      <h2 className="font-semibold">{t.title}</h2>
      {canShip ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t.help}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs font-mono"
              value={tracking}
              maxLength={80}
              placeholder={t.placeholder}
              disabled={pending}
              onChange={(event) => setTracking(event.target.value)}
            />
            <Button type="button" disabled={pending} onClick={submit}>
              {shipped ? t.update : t.ship}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              aria-label={en ? "Carrier" : "Paquetería"}
              value={carrier}
              disabled={pending}
              onChange={(event) => setCarrier(event.target.value as SimCarrierCode)}
              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            >
              {SIM_CARRIERS.map((item) => (
                <option key={item.code} value={item.code} className="text-foreground">
                  {item.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setTracking(generateSimulatedTracking(carrier))}
            >
              {t.generate}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.simHint}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{t.notPaid}</p>
      )}
    </section>
  );
}

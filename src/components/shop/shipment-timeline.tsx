import { Check, Circle } from "lucide-react";
import { carrierName, isSimulatedTracking, timelineLabel, trackingTimeline } from "@/lib/shipping";

/** Tracking history for a SIMULATED shipment; renders nothing for real tracking numbers. */
export function ShipmentTimeline({
  tracking,
  shippedAt,
  locale,
}: {
  tracking: string | null;
  shippedAt: string | null;
  locale: string;
}) {
  if (!shippedAt || !isSimulatedTracking(tracking)) return null;
  const en = locale === "en";
  const steps = trackingTimeline(shippedAt);

  return (
    <section className="mt-4 rounded-lg border p-4 print:hidden">
      <h2 className="font-semibold">{en ? "Shipment tracking" : "Seguimiento del envío"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {carrierName(tracking)} · <span className="font-mono">{tracking}</span> ·{" "}
        {en ? "simulated carrier (educational demo)" : "paquetería simulada (demostración educativa)"}
      </p>
      <ol className="mt-3 grid gap-2 text-sm">
        {steps.map((step) => (
          <li key={step.key} className={`flex items-center gap-2 ${step.done ? "" : "text-muted-foreground"}`}>
            {step.done ? <Check className="size-4 text-primary" /> : <Circle className="size-4" />}
            <span className="font-medium">{timelineLabel(step.key, locale)}</span>
            {step.done ? (
              <span className="text-muted-foreground">
                {step.at.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

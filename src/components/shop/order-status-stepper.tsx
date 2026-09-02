import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = ["pending", "paid", "fulfilled"] as const;

const STEP_LABELS: Record<(typeof STEPS)[number], { es: string; en: string }> = {
  pending: { es: "Pendiente", en: "Pending" },
  paid: { es: "Pagado", en: "Paid" },
  fulfilled: { es: "Enviado", en: "Shipped" },
};

const TERMINAL_LABELS: Record<string, { es: string; en: string }> = {
  cancelled: { es: "Cancelado", en: "Cancelled" },
  refunded: { es: "Reembolsado", en: "Refunded" },
};

export function OrderStatusStepper({ status, locale }: { status: string; locale: string }) {
  const terminal = TERMINAL_LABELS[status];
  if (terminal) {
    return <Badge variant="destructive">{terminal[locale === "en" ? "en" : "es"]}</Badge>;
  }

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const label = STEP_LABELS[step][locale === "en" ? "en" : "es"];
        const done = index <= currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentIndex ? <Check className="size-3" /> : null}
              {label}
            </div>
            {index < STEPS.length - 1 ? <div className="h-px w-6 bg-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

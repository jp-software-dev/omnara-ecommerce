"use client";

import { Check, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_COMPARE, useCompareHydrated, useCompareStore } from "@/stores/compare-store";

export function CompareToggle({
  productId,
  locale,
  className,
}: {
  productId: string;
  locale: string;
  className?: string;
}) {
  const hydrated = useCompareHydrated();
  const selected = useCompareStore((state) => state.ids.includes(productId));
  const toggle = useCompareStore((state) => state.toggle);
  const active = hydrated && selected;
  const en = locale === "en";

  function handleClick(event: React.MouseEvent) {
    // The card is wrapped in a link: don't navigate when toggling.
    event.preventDefault();
    event.stopPropagation();
    if (toggle(productId) === "full") {
      toast.error(
        en
          ? `You can compare up to ${MAX_COMPARE} products.`
          : `Puedes comparar hasta ${MAX_COMPARE} productos.`
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-background",
        active && "border-primary text-primary",
        className
      )}
    >
      {active ? <Check className="size-3.5" /> : <Scale className="size-3.5" />}
      {active ? (en ? "Comparing" : "Comparando") : en ? "Compare" : "Comparar"}
    </button>
  );
}

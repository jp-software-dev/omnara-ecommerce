"use client";

import { Scale, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE, useCompareHydrated, useCompareStore } from "@/stores/compare-store";

export function CompareBar({ locale }: { locale: string }) {
  const hydrated = useCompareHydrated();
  const ids = useCompareStore((state) => state.ids);
  const clear = useCompareStore((state) => state.clear);
  const en = locale === "en";

  if (!hydrated || ids.length === 0) return null;

  const canCompare = ids.length >= 2;

  return (
    <div
      role="region"
      aria-label={en ? "Product comparison" : "Comparación de productos"}
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg print:hidden"
    >
      <Scale className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-sm">
        {ids.length}/{MAX_COMPARE} {en ? "selected" : "seleccionados"}
      </span>
      {canCompare ? (
        <Link href={`/comparar?ids=${ids.join(",")}`}>
          <Button size="sm">{en ? "Compare" : "Comparar"}</Button>
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground">
          {en ? "Pick at least 2" : "Elige al menos 2"}
        </span>
      )}
      <button
        type="button"
        onClick={clear}
        aria-label={en ? "Clear comparison" : "Limpiar comparación"}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

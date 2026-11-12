"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { restockReturnedItem } from "../actions";

export function RestockButton({ returnId, quantity, locale }: { returnId: string; quantity: number; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function restock() {
    const message = en
      ? `Add ${quantity} unit(s) back to stock? Only do this if the item came back in sellable condition.`
      : `¿Reponer ${quantity} unidad(es) al inventario? Hazlo solo si el artículo regresó en condiciones de venderse.`;
    if (!window.confirm(message)) return;

    startTransition(async () => {
      try {
        await restockReturnedItem(returnId, locale);
        toast.success(en ? "Stock updated." : "Inventario actualizado.");
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
          ? "When the item is back, you can return it to stock."
          : "Cuando el artículo regrese, puedes reponerlo al inventario."}
      </p>
      <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={pending} onClick={restock}>
        {en ? "Return to stock" : "Reponer al inventario"}
      </Button>
    </div>
  );
}

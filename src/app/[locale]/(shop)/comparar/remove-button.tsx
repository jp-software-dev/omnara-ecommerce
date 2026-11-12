"use client";

import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useCompareStore } from "@/stores/compare-store";

// Removes a product from both the shared list (floating bar) and this page's URL.
export function RemoveFromComparison({
  productId,
  remainingIds,
  label,
}: {
  productId: string;
  remainingIds: string[];
  label: string;
}) {
  const router = useRouter();
  const remove = useCompareStore((state) => state.remove);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        remove(productId);
        router.replace(remainingIds.length ? `/comparar?ids=${remainingIds.join(",")}` : "/comparar");
      }}
      className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  );
}

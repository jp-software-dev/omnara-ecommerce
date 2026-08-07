"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "../actions";

export function DeleteProductButton({
  productId,
  locale,
}: {
  productId: string;
  locale: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmMessage =
      locale === "en" ? "Delete this product?" : "¿Eliminar este producto?";
    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      await deleteProduct(productId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={handleDelete}
      aria-label={locale === "en" ? "Delete" : "Eliminar"}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

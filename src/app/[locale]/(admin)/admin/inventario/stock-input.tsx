"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { adjustStock } from "../actions";

export function StockInput({
  variantId,
  initialValue,
}: {
  variantId: string;
  initialValue: number;
}) {
  const [value, setValue] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    const parsed = Math.max(0, Math.round(Number(value)));
    if (!Number.isFinite(parsed) || parsed === initialValue) {
      setValue(String(initialValue));
      return;
    }
    setSaving(true);
    try {
      await adjustStock(variantId, parsed);
      setValue(String(parsed));
    } catch (error) {
      setValue(String(initialValue));
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Input
      type="number"
      min="0"
      className="w-20"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
    />
  );
}

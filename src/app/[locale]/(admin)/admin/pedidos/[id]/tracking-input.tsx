"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { updateOrderTracking } from "../../actions";

export function TrackingInput({
  orderId,
  initialValue,
  placeholder,
}: {
  orderId: string;
  initialValue: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (value === initialValue) return;
    setSaving(true);
    try {
      await updateOrderTracking(orderId, value.trim());
    } catch (error) {
      setValue(initialValue);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Input
      className="mt-1 max-w-xs font-mono"
      value={value}
      placeholder={placeholder}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
    />
  );
}

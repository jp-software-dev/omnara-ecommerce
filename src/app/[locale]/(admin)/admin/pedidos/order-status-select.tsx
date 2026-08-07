"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "../actions";

const STATUS_VALUES = ["pending", "paid", "fulfilled", "cancelled", "refunded"] as const;

export function OrderStatusSelect({
  orderId,
  initialStatus,
  labels,
  disabled,
}: {
  orderId: string;
  initialStatus: string;
  labels: Record<string, string>;
  disabled: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    const previous = status;
    setStatus(value);
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, value);
      } catch (error) {
        setStatus(previous);
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-36">
        <SelectValue>{(value: string) => labels[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {labels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

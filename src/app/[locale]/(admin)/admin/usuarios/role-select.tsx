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
import { updateUserRole } from "../actions";

const ROLE_VALUES = ["admin", "vendor", "customer"] as const;

export function RoleSelect({
  userId,
  initialRole,
  labels,
  disabled,
}: {
  userId: string;
  initialRole: string;
  labels: Record<string, string>;
  disabled: boolean;
}) {
  const [role, setRole] = useState(initialRole);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    const previous = role;
    setRole(value);
    startTransition(async () => {
      try {
        await updateUserRole(userId, value);
      } catch (error) {
        setRole(previous);
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el rol.");
      }
    });
  }

  return (
    <Select value={role} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-36">
        <SelectValue>{(value: string) => labels[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ROLE_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {labels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markMessageRead } from "../actions";

export function MarkReadButton({ messageId, label }: { messageId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await markMessageRead(messageId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {label}
    </Button>
  );
}

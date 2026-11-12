"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { escalateReturn } from "../actions";

export function EscalateForm({ returnId, locale }: { returnId: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const en = locale === "en";

  function submit() {
    startTransition(async () => {
      try {
        await escalateReturn(returnId, note, locale);
        toast.success(en ? "Sent to Omnara for review." : "Enviada a Omnara para su revisión.");
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
          ? "The seller rejected this return. If you disagree, Omnara will review the case and decide."
          : "El vendedor rechazó esta devolución. Si no estás de acuerdo, Omnara revisará el caso y decidirá."}
      </p>
      <Textarea
        value={note}
        maxLength={1000}
        placeholder={en ? "Why do you disagree? (optional)" : "¿Por qué no estás de acuerdo? (opcional)"}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button type="button" size="sm" className="justify-self-start" disabled={pending} onClick={submit}>
        {en ? "Open a dispute" : "Abrir disputa"}
      </Button>
    </div>
  );
}

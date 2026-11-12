"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveDataRequest } from "../actions";

export function ResolveForm({ requestId, locale }: { requestId: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const en = locale === "en";

  function resolve(status: "done" | "rejected") {
    startTransition(async () => {
      try {
        await resolveDataRequest(requestId, status, note);
        toast.success(en ? "Request closed." : "Solicitud cerrada.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <div className="mt-3 grid gap-2">
      <Input
        value={note}
        maxLength={500}
        placeholder={en ? "Note for the user (optional)" : "Nota para el usuario (opcional)"}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => resolve("done")}>
          {en ? "Mark as done" : "Marcar como atendida"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => resolve("rejected")}>
          {en ? "Reject" : "Rechazar"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postReturnMessage } from "@/app/[locale]/(account)/cuenta/devoluciones/actions";

export function ReturnMessageForm({ returnId, locale }: { returnId: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const en = locale === "en";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await postReturnMessage(returnId, body, locale);
        setBody("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <Textarea
        value={body}
        maxLength={1000}
        placeholder={en ? "Write a message" : "Escribe un mensaje"}
        aria-label={en ? "Message" : "Mensaje"}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button type="submit" size="sm" className="justify-self-start" disabled={pending || !body.trim()}>
        {en ? "Send" : "Enviar"}
      </Button>
    </form>
  );
}

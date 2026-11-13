"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { postReturnMessage } from "@/app/[locale]/(account)/cuenta/devoluciones/actions";

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 3 * 1024 * 1024;

export function ReturnMessageForm({ returnId, locale }: { returnId: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const en = locale === "en";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        let attachmentPath: string | undefined;
        if (file) {
          const ext = ALLOWED[file.type];
          if (!ext) throw new Error(en ? "Only JPG, PNG or WebP photos." : "Solo fotos JPG, PNG o WebP.");
          if (file.size > MAX_BYTES) throw new Error(en ? "The photo is larger than 3 MB." : "La foto pesa más de 3 MB.");
          attachmentPath = `${returnId}/${crypto.randomUUID()}.${ext}`;
          const { error } = await createClient()
            .storage.from("return-attachments")
            .upload(attachmentPath, file, { contentType: file.type });
          if (error) throw new Error(en ? "Could not upload the photo." : "No se pudo subir la foto.");
        }
        await postReturnMessage(returnId, body, locale, attachmentPath);
        setFile(null);
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
      <label className="grid gap-1 text-xs text-muted-foreground">
        {en ? "Attach a photo (optional, JPG/PNG/WebP, up to 3 MB)" : "Adjuntar una foto (opcional, JPG/PNG/WebP, hasta 3 MB)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="text-sm text-foreground"
        />
      </label>
      <Button type="submit" size="sm" className="justify-self-start" disabled={pending || !body.trim()}>
        {en ? "Send" : "Enviar"}
      </Button>
    </form>
  );
}

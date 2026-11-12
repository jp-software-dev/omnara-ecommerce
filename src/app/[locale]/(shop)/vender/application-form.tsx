"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { submitSellerApplication } from "./actions";

const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const DOC_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_BYTES = 5 * 1024 * 1024;

export function ApplicationForm({ locale }: { locale: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const en = locale === "en";
  const t = {
    name: en ? "Business name" : "Nombre del negocio",
    description: en ? "What do you sell?" : "¿Qué vendes?",
    phone: en ? "Contact phone" : "Teléfono de contacto",
    document: en ? "Identity document" : "Documento de identificación",
    documentHint: en
      ? "Student ID or official ID (JPG, PNG, WebP or PDF, up to 5 MB). Only the Omnara team can see it."
      : "Credencial de estudiante o identificación oficial (JPG, PNG, WebP o PDF, hasta 5 MB). Solo el equipo de Omnara puede verlo.",
    submit: en ? "Send application" : "Enviar solicitud",
    sending: en ? "Sending..." : "Enviando...",
    sent: en ? "Application sent. We will review it soon." : "Solicitud enviada. La revisaremos pronto.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error(en ? "Attach your identity document." : "Adjunta tu documento de identificación.");
      return;
    }
    if (!DOC_TYPES.includes(file.type)) {
      toast.error(en ? "Use a JPG, PNG, WebP or PDF file." : "Usa un archivo JPG, PNG, WebP o PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(en ? "The file is larger than 5 MB." : "El archivo pesa más de 5 MB.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(en ? "Sign in again." : "Vuelve a iniciar sesión.");

      // The first folder must be the applicant's id: the storage policy only
      // lets a user add files to their own folder.
      const path = `${user.id}/${crypto.randomUUID()}.${DOC_EXT[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from("seller-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      await submitSellerApplication({ businessName, description, phone, documentPath: path });
      toast.success(t.sent);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg rounded-lg border p-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="app-name">{t.name}</FieldLabel>
          <Input
            id="app-name"
            value={businessName}
            maxLength={80}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="app-description">{t.description}</FieldLabel>
          <Textarea
            id="app-description"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="app-phone">{t.phone}</FieldLabel>
          <Input id="app-phone" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="app-doc">{t.document}</FieldLabel>
          <input
            id="app-doc"
            ref={fileRef}
            type="file"
            accept={DOC_TYPES.join(",")}
            required
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="text-xs text-muted-foreground">{t.documentHint}</p>
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? t.sending : t.submit}
        </Button>
      </FieldGroup>
    </form>
  );
}

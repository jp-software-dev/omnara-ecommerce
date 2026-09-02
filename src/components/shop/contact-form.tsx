"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export function ContactForm({ locale }: { locale: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    name: locale === "en" ? "Name" : "Nombre",
    email: locale === "en" ? "Email" : "Correo electrónico",
    subject: locale === "en" ? "Subject (optional)" : "Asunto (opcional)",
    message: locale === "en" ? "Message" : "Mensaje",
    messagePlaceholder:
      locale === "en" ? "How can we help?" : "¿En qué te podemos ayudar?",
    send: locale === "en" ? "Send message" : "Enviar mensaje",
    sending: locale === "en" ? "Sending..." : "Enviando...",
    success: locale === "en" ? "Message sent — we'll reply by email." : "Mensaje enviado — te responderemos por correo.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || null,
      message: message.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t.success);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contact-name">{t.name}</FieldLabel>
          <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-email">{t.email}</FieldLabel>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-subject">{t.subject}</FieldLabel>
          <Input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-message">{t.message}</FieldLabel>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            required
            className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? t.sending : t.send}
        </Button>
      </FieldGroup>
    </form>
  );
}

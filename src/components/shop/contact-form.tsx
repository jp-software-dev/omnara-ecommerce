"use client";

import { useState } from "react";
import { toast } from "sonner";
import { captchaEnabled, Turnstile } from "@/components/auth/turnstile";
import { sendContactMessage } from "@/app/[locale]/(shop)/contacto/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export function ContactForm({ locale }: { locale: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, see the hidden input below
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

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
    if (captchaEnabled && !captchaToken) {
      toast.error(locale === "en" ? "Complete the security check." : "Completa la verificación de seguridad.");
      return;
    }
    setLoading(true);
    try {
      await sendContactMessage({ name, email, subject, message, website, captchaToken: captchaToken ?? undefined }, locale);
      toast.success(t.success);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
      setCaptchaReset((n) => n + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <FieldGroup>
        {/* Honeypot: invisible to people and screen readers, tempting for bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>
        <Field>
          <FieldLabel htmlFor="contact-name">{t.name}</FieldLabel>
          <Input id="contact-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
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
            maxLength={2000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            required
            className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
        <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
        <Button type="submit" disabled={loading}>
          {loading ? t.sending : t.send}
        </Button>
      </FieldGroup>
    </form>
  );
}

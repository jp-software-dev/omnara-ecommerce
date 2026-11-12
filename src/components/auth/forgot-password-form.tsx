"use client";

import { captchaEnabled, Turnstile } from "@/components/auth/turnstile";
import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false);
  const en = useLocale() === "en";
  const t = {
    securityCheck: en ? "Complete the security check." : "Completa la verificación de seguridad.",
    title: en ? "Recover your password" : "Recupera tu contraseña",
    subtitle: en ? "We'll email you a link to reset it" : "Te enviaremos un enlace para restablecerla",
    sent: en
      ? "If an account exists with that email, you'll get a link in a few minutes."
      : "Si existe una cuenta con ese correo, recibirás un enlace en unos minutos.",
    email: en ? "Email" : "Correo electrónico",
    emailPlaceholder: en ? "you@email.com" : "tu@correo.com",
    sending: en ? "Sending…" : "Enviando…",
    send: en ? "Send link" : "Enviar enlace",
    back: en ? "Back to sign in" : "Volver a iniciar sesión",
  };
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));

    if (captchaEnabled && !captchaToken) {
      toast.error(t.securityCheck);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // Auth pages aren't locale-prefixed in the redirect chosen here (matching
    // login-form/signup-form, which are Spanish-only) — read it from the
    // current URL so the link lands back on the right locale segment.
    const locale = window.location.pathname.split("/")[1] || "es";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/restablecer`,
      captchaToken: captchaToken ?? undefined,
    });
    setLoading(false);
    setCaptchaReset((n) => n + 1);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              {t.sent}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">{t.email}</FieldLabel>
                  <Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} required />
                </Field>
                <Field>
                  <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
                  <Button type="submit" disabled={loading}>
                    {loading ? t.sending : t.send}
                  </Button>
                  <FieldDescription className="text-center">
                    <a href="../login">{t.back}</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

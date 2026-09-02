"use client";

import { useState } from "react";
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
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));

    setLoading(true);
    const supabase = createClient();
    // Auth pages aren't locale-prefixed in the redirect chosen here (matching
    // login-form/signup-form, which are Spanish-only) — read it from the
    // current URL so the link lands back on the right locale segment.
    const locale = window.location.pathname.split("/")[1] || "es";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/restablecer`,
    });
    setLoading(false);

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
          <CardTitle className="text-xl">Recupera tu contraseña</CardTitle>
          <CardDescription>Te enviaremos un enlace para restablecerla</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              Si existe una cuenta con ese correo, recibirás un enlace en unos minutos.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                  <Input id="email" name="email" type="email" placeholder="tu@correo.com" required />
                </Field>
                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Enviando…" : "Enviar enlace"}
                  </Button>
                  <FieldDescription className="text-center">
                    <a href="../login">Volver a iniciar sesión</a>
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

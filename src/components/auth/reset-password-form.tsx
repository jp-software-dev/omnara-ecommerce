"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
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

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const en = useLocale() === "en";
  const t = {
    mismatch: en ? "Passwords don't match." : "Las contraseñas no coinciden.",
    tooShort: en ? "Password must be at least 8 characters." : "La contraseña debe tener al menos 8 caracteres.",
    expired: en ? "The link expired or was already used — request a new one." : "El enlace expiró o ya se usó — solicita uno nuevo.",
    updated: en ? "Password updated." : "Contraseña actualizada.",
    title: en ? "Choose a new password" : "Elige una nueva contraseña",
    subtitle: en ? "Use at least 8 characters" : "Usa al menos 8 caracteres",
    newPassword: en ? "New password" : "Nueva contraseña",
    confirm: en ? "Confirm password" : "Confirmar contraseña",
    saving: en ? "Saving…" : "Guardando…",
    save: en ? "Save password" : "Guardar contraseña",
    back: en ? "Back to sign in" : "Volver a iniciar sesión",
  };
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirm-password"));

    if (password !== confirmPassword) {
      toast.error(t.mismatch);
      return;
    }
    if (password.length < 8) {
      toast.error(t.tooShort);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === "Auth session missing!"
          ? t.expired
          : error.message
      );
      return;
    }

    toast.success(t.updated);
    router.push("/");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">{t.newPassword}</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">{t.confirm}</FieldLabel>
                <Input id="confirm-password" name="confirm-password" type="password" required />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? t.saving : t.save}
                </Button>
                <FieldDescription className="text-center">
                  <a href="../login">{t.back}</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirm-password"));

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === "Auth session missing!"
          ? "El enlace expiró o ya se usó — solicita uno nuevo."
          : error.message
      );
      return;
    }

    toast.success("Contraseña actualizada.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Elige una nueva contraseña</CardTitle>
          <CardDescription>Usa al menos 8 caracteres</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirmar contraseña</FieldLabel>
                <Input id="confirm-password" name="confirm-password" type="password" required />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando…" : "Guardar contraseña"}
                </Button>
                <FieldDescription className="text-center">
                  <a href="../login">Volver a iniciar sesión</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

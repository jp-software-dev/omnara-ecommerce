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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const en = useLocale() === "en";
  const t = {
    wrongCredentials: en ? "Incorrect email or password." : "Correo o contraseña incorrectos.",
    signedIn: en ? "Signed in." : "Sesión iniciada.",
    emailSubtitle: en ? "Sign in with your email" : "Inicia sesión con tu correo electrónico",
    welcome: en ? "Welcome back" : "Bienvenido de nuevo",
    email: en ? "Email" : "Correo electrónico",
    emailPlaceholder: en ? "you@email.com" : "tu@correo.com",
    password: en ? "Password" : "Contraseña",
    forgot: en ? "Forgot your password?" : "¿Olvidaste tu contraseña?",
    signingIn: en ? "Signing in…" : "Iniciando sesión…",
    signIn: en ? "Sign in" : "Iniciar sesión",
    noAccount: en ? "Don't have an account?" : "¿No tienes cuenta?",
    signUp: en ? "Sign up" : "Regístrate",
    agreePrefix: en ? "By continuing, you agree to our" : "Al continuar, aceptas nuestros",
    terms: en ? "Terms of service" : "Términos de servicio",
    and: en ? "and" : "y",
    privacy: en ? "Privacy notice" : "Aviso de privacidad",
  };
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? t.wrongCredentials
          : error.message
      );
      return;
    }

    toast.success(t.signedIn);
    router.push("/");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t.welcome}</CardTitle>
          <CardDescription>{t.emailSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t.email}</FieldLabel>
                <Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} required />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t.password}</FieldLabel>
                  <a
                    href="../recuperar"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    {t.forgot}
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? t.signingIn : t.signIn}
                </Button>
                <FieldDescription className="text-center">
                  {t.noAccount} <a href="../signup">{t.signUp}</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {t.agreePrefix} <a href="../terminos">{t.terms}</a> {t.and}{" "}
        <a href="../privacidad">{t.privacy}</a>.
      </FieldDescription>
    </div>
  );
}

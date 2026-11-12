"use client";

import { captchaEnabled, Turnstile } from "@/components/auth/turnstile";
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

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const en = useLocale() === "en";
  const t = {
    mismatch: en ? "Passwords don't match." : "Las contraseñas no coinciden.",
    tooShort: en ? "Password must be at least 8 characters." : "La contraseña debe tener al menos 8 caracteres.",
    securityCheck: en ? "Complete the security check." : "Completa la verificación de seguridad.",
    created: en ? "Account created." : "Cuenta creada.",
    checkEmail: en ? "Account created. Check your email to confirm it." : "Cuenta creada. Revisa tu correo para confirmarla.",
    title: en ? "Create your account" : "Crea tu cuenta",
    subtitle: en ? "Enter your details to sign up" : "Ingresa tus datos para registrarte",
    fullName: en ? "Full name" : "Nombre completo",
    namePlaceholder: en ? "Your name" : "Tu nombre",
    email: en ? "Email" : "Correo electrónico",
    emailPlaceholder: en ? "you@email.com" : "tu@correo.com",
    password: en ? "Password" : "Contraseña",
    confirm: en ? "Confirm" : "Confirmar",
    minimum: en ? "At least 8 characters." : "Mínimo 8 caracteres.",
    creating: en ? "Creating account…" : "Creando cuenta…",
    create: en ? "Create account" : "Crear cuenta",
    haveAccount: en ? "Already have an account?" : "¿Ya tienes cuenta?",
    signIn: en ? "Sign in" : "Inicia sesión",
    agreePrefix: en ? "By continuing, you agree to our" : "Al continuar, aceptas nuestros",
    terms: en ? "Terms of service" : "Términos de servicio",
    and: en ? "and" : "y",
    privacy: en ? "Privacy notice" : "Aviso de privacidad",
  };
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name"));
    const email = String(form.get("email"));
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

    if (captchaEnabled && !captchaToken) {
      toast.error(t.securityCheck);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, captchaToken: captchaToken ?? undefined },
    });
    setLoading(false);
    setCaptchaReset((n) => n + 1);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success(t.created);
      router.push("/");
      router.refresh();
    } else {
      toast.success(t.checkEmail);
      router.push("/login");
    }
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
                <FieldLabel htmlFor="name">{t.fullName}</FieldLabel>
                <Input id="name" name="name" type="text" placeholder={t.namePlaceholder} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">{t.email}</FieldLabel>
                <Input id="email" name="email" type="email" placeholder={t.emailPlaceholder} required />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">{t.password}</FieldLabel>
                    <Input id="password" name="password" type="password" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">{t.confirm}</FieldLabel>
                    <Input id="confirm-password" name="confirm-password" type="password" required />
                  </Field>
                </Field>
                <FieldDescription>{t.minimum}</FieldDescription>
              </Field>
              <Field>
                <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
                <Button type="submit" disabled={loading}>
                  {loading ? t.creating : t.create}
                </Button>
                <FieldDescription className="text-center">
                  {t.haveAccount} <a href="../login">{t.signIn}</a>
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

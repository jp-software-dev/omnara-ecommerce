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
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const en = useLocale() === "en";
  const t = {
    securityCheck: en ? "Complete the security check." : "Completa la verificación de seguridad.",
    wrongCredentials: en ? "Incorrect email or password." : "Correo o contraseña incorrectos.",
    signedIn: en ? "Signed in." : "Sesión iniciada.",
    googleSoon: en
      ? "Google sign-in will be connected in the next phase."
      : "El inicio de sesión con Google se conecta en la siguiente fase.",
    welcome: en ? "Welcome back" : "Bienvenido de nuevo",
    googleSubtitle: en ? "Sign in with your Google account" : "Inicia sesión con tu cuenta de Google",
    google: en ? "Continue with Google" : "Continuar con Google",
    orContinue: en ? "Or continue with" : "O continúa con",
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    if (captchaEnabled && !captchaToken) {
      toast.error(t.securityCheck);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captchaToken ?? undefined },
    });
    setLoading(false);
    setCaptchaReset((n) => n + 1);

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

  function handleGoogleClick() {
    toast(t.googleSoon);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t.welcome}</CardTitle>
          <CardDescription>{t.googleSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Button variant="outline" type="button" onClick={handleGoogleClick}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {t.google}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {t.orContinue}
              </FieldSeparator>
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
                <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
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

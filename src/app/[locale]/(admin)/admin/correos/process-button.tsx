"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { processEmailsNow } from "../actions";

export function ProcessButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function run() {
    startTransition(async () => {
      try {
        const result = await processEmailsNow();
        if (!result.configured) {
          toast.error(
            en
              ? "Email is not configured: set RESEND_API_KEY and EMAIL_FROM on the server."
              : "El correo no está configurado: define RESEND_API_KEY y EMAIL_FROM en el servidor."
          );
        } else {
          toast.success(
            en
              ? `Sent ${result.sent}, failed ${result.failed}.`
              : `Enviados ${result.sent}, con error ${result.failed}.`
          );
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" size="sm" disabled={pending} onClick={run}>
      {en ? "Send pending emails now" : "Enviar correos pendientes ahora"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { retryFailedEmails } from "../actions";

/** Puts one failed email (or every failed one when no id is given) back in the queue. */
export function RetryButton({ locale, emailId, label }: { locale: string; emailId?: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function retry() {
    startTransition(async () => {
      try {
        const count = await retryFailedEmails(emailId);
        toast.success(
          en
            ? `${count} email(s) back in the queue. They go out with the next sending.`
            : `${count} correo(s) de vuelta en la cola. Saldrán en el próximo envío.`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" size="xs" variant="outline" disabled={pending} onClick={retry}>
      {label}
    </Button>
  );
}

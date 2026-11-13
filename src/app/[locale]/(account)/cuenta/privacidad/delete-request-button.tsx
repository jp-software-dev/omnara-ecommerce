"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { requestAccountDeletion } from "./actions";

export function DeleteRequestButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function request() {
    const message = en
      ? "Request deletion of your account? An administrator will review it. Test orders may be kept while the project lasts."
      : "¿Solicitar la eliminación de tu cuenta? Un administrador la revisará. Los pedidos de prueba pueden conservarse mientras dure el proyecto.";
    if (!window.confirm(message)) return;

    startTransition(async () => {
      try {
        await requestAccountDeletion(locale);
        toast.success(en ? "Request sent." : "Solicitud enviada.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={request}>
      {en ? "Request account deletion" : "Solicitar eliminar mi cuenta"}
    </Button>
  );
}

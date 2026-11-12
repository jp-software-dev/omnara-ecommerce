"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { moderateReview } from "../actions";

export function ModerateButton({
  reviewId,
  hidden,
  locale,
}: {
  reviewId: string;
  hidden: boolean;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const en = locale === "en";

  function toggle() {
    startTransition(async () => {
      try {
        await moderateReview(reviewId, !hidden);
        toast.success(
          hidden ? (en ? "Review restored." : "Reseña restaurada.") : en ? "Review hidden." : "Reseña ocultada."
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <Button
      type="button"
      size="xs"
      variant={hidden ? "outline" : "destructive"}
      disabled={pending}
      onClick={toggle}
    >
      {hidden ? (en ? "Restore" : "Restaurar") : en ? "Hide" : "Ocultar"}
    </Button>
  );
}

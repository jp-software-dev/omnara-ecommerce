"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rateShipment } from "@/app/[locale]/(account)/cuenta/pedidos/actions";

/** Five stars and an optional comment to rate how the delivery went. */
export function RateShipment({ shipmentId, locale, token }: { shipmentId: string; locale: string; token?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const en = locale === "en";

  function submit() {
    if (rating === 0) {
      toast.error(en ? "Pick from 1 to 5 stars." : "Elige de 1 a 5 estrellas.");
      return;
    }
    startTransition(async () => {
      try {
        await rateShipment(shipmentId, locale, { rating, comment }, token);
        toast.success(en ? "Thanks for rating your delivery!" : "¡Gracias por calificar tu entrega!");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{en ? "How was the delivery?" : "¿Cómo fue la entrega?"}</p>
      <div role="radiogroup" aria-label={en ? "Delivery rating" : "Calificación de la entrega"} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} ${en ? "stars" : "estrellas"}`}
            onClick={() => setRating(value)}
            className="rounded p-0.5"
          >
            <Star className={`size-6 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Input
        aria-label={en ? "Comment (optional)" : "Comentario (opcional)"}
        placeholder={en ? "Comment (optional)" : "Comentario (opcional)"}
        maxLength={300}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button type="button" size="sm" className="justify-self-start" disabled={pending} onClick={submit}>
        {en ? "Send rating" : "Enviar calificación"}
      </Button>
    </div>
  );
}

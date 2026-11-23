"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** The customer closes a delivered shipment. The database checks they own the order. */
export async function confirmDelivery(shipmentId: string, locale: string, token?: string) {
  const id = z.string().uuid().parse(shipmentId);
  const en = locale === "en";
  const guestToken = token ? z.string().uuid().parse(token) : undefined;
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_delivery", {
    p_shipment: id,
    ...(guestToken ? { p_token: guestToken } : {}),
  });
  if (error) {
    if (error.message.includes("not been delivered")) {
      throw new Error(en ? "This shipment has not been delivered yet." : "Este envío todavía no se ha entregado.");
    }
    throw new Error(en ? "We couldn't confirm the delivery. Try again." : "No pudimos confirmar la entrega. Intenta de nuevo.");
  }
  revalidatePath("/[locale]/(account)/cuenta/pedidos", "layout");
}

/**
 * The customer cancels a shipment that has not shipped yet. The database checks they own the
 * order (or hold its secret token), puts the items back in stock, works out the simulated refund
 * and tells the seller. Returns the refund so the screen can show it.
 */
export async function cancelShipment(shipmentId: string, locale: string, token?: string) {
  const id = z.string().uuid().parse(shipmentId);
  const en = locale === "en";
  const guestToken = token ? z.string().uuid().parse(token) : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_shipment", {
    p_shipment: id,
    ...(guestToken ? { p_token: guestToken } : {}),
  });
  if (error) {
    if (error.message.includes("before it ships")) {
      throw new Error(en ? "This shipment already left, so it can't be cancelled." : "Este envío ya salió, ya no se puede cancelar.");
    }
    throw new Error(en ? "We couldn't cancel the shipment. Try again." : "No pudimos cancelar el envío. Intenta de nuevo.");
  }
  revalidatePath("/[locale]/(account)/cuenta/pedidos", "layout");
  revalidatePath("/[locale]/(shop)/checkout/confirmacion", "page");
  const result = data as { refund_cents?: number; whole_order?: boolean; currency?: string } | null;
  return { refundCents: result?.refund_cents ?? 0, currency: (result?.currency === "USD" ? "USD" : "MXN") as "MXN" | "USD" };
}

const ratingSchema = z.object({
  rating: z.number().int("La calificación debe ser un número entero.").min(1, "Elige de 1 a 5 estrellas.").max(5, "Elige de 1 a 5 estrellas."),
  comment: z.string().trim().max(300, "El comentario es demasiado largo (máximo 300).").optional(),
});

/** The customer rates a closed shipment (the delivery, not the product). Once per shipment. */
export async function rateShipment(shipmentId: string, locale: string, input: { rating: number; comment?: string }, token?: string) {
  const id = z.string().uuid().parse(shipmentId);
  const en = locale === "en";
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos no válidos.");
  const guestToken = token ? z.string().uuid().parse(token) : undefined;

  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_shipment", {
    p_shipment: id,
    p_rating: parsed.data.rating,
    ...(parsed.data.comment ? { p_comment: parsed.data.comment } : {}),
    ...(guestToken ? { p_token: guestToken } : {}),
  });
  if (error) {
    if (error.message.includes("already rated")) {
      throw new Error(en ? "You already rated this shipment." : "Ya calificaste este envío.");
    }
    if (error.message.includes("confirmed the delivery")) {
      throw new Error(en ? "Confirm the delivery first." : "Primero confirma la entrega.");
    }
    throw new Error(en ? "We couldn't save your rating. Try again." : "No pudimos guardar tu calificación. Intenta de nuevo.");
  }
  revalidatePath("/[locale]/(account)/cuenta/pedidos", "layout");
  revalidatePath("/[locale]/(shop)/checkout/confirmacion", "page");
}

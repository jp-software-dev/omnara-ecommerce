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

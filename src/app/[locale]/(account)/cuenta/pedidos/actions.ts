"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** The customer closes a delivered shipment. The database checks they own the order. */
export async function confirmDelivery(shipmentId: string, locale: string) {
  const id = z.string().uuid().parse(shipmentId);
  const en = locale === "en";
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_delivery", { p_shipment: id });
  if (error) {
    if (error.message.includes("not been delivered")) {
      throw new Error(en ? "This shipment has not been delivered yet." : "Este envío todavía no se ha entregado.");
    }
    throw new Error(en ? "We couldn't confirm the delivery. Try again." : "No pudimos confirmar la entrega. Intenta de nuevo.");
  }
  revalidatePath("/[locale]/(account)/cuenta/pedidos", "layout");
}

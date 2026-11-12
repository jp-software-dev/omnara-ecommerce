"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RETURN_REASONS, returnErrorMessage } from "@/lib/returns";
import { flushEmailsSoon } from "@/lib/email-outbox";

const requestSchema = z.object({
  orderItemId: z.string().uuid(),
  reason: z.enum(RETURN_REASONS),
  details: z.string().trim().max(1000, "El detalle es demasiado largo (máximo 1000)."),
});

function revalidateReturns() {
  revalidatePath("/[locale]/(account)/cuenta/devoluciones", "layout");
  revalidatePath("/[locale]/(account)/cuenta/pedidos", "layout");
  revalidatePath("/[locale]/(admin)/admin/devoluciones", "layout");
  // A new return or a dispute queues emails for the seller / admins.
  flushEmailsSoon();
}

export async function requestReturn(input: z.input<typeof requestSchema>, locale: string) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_return", {
    p_order_item_id: parsed.data.orderItemId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  });
  if (error) throw new Error(returnErrorMessage(error.message, locale));
  revalidateReturns();
  return data;
}

// The buyer disagrees with the seller's rejection and sends it to Omnara.
export async function escalateReturn(returnId: string, note: string, locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("escalate_return", { p_id: returnId, p_note: note });
  if (error) throw new Error(returnErrorMessage(error.message, locale));
  revalidateReturns();
}

// Used by the buyer, the seller and the admin: the database decides who may post.
export async function postReturnMessage(returnId: string, body: string, locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_return_message", { p_id: returnId, p_body: body });
  if (error) throw new Error(returnErrorMessage(error.message, locale));
  revalidateReturns();
}

"use server";

import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * The Stripe session id is only ever disclosed to the buyer via the success
 * redirect, so knowing it is treated as proof of ownership — this lets guest
 * checkouts (no auth.uid()) see their own order without a new RLS policy.
 */
export async function getOrderBySessionId(sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!paymentIntentId || session.payment_status !== "paid") {
    return null;
  }

  const db = createServiceRoleClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, total_cents, currency, created_at")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  return order;
}

"use server";

import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceOrder } from "@/components/shop/order-invoice";

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
    .select(
      "id, order_number, status, total_cents, subtotal_cents, shipping_cents, discount_cents, promo_code, shipping_address_snapshot, currency, created_at, order_items(id, quantity, unit_price_cents, product_name_snapshot)"
    )
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  return order;
}

/**
 * Confirmation of a SIMULATED order. The unguessable per-order token (shown only in
 * the redirect after checkout) is the proof of ownership, exactly like the Stripe
 * session id is for real orders, so guests can see their receipt too.
 */
export async function getDemoOrder(orderId: string, token: string): Promise<InvoiceOrder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_demo_order", { p_order: orderId, p_token: token });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as unknown as InvoiceOrder;
}

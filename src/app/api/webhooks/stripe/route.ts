import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CartItemMeta = { v: string; q: number; p: number };

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment intent." }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: existingOrder } = await db
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ received: true, orderId: existingOrder.id });
  }

  const cartItems: CartItemMeta[] = JSON.parse(session.metadata?.cart_items ?? "[]");
  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Empty cart metadata." }, { status: 400 });
  }

  const userId = session.metadata?.user_id || null;

  const { data: variants, error: variantsError } = await db
    .from("product_variants")
    .select("id, size, color, product_id, products(name, vendor_id)")
    .in(
      "id",
      cartItems.map((item) => item.v)
    );

  if (variantsError || !variants) {
    return NextResponse.json({ error: "Could not load order line items." }, { status: 500 });
  }

  const subtotalCents = cartItems.reduce((sum, item) => sum + item.p * item.q, 0);
  const orderNumber = `ORD-${session.id.slice(-8).toUpperCase()}`;
  const shippingCents = Number(session.metadata?.shipping_cents ?? 0);
  const discountCents = Number(session.metadata?.discount_cents ?? 0);
  const promoCode = session.metadata?.promo_code || null;
  const shippingDetails = session.collected_information?.shipping_details ?? null;
  const shippingSnapshot = shippingDetails
    ? {
        name: shippingDetails.name,
        address: {
          line1: shippingDetails.address.line1,
          line2: shippingDetails.address.line2,
          city: shippingDetails.address.city,
          state: shippingDetails.address.state,
          postal_code: shippingDetails.address.postal_code,
          country: shippingDetails.address.country,
        },
      }
    : null;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: "paid",
      currency: session.currency?.toUpperCase() ?? "MXN",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: discountCents,
      promo_code: promoCode,
      shipping_address_snapshot: shippingSnapshot,
      total_cents: session.amount_total ?? subtotalCents,
      payment_method: "card",
      stripe_payment_intent_id: paymentIntentId,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }

  if (promoCode) {
    // Best-effort usage counter — a lost increment under a race is an
    // acceptable trade-off for not blocking order creation on it.
    const { data: promo } = await db
      .from("promo_codes")
      .select("times_used")
      .eq("code", promoCode)
      .maybeSingle();
    if (promo) {
      await db
        .from("promo_codes")
        .update({ times_used: promo.times_used + 1 })
        .eq("code", promoCode);
    }
  }

  const { data: defaultWarehouse } = await db
    .from("warehouses")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();

  for (const item of cartItems) {
    const variant = variants.find((v) => v.id === item.v);
    if (!variant) continue;

    await db.from("order_items").insert({
      order_id: order.id,
      variant_id: variant.id,
      vendor_id: variant.products?.vendor_id ?? null,
      product_name_snapshot: variant.products?.name ?? {},
      variant_attrs_snapshot: { size: variant.size, color: variant.color },
      quantity: item.q,
      unit_price_cents: item.p,
    });

    const { data: currentVariant } = await db
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", variant.id)
      .single();

    const nextStock = Math.max(0, (currentVariant?.stock_quantity ?? 0) - item.q);

    await db.from("product_variants").update({ stock_quantity: nextStock }).eq("id", variant.id);

    await db.from("inventory_movements").insert({
      variant_id: variant.id,
      warehouse_id: defaultWarehouse?.id ?? null,
      quantity_change: -item.q,
      reason: "sale",
      created_by: null,
    });
  }

  return NextResponse.json({ received: true, orderId: order.id });
}

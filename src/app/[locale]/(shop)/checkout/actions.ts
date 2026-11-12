"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import {
  getAppSettings,
  getVariantsForCheckout,
  validatePromoCode, getMyAddresses } from "@/lib/supabase/queries";
import { pickLocale, convertToUsd } from "@/lib/format";
import { computeShippingCents, FLAT_SHIPPING_MXN_CENTS } from "@/lib/shipping";

export type CheckoutItemInput = {
  variantId: string;
  quantity: number;
};

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getCheckoutContext() {
  const settings = await getAppSettings();

  // Saved addresses for a signed-in buyer (RLS: own rows); guests get none.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const addresses = user ? await getMyAddresses(user.id) : [];

  return {
    freeShippingThresholdMxnCents: settings.free_shipping_threshold_mxn_cents,
    addresses,
  };
}

export async function previewPromoCode(code: string, subtotalMxnCents: number) {
  return validatePromoCode(code, subtotalMxnCents);
}

export async function createCheckoutSession({
  items,
  locale,
  email,
  currency = "MXN",
  promoCode,
  addressId,
}: {
  items: CheckoutItemInput[];
  locale: string;
  email?: string;
  currency?: "MXN" | "USD";
  promoCode?: string;
  /** One of the buyer's saved addresses; when absent Stripe collects the address as before. */
  addressId?: string;
}) {
  if (items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A saved address is read through the signed-in user's own RLS scope AND filtered
  // by user_id, so nobody can ship an order to (or read) someone else's address.
  let shipTo: string | null = null;
  if (addressId) {
    if (!user) throw new Error("Inicia sesión para usar una dirección guardada.");
    const { data: address } = await supabase
      .from("addresses")
      .select("recipient_name, line1, line2, city, state, postal_code, country")
      .eq("id", addressId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!address) throw new Error("No se encontró la dirección elegida.");
    shipTo = JSON.stringify({
      n: address.recipient_name,
      l1: address.line1,
      l2: address.line2 ?? "",
      c: address.city,
      s: address.state,
      p: address.postal_code,
      k: address.country,
    });
    // Stripe caps a metadata value at 500 characters; the database limits keep us
    // well below, this just makes the failure explicit instead of a Stripe error.
    if (shipTo.length > 500) throw new Error("La dirección es demasiado larga.");
  }

  const variants = await getVariantsForCheckout(items.map((item) => item.variantId));
  // The client only chooses WHICH currency to pay in — the actual amount is
  // always recomputed here from the DB price + the DB exchange rate, never
  // trusted from the browser.
  const appSettings = await getAppSettings();

  const lineItems = items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.products || variant.products.status !== "active") {
      throw new Error("Uno de los productos ya no está disponible.");
    }

    const quantity = Math.max(0, Math.min(item.quantity, variant.stock_quantity));
    if (quantity <= 0) {
      throw new Error("Uno de los productos está agotado.");
    }

    const mxnCents = variant.price_override_mxn_cents ?? variant.products.base_price_mxn_cents;
    const unitAmountCents =
      currency === "USD" ? convertToUsd(mxnCents, appSettings.usd_exchange_rate) : mxnCents;

    return {
      variantId: variant.id,
      quantity,
      unitAmountCents,
      name: pickLocale(variant.products.name, locale),
    };
  });

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.unitAmountCents * item.quantity, 0);

  const freeThresholdCents =
    currency === "USD"
      ? convertToUsd(appSettings.free_shipping_threshold_mxn_cents, appSettings.usd_exchange_rate)
      : appSettings.free_shipping_threshold_mxn_cents;
  const flatShippingCents =
    currency === "USD"
      ? convertToUsd(FLAT_SHIPPING_MXN_CENTS, appSettings.usd_exchange_rate)
      : FLAT_SHIPPING_MXN_CENTS;
  const finalShippingCents = computeShippingCents(subtotalCents, freeThresholdCents, flatShippingCents);

  let discountCents = 0;
  let appliedPromoCode: string | null = null;
  if (promoCode) {
    // Re-validate server-side against the subtotal in the session's currency —
    // never trust a discount amount computed on the client.
    const validation = await validatePromoCode(promoCode, subtotalCents);
    if (validation.valid) {
      discountCents = validation.discountCents;
      appliedPromoCode = promoCode.trim().toUpperCase();
    }
  }

  const stripeLineItems = lineItems.map((item) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: { name: item.name || "Producto Omnara" },
      unit_amount: item.unitAmountCents,
    },
    quantity: item.quantity,
  }));

  if (finalShippingCents > 0) {
    stripeLineItems.push({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: { name: locale === "en" ? "Shipping" : "Envío" },
        unit_amount: finalShippingCents,
      },
      quantity: 1,
    });
  }

  const origin = await getOrigin();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: email || user?.email || undefined,
    line_items: stripeLineItems,
    success_url: `${origin}/${locale}/checkout/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/checkout`,
    metadata: {
      user_id: user?.id ?? "",
      locale,
      shipping_cents: String(finalShippingCents),
      discount_cents: String(discountCents),
      promo_code: appliedPromoCode ?? "",
      ship_to: shipTo ?? "",
      cart_items: JSON.stringify(
        lineItems.map((item) => ({
          v: item.variantId,
          q: item.quantity,
          p: item.unitAmountCents,
        }))
      ),
    },
  };

  // With a saved address we already know where it ships; otherwise Stripe asks, as before.
  if (!shipTo) {
    sessionParams.shipping_address_collection = { allowed_countries: ["MX", "US"] };
  }

  if (discountCents > 0) {
    const coupon = await getStripe().coupons.create({
      amount_off: discountCents,
      currency: currency.toLowerCase(),
      duration: "once",
      name: appliedPromoCode ?? undefined,
    });
    sessionParams.discounts = [{ coupon: coupon.id }];
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("No se pudo crear la sesión de pago.");
  }

  redirect(session.url);
}

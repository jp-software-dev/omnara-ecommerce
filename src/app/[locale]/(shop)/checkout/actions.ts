"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import {
  getAppSettings,
  getMyAddresses,
  getVariantsForCheckout,
  validatePromoCode,
} from "@/lib/supabase/queries";
import { addressSchema, type AddressInput } from "@/lib/addresses";
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
    signedIn: Boolean(user),
    // Without a Stripe key the checkout can run as a simulated payment, but only
    // while an admin has left the demo switch on in app_settings.
    demoPayments: !process.env.STRIPE_SECRET_KEY && settings.demo_payments_enabled,
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
  demoAddress,
}: {
  items: CheckoutItemInput[];
  locale: string;
  email?: string;
  currency?: "MXN" | "USD";
  promoCode?: string;
  /** One of the buyer's saved addresses; when absent Stripe collects the address as before. */
  addressId?: string;
  /** Shipping address typed on the page; only used by the simulated payment. */
  demoAddress?: AddressInput;
}) {
  if (items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  // No Stripe key: run the simulated payment instead (the database refuses it
  // unless the demo switch is on). A configured key always uses Stripe.
  if (!process.env.STRIPE_SECRET_KEY) {
    return placeDemoOrder({ items, locale, email, currency, promoCode, addressId, demoAddress });
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
      mxnCents,
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
    // Re-validate server-side — never trust a discount amount computed on the
    // client. Codes are valued in MXN, so check against the MXN subtotal and convert
    // the result when paying in USD (a fixed code used to be applied as if its MXN
    // cents were USD cents).
    const subtotalMxnCents = lineItems.reduce((sum, item) => sum + item.mxnCents * item.quantity, 0);
    const validation = await validatePromoCode(promoCode, subtotalMxnCents);
    if (validation.valid) {
      discountCents =
        currency === "USD"
          ? convertToUsd(validation.discountCents, appSettings.usd_exchange_rate)
          : validation.discountCents;
      discountCents = Math.min(discountCents, subtotalCents);
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

// ---------------------------------------------------------------------------
// Simulated payment (educational demo). The database function place_demo_order
// recomputes prices, shipping, discount and stock itself and refuses to run unless
// the demo switch is on, so nothing here is trusted: this only gathers the shipping
// address and turns the database's errors into readable messages.
function demoOrderError(message: string, locale: string) {
  const en = locale === "en";
  const known: [string, string, string][] = [
    ["disabled", "Los pagos no están configurados en este momento.", "Payments are not available right now."],
    ["Out of stock", "Uno de los productos está agotado.", "One of the products is sold out."],
    ["Product not available", "Uno de los productos ya no está disponible.", "One of the products is no longer available."],
    ["Too many demo orders", "Hiciste muchos pedidos de prueba. Intenta de nuevo en una hora.", "You placed many test orders. Try again in an hour."],
    ["valid email", "Escribe un correo válido para tu pedido.", "Enter a valid email for your order."],
    ["Invalid quantity", "La cantidad de un producto no es válida.", "A product quantity is not valid."],
  ];
  const hit = known.find(([needle]) => message.includes(needle));
  return hit ? (en ? hit[2] : hit[1]) : en ? "We couldn't place the order. Try again." : "No pudimos crear el pedido. Intenta de nuevo.";
}

async function placeDemoOrder({
  items,
  locale,
  email,
  currency = "MXN",
  promoCode,
  addressId,
  demoAddress,
}: {
  items: CheckoutItemInput[];
  locale: string;
  email?: string;
  currency?: "MXN" | "USD";
  promoCode?: string;
  addressId?: string;
  demoAddress?: AddressInput;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type Ship = {
    name: string | null;
    address: {
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  let ship: Ship;

  if (addressId) {
    if (!user) throw new Error("Inicia sesión para usar una dirección guardada.");
    const { data: address } = await supabase
      .from("addresses")
      .select("recipient_name, line1, line2, city, state, postal_code, country")
      .eq("id", addressId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!address) throw new Error("No se encontró la dirección elegida.");
    ship = {
      name: address.recipient_name,
      address: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
      },
    };
  } else if (demoAddress) {
    const parsed = addressSchema.safeParse(demoAddress);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "La dirección no es válida.");
    const a = parsed.data;
    ship = {
      name: a.recipientName,
      address: {
        line1: a.line1,
        line2: a.line2 || null,
        city: a.city,
        state: a.state,
        postal_code: a.postalCode,
        country: a.country,
      },
    };
  } else {
    throw new Error("Escribe la dirección de envío.");
  }

  const { data, error } = await supabase.rpc("place_demo_order", {
    p_items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_currency: currency,
    p_email: email ?? "",
    p_promo: promoCode ?? "",
    p_ship: ship,
  });
  if (error) throw new Error(demoOrderError(error.message, locale));

  const result = data as { order_id: string; token: string } | null;
  if (!result?.order_id || !result.token) {
    throw new Error(demoOrderError("", locale));
  }
  redirect(`/${locale}/checkout/confirmacion?demo_order=${result.order_id}&token=${result.token}`);
}

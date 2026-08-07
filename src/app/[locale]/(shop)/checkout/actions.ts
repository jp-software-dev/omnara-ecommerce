"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings, getVariantsForCheckout } from "@/lib/supabase/queries";
import { pickLocale, convertToUsd } from "@/lib/format";

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

export async function createCheckoutSession({
  items,
  locale,
  email,
  currency = "MXN",
}: {
  items: CheckoutItemInput[];
  locale: string;
  email?: string;
  currency?: "MXN" | "USD";
}) {
  if (items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const variants = await getVariantsForCheckout(items.map((item) => item.variantId));
  // The client only chooses WHICH currency to pay in — the actual amount is
  // always recomputed here from the DB price + the DB exchange rate, never
  // trusted from the browser.
  const appSettings = currency === "USD" ? await getAppSettings() : null;

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
      currency === "USD" ? convertToUsd(mxnCents, appSettings!.usd_exchange_rate) : mxnCents;

    return {
      variantId: variant.id,
      quantity,
      unitAmountCents,
      name: pickLocale(variant.products.name, locale),
    };
  });

  const origin = await getOrigin();

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email || user?.email || undefined,
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: { name: item.name || "Producto Omnara" },
        unit_amount: item.unitAmountCents,
      },
      quantity: item.quantity,
    })),
    shipping_address_collection: { allowed_countries: ["MX", "US"] },
    success_url: `${origin}/${locale}/checkout/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/checkout`,
    metadata: {
      user_id: user?.id ?? "",
      locale,
      cart_items: JSON.stringify(
        lineItems.map((item) => ({
          v: item.variantId,
          q: item.quantity,
          p: item.unitAmountCents,
        }))
      ),
    },
  });

  if (!session.url) {
    throw new Error("No se pudo crear la sesión de pago.");
  }

  redirect(session.url);
}

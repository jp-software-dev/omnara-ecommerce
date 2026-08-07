"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { DemoBanner } from "@/components/shop/demo-banner";
import { formatPrice, convertToUsd } from "@/lib/format";
import { cartSubtotalMxnCents, useCartHydrated, useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { createCheckoutSession } from "./actions";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const items = useCartStore((state) => state.items);
  const hydrated = useCartHydrated();
  const currency = useCurrencyStore((state) => state.currency);
  const usdExchangeRate = useCurrencyStore((state) => state.usdExchangeRate);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = cartSubtotalMxnCents(items);
  const display = (mxnCents: number) =>
    formatPrice(
      currency === "USD" ? convertToUsd(mxnCents, usdExchangeRate) : mxnCents,
      currency,
      locale
    );
  const t = {
    title: locale === "en" ? "Checkout" : "Pagar",
    email: locale === "en" ? "Email" : "Correo electrónico",
    pay: locale === "en" ? "Pay (demo mode)" : "Pagar (modo demo)",
    paying: locale === "en" ? "Redirecting to Stripe..." : "Redirigiendo a Stripe...",
    subtotal: locale === "en" ? "Subtotal" : "Subtotal",
    empty: locale === "en" ? "Your bag is empty." : "Tu carrito está vacío.",
    browse: locale === "en" ? "Browse products" : "Ver productos",
  };

  async function handlePay() {
    setLoading(true);
    try {
      await createCheckoutSession({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        locale,
        email,
        currency,
      });
    } catch (error) {
      setLoading(false);
      toast.error(
        error instanceof Error ? error.message : "No se pudo iniciar el pago."
      );
    }
  }

  if (!hydrated) {
    return <main className="flex-1 px-4 py-8" />;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <p className="text-muted-foreground">{t.empty}</p>
        <Button
          className="mt-2"
          nativeButton={false}
          render={<Link href="/">{t.browse}</Link>}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t.title}</h1>
      <DemoBanner locale={locale} />

      <ul className="mt-6 divide-y">
        {items.map((item) => (
          <li
            key={item.variantId}
            className="flex items-center justify-between gap-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground">
                {[item.color, item.size].filter(Boolean).join(" · ")} × {item.quantity}
              </p>
            </div>
            <p className="font-medium">{display(item.unitPriceMxnCents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-between border-t pt-4 text-base font-semibold">
        <span>{t.subtotal}</span>
        <span>{display(subtotal)}</span>
      </div>

      <Field className="mt-6">
        <FieldLabel htmlFor="checkout-email">{t.email}</FieldLabel>
        <Input
          id="checkout-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
        />
      </Field>

      <Button size="lg" className="mt-6 w-full" onClick={handlePay} disabled={loading}>
        {loading ? t.paying : t.pay}
      </Button>
    </main>
  );
}

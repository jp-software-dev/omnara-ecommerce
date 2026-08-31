"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { DemoBanner } from "@/components/shop/demo-banner";
import { formatPrice, convertToUsd } from "@/lib/format";
import { FLAT_SHIPPING_MXN_CENTS } from "@/lib/shipping";
import { cartSubtotalMxnCents, useCartHydrated, useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { createCheckoutSession, getCheckoutContext, previewPromoCode } from "./actions";

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
  const [freeShippingThresholdMxnCents, setFreeShippingThresholdMxnCents] = useState<number | null>(
    null
  );
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountMxnCents: number } | null>(
    null
  );

  useEffect(() => {
    getCheckoutContext().then((ctx) => setFreeShippingThresholdMxnCents(ctx.freeShippingThresholdMxnCents));
  }, []);

  const subtotal = cartSubtotalMxnCents(items);
  const shippingMxnCents =
    freeShippingThresholdMxnCents !== null && subtotal >= freeShippingThresholdMxnCents
      ? 0
      : FLAT_SHIPPING_MXN_CENTS;
  const discountMxnCents = appliedPromo?.discountMxnCents ?? 0;
  const totalMxnCents = Math.max(0, subtotal - discountMxnCents) + shippingMxnCents;

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
    shipping: locale === "en" ? "Shipping" : "Envío",
    free: locale === "en" ? "Free" : "Gratis",
    discount: locale === "en" ? "Discount" : "Descuento",
    total: locale === "en" ? "Total" : "Total",
    promoLabel: locale === "en" ? "Promo code" : "Código promocional",
    apply: locale === "en" ? "Apply" : "Aplicar",
    checking: locale === "en" ? "Checking..." : "Verificando...",
    remove: locale === "en" ? "Remove" : "Quitar",
    promoApplied: locale === "en" ? "Code applied" : "Código aplicado",
    promoInvalid:
      locale === "en" ? "That code isn't valid for this order." : "Ese código no es válido para este pedido.",
    empty: locale === "en" ? "Your bag is empty." : "Tu carrito está vacío.",
    browse: locale === "en" ? "Browse products" : "Ver productos",
  };

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    try {
      const result = await previewPromoCode(promoInput.trim(), subtotal);
      if (result.valid) {
        setAppliedPromo({ code: promoInput.trim().toUpperCase(), discountMxnCents: result.discountCents });
        toast.success(t.promoApplied);
      } else {
        setAppliedPromo(null);
        toast.error(t.promoInvalid);
      }
    } finally {
      setPromoChecking(false);
    }
  }

  async function handlePay() {
    setLoading(true);
    try {
      await createCheckoutSession({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        locale,
        email,
        currency,
        promoCode: appliedPromo?.code,
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

      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.subtotal}</span>
          <span>{display(subtotal)}</span>
        </div>
        {appliedPromo ? (
          <div className="flex justify-between text-primary">
            <span>
              {t.discount} ({appliedPromo.code})
            </span>
            <span>-{display(discountMxnCents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.shipping}</span>
          <span>{shippingMxnCents === 0 ? t.free : display(shippingMxnCents)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>{t.total}</span>
          <span>{display(totalMxnCents)}</span>
        </div>
      </div>

      <Field className="mt-6">
        <FieldLabel htmlFor="checkout-promo">{t.promoLabel}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="checkout-promo"
            value={promoInput}
            onChange={(event) => setPromoInput(event.target.value)}
            placeholder="BIENVENIDO10"
            disabled={Boolean(appliedPromo)}
          />
          {appliedPromo ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAppliedPromo(null);
                setPromoInput("");
              }}
            >
              {t.remove}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handleApplyPromo} disabled={promoChecking}>
              {promoChecking ? t.checking : t.apply}
            </Button>
          )}
        </div>
      </Field>

      <Field className="mt-4">
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

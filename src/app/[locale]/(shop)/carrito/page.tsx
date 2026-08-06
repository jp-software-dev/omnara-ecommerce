"use client";

import { use } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cartSubtotalMxnCents, useCartHydrated, useCartStore } from "@/stores/cart-store";

export default function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Avoids a hydration flash: localStorage isn't available on the server.
  const hydrated = useCartHydrated();

  const subtotal = cartSubtotalMxnCents(items);
  const t = {
    title: locale === "en" ? "Your bag" : "Tu carrito",
    empty: locale === "en" ? "Your bag is empty" : "Tu carrito está vacío",
    emptyHint:
      locale === "en"
        ? "Explore the catalog to find something you like."
        : "Explora el catálogo para encontrar algo que te guste.",
    browse: locale === "en" ? "Browse products" : "Ver productos",
    subtotal: locale === "en" ? "Subtotal" : "Subtotal",
    shipping: locale === "en" ? "Shipping" : "Envío",
    shippingNote:
      locale === "en" ? "Calculated at checkout" : "Se calcula en el checkout",
    total: locale === "en" ? "Total" : "Total",
    checkout: locale === "en" ? "Checkout" : "Ir a pagar",
    remove: locale === "en" ? "Remove" : "Quitar",
  };

  function handleCheckout() {
    toast(
      locale === "en"
        ? "Checkout connects with Stripe in the next phase."
        : "El checkout se conecta con Stripe en la siguiente fase."
    );
  }

  if (!hydrated) {
    return <main className="flex-1 px-4 py-8" />;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t.empty}</h1>
        <p className="text-muted-foreground">{t.emptyHint}</p>
        <Button
          className="mt-2"
          nativeButton={false}
          render={<Link href="/">{t.browse}</Link>}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t.title}</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-4 py-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatPrice(item.unitPriceMxnCents, "MXN", locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border">
                    <button
                      type="button"
                      aria-label="-"
                      className="flex size-9 items-center justify-center disabled:opacity-40"
                      disabled={item.quantity <= 1}
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="+"
                      className="flex size-9 items-center justify-center disabled:opacity-40"
                      disabled={item.quantity >= item.stockQuantity}
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={t.remove}
                    className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => removeItem(item.variantId)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-4 rounded-lg border p-5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.subtotal}</span>
            <span className="font-medium">{formatPrice(subtotal, "MXN", locale)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.shipping}</span>
            <span className="text-muted-foreground">{t.shippingNote}</span>
          </div>
          <div className="flex justify-between border-t pt-4 text-base font-semibold">
            <span>{t.total}</span>
            <span>{formatPrice(subtotal, "MXN", locale)}</span>
          </div>
          <Button size="lg" className="w-full" onClick={handleCheckout}>
            {t.checkout}
          </Button>
        </aside>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findCartChanges, type CartChange, type CurrentVariant } from "@/lib/cart-prices";
import { convertToUsd, formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { getCurrentVariants } from "@/app/[locale]/(shop)/carrito/actions";

/**
 * Warns when something in the cart changed since it was added (price, stock, availability).
 * The order is charged at the current price, so this is shown before paying; one button
 * brings the cart in line with the shop.
 */
export function CartPriceAlert({ locale }: { locale: string }) {
  const en = locale === "en";
  const items = useCartStore((state) => state.items);
  const syncWith = useCartStore((state) => state.syncWith);
  const currency = useCurrencyStore((state) => state.currency);
  const usdExchangeRate = useCurrencyStore((state) => state.usdExchangeRate);
  const [current, setCurrent] = useState<CurrentVariant[] | null>(null);

  // Ask again only when the set of variants changes, not on every quantity click.
  const idsKey = useMemo(() => items.map((item) => item.variantId).sort().join(","), [items]);

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    getCurrentVariants(idsKey.split(","))
      .then((result) => {
        if (!cancelled) setCurrent(result);
      })
      .catch(() => {
        // the alert is a convenience: if the check fails the checkout still charges the right price
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const changes: CartChange[] = useMemo(
    () => (current && idsKey ? findCartChanges(items, current) : []),
    [items, current, idsKey]
  );
  if (changes.length === 0) return null;

  const money = (mxnCents: number) =>
    formatPrice(currency === "USD" ? convertToUsd(mxnCents, usdExchangeRate) : mxnCents, currency, locale);

  function describe(change: CartChange): string {
    if (change.kind === "price") {
      const verb = change.toMxnCents > change.fromMxnCents ? (en ? "went up" : "subió") : en ? "went down" : "bajó";
      return en
        ? `${change.name}: the price ${verb} from ${money(change.fromMxnCents)} to ${money(change.toMxnCents)}.`
        : `${change.name}: el precio ${verb} de ${money(change.fromMxnCents)} a ${money(change.toMxnCents)}.`;
    }
    if (change.kind === "stock") {
      return en
        ? `${change.name}: only ${change.toQuantity} left (you had ${change.fromQuantity}).`
        : `${change.name}: solo quedan ${change.toQuantity} (tenías ${change.fromQuantity}).`;
    }
    return en ? `${change.name}: no longer available.` : `${change.name}: ya no está disponible.`;
  }

  return (
    <div role="alert" className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 shrink-0" />
        {en ? "Something in your bag changed" : "Algo de tu carrito cambió"}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {changes.map((change, index) => (
          <li key={`${change.variantId}-${change.kind}-${index}`}>{describe(change)}</li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground">
        {en ? "You are always charged the current price." : "Siempre se cobra el precio actual."}
      </p>
      <Button size="sm" className="mt-3" onClick={() => current && syncWith(current)}>
        {en ? "Update my bag" : "Actualizar mi carrito"}
      </Button>
    </div>
  );
}

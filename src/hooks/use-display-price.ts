"use client";

import { useCurrencyStore } from "@/stores/currency-store";
import { formatPrice, convertToUsd } from "@/lib/format";

export function useDisplayPrice(mxnCents: number, locale: string) {
  const currency = useCurrencyStore((state) => state.currency);
  const rate = useCurrencyStore((state) => state.usdExchangeRate);

  const cents = currency === "USD" ? convertToUsd(mxnCents, rate) : mxnCents;
  return formatPrice(cents, currency, locale);
}

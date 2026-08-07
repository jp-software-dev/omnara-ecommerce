"use client";

import { useCurrencyHydrated, useCurrencyStore } from "@/stores/currency-store";

export function CurrencySwitcher() {
  const hydrated = useCurrencyHydrated();
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);

  return (
    <button
      type="button"
      onClick={() => setCurrency(currency === "MXN" ? "USD" : "MXN")}
      className="rounded-md px-2 py-1.5 text-xs font-semibold tabular-nums hover:bg-muted"
      aria-label="Cambiar moneda / Switch currency"
      disabled={!hydrated}
    >
      {hydrated ? currency : "MXN"}
    </button>
  );
}

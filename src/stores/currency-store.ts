import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Currency = "MXN" | "USD";

type CurrencyState = {
  currency: Currency;
  usdExchangeRate: number;
  setCurrency: (currency: Currency) => void;
  setUsdExchangeRate: (rate: number) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "MXN",
      usdExchangeRate: 17,
      setCurrency: (currency) => set({ currency }),
      setUsdExchangeRate: (usdExchangeRate) => set({ usdExchangeRate }),
    }),
    {
      name: "omnara-currency",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // Only the user's currency choice is worth persisting — the exchange
      // rate always comes fresh from app_settings on each page load.
      partialize: (state) => ({ currency: state.currency }),
    }
  )
);

export function useCurrencyHydrated() {
  return useSyncExternalStore(
    (callback) => useCurrencyStore.persist.onFinishHydration(callback),
    () => useCurrencyStore.persist.hasHydrated(),
    () => false
  );
}

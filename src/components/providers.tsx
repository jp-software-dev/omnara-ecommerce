"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme-provider";
import { useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useCompareStore } from "@/stores/compare-store";

// Toasts only appear after an action, so the library is fetched after the first paint
// instead of being part of the first JavaScript every page downloads.
const Toaster = dynamic(() => import("@/components/ui/sonner").then((module) => module.Toaster), {
  ssr: false,
});

export function Providers({
  children,
  usdExchangeRate,
}: {
  children: React.ReactNode;
  usdExchangeRate: number;
}) {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useCurrencyStore.persist.rehydrate();
    useCompareStore.persist.rehydrate();
    useCurrencyStore.setState({ usdExchangeRate });
  }, [usdExchangeRate]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

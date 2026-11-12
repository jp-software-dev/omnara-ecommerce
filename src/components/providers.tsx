"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useCompareStore } from "@/stores/compare-store";

export function Providers({
  children,
  usdExchangeRate,
}: {
  children: React.ReactNode;
  usdExchangeRate: number;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  );

  useEffect(() => {
    useCartStore.persist.rehydrate();
    useCurrencyStore.persist.rehydrate();
    useCompareStore.persist.rehydrate();
    useCurrencyStore.setState({ usdExchangeRate });
  }, [usdExchangeRate]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

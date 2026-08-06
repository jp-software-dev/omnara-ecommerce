import type { Json } from "@/lib/supabase/types";

export type LocalizedText = { es: string; en: string };

export function pickLocale(value: Json, locale: string): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, Json | undefined>;
    const picked = record[locale] ?? record.es;
    return typeof picked === "string" ? picked : "";
  }
  return "";
}

export function formatPrice(cents: number, currency: "MXN" | "USD", locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function convertToUsd(mxnCents: number, exchangeRate: number) {
  return Math.round(mxnCents / exchangeRate);
}

"use client";

import { useDisplayPrice } from "@/hooks/use-display-price";

export function ProductPrice({
  mxnCents,
  locale,
  className,
}: {
  mxnCents: number;
  locale: string;
  className?: string;
}) {
  const price = useDisplayPrice(mxnCents, locale);
  return <span className={className}>{price}</span>;
}

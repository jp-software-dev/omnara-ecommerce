"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Json } from "@/lib/supabase/types";
import { pickLocale } from "@/lib/format";
import { useDisplayPrice } from "@/hooks/use-display-price";
import { WishlistButton } from "@/components/shop/wishlist-button";

export type ProductCardData = {
  id: string;
  slug: string;
  name: Json;
  base_price_mxn_cents: number;
  product_images: { url: string; position: number }[];
};

export function ProductCard({
  product,
  locale,
}: {
  product: ProductCardData;
  locale: string;
}) {
  const image = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  const price = useDisplayPrice(product.base_price_mxn_cents, locale);

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-transparent p-2 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-lg hover:shadow-foreground/5"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={pickLocale(product.name, locale)}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <WishlistButton
          productId={product.id}
          locale={locale}
          className="absolute right-2 top-2"
        />
      </div>
      <div className="space-y-1 px-0.5">
        <p className="truncate text-sm font-medium">{pickLocale(product.name, locale)}</p>
        <p className="text-sm font-semibold text-foreground">{price}</p>
      </div>
    </Link>
  );
}

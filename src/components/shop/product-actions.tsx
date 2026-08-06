"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Variant = {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
};

export function ProductActions({
  variants,
  locale,
}: {
  variants: Variant[];
  locale: string;
}) {
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s)))],
    [variants]
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))],
    [variants]
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null);

  const selectedVariant = useMemo(
    () =>
      variants.find(
        (v) =>
          (selectedSize ? v.size === selectedSize : v.size === null) &&
          (selectedColor ? v.color === selectedColor : v.color === null)
      ) ?? variants[0],
    [variants, selectedSize, selectedColor]
  );

  const outOfStock = !selectedVariant || selectedVariant.stock_quantity === 0;
  const lowStock =
    selectedVariant &&
    selectedVariant.stock_quantity > 0 &&
    selectedVariant.stock_quantity <= selectedVariant.low_stock_threshold;

  function handleAddToCart() {
    toast(
      locale === "en"
        ? "Cart connects in the next phase."
        : "El carrito se conecta en la siguiente fase."
    );
  }

  return (
    <div className="space-y-5">
      {colors.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">{locale === "en" ? "Color" : "Color"}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  selectedColor === color && "border-foreground bg-foreground text-background"
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">{locale === "en" ? "Size" : "Talla"}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "size-10 rounded-md border text-sm",
                  selectedSize === size && "border-foreground bg-foreground text-background"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {lowStock ? (
        <p className="text-sm font-medium text-destructive">
          {locale === "en"
            ? `Only ${selectedVariant.stock_quantity} left in stock`
            : `Solo quedan ${selectedVariant.stock_quantity} disponibles`}
        </p>
      ) : null}

      <Button size="lg" className="w-full" disabled={outOfStock} onClick={handleAddToCart}>
        {outOfStock
          ? locale === "en"
            ? "Out of stock"
            : "Agotado"
          : locale === "en"
            ? "Add to bag"
            : "Agregar al carrito"}
      </Button>
    </div>
  );
}

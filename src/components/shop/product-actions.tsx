"use client";

import { useMemo, useState } from "react";
import { Check, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cartItemCount, useCartStore } from "@/stores/cart-store";
import { AddToCartModal } from "@/components/shop/add-to-cart-modal";
import { SizeGuideModal } from "@/components/shop/size-guide-modal";
import { getColorSwatch } from "@/lib/color-swatches";

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
  productSlug,
  productName,
  productImage,
  unitPriceMxnCents,
  categorySlug,
}: {
  variants: Variant[];
  locale: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  unitPriceMxnCents: number;
  categorySlug?: string | null;
}) {
  const isFootwear = categorySlug === "calzado";

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

  const sizeStock = useMemo(() => {
    const map = new Map<string, number>();
    for (const size of sizes) {
      const variant = variants.find(
        (v) => v.size === size && (selectedColor ? v.color === selectedColor : true)
      );
      map.set(size, variant?.stock_quantity ?? 0);
    }
    return map;
  }, [sizes, variants, selectedColor]);

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

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [justAdded, setJustAdded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleAddToCart() {
    if (!selectedVariant || outOfStock) return;

    addItem({
      variantId: selectedVariant.id,
      productSlug,
      name: productName,
      image: productImage,
      size: selectedVariant.size,
      color: selectedVariant.color,
      unitPriceMxnCents,
      stockQuantity: selectedVariant.stock_quantity,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-5">
      {colors.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">
            {locale === "en" ? "Color" : "Color"}
            {selectedColor ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {selectedColor}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const selected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  aria-pressed={selected}
                  aria-label={color}
                  title={color}
                  className={cn(
                    "size-9 rounded-full border-2 p-0.5 transition-[border-color] duration-(--duration-fast) ease-(--ease-functional)",
                    selected ? "border-foreground" : "border-transparent hover:border-border"
                  )}
                >
                  <span
                    className="block size-full rounded-full ring-1 ring-border"
                    style={{ backgroundColor: getColorSwatch(color) }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {lowStock ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-500">
          <Hourglass className="size-4" />
          {locale === "en"
            ? `Only ${selectedVariant.stock_quantity} left in stock`
            : `Solo quedan ${selectedVariant.stock_quantity} disponibles`}
        </p>
      ) : null}

      {sizes.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">
              {locale === "en" ? "Size" : "Talla"}
              {isFootwear && selectedSize ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {locale === "en" ? "· selected: " : "· seleccionada: "}
                  {selectedSize}
                </span>
              ) : null}
            </p>
            <SizeGuideModal categorySlug={categorySlug} locale={locale} />
          </div>

          {isFootwear ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {sizes.map((size) => {
                const available = (sizeStock.get(size) ?? 0) > 0;
                const selected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selected}
                    aria-label={
                      available
                        ? size
                        : `${size} — ${locale === "en" ? "out of stock" : "agotado"}`
                    }
                    className={cn(
                      "relative h-11 rounded-lg border text-sm font-medium transition-[border-color,color] duration-(--duration-fast) ease-(--ease-functional)",
                      available
                        ? selected
                          ? "border-2 border-foreground"
                          : "border-border hover:border-foreground/60"
                        : "cursor-not-allowed border-border/50 text-muted-foreground/50 line-through"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const available = (sizeStock.get(size) ?? 0) > 0;
                const selected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selected}
                    aria-label={
                      available
                        ? size
                        : `${size} — ${locale === "en" ? "out of stock" : "agotado"}`
                    }
                    className={cn(
                      "size-10 rounded-lg border text-sm font-medium transition-[border-color,color] duration-(--duration-fast) ease-(--ease-functional)",
                      available
                        ? selected
                          ? "border-2 border-foreground"
                          : "border-border hover:border-foreground/60"
                        : "cursor-not-allowed border-border/50 text-muted-foreground/50 line-through"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <Button
        size="lg"
        className={cn("w-full transition-colors duration-200", justAdded && "bg-green-600 hover:bg-green-600")}
        disabled={outOfStock}
        onClick={handleAddToCart}
      >
        {justAdded ? (
          <span className="flex items-center gap-1.5">
            <Check className="size-4" />
            {locale === "en" ? "Added" : "Agregado"}
          </span>
        ) : outOfStock ? (
          locale === "en" ? (
            "Out of stock"
          ) : (
            "Agotado"
          )
        ) : locale === "en" ? (
          "Add to bag"
        ) : (
          "Agregar al carrito"
        )}
      </Button>

      {selectedVariant ? (
        <AddToCartModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          locale={locale}
          productName={productName}
          productImage={productImage}
          size={selectedVariant.size}
          color={selectedVariant.color}
          unitPriceMxnCents={unitPriceMxnCents}
          cartItemCount={cartItemCount(cartItems)}
        />
      ) : null}
    </div>
  );
}

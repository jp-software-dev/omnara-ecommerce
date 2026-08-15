"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { AddToCartModal } from "@/components/shop/add-to-cart-modal";

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
          <p className="mb-2 text-sm font-medium">{locale === "en" ? "Color" : "Color"}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
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
          <p className="mb-2 text-sm font-medium">
            {locale === "en" ? "Size" : "Talla"}
            {isFootwear && selectedSize ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                {locale === "en" ? "· selected: " : "· seleccionada: "}
                {selectedSize}
              </span>
            ) : null}
          </p>

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
                      "relative h-11 rounded-lg border text-sm font-medium transition-all",
                      available
                        ? selected
                          ? "border-transparent bg-brand-gradient text-white shadow-sm"
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
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "size-10 rounded-md border text-sm transition-colors",
                    selectedSize === size && "border-foreground bg-foreground text-background"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {lowStock ? (
        <p className="text-sm font-medium text-destructive">
          {locale === "en"
            ? `Only ${selectedVariant.stock_quantity} left in stock`
            : `Solo quedan ${selectedVariant.stock_quantity} disponibles`}
        </p>
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
        />
      ) : null}
    </div>
  );
}

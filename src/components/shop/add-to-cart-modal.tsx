"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useDisplayPrice } from "@/hooks/use-display-price";

export function AddToCartModal({
  open,
  onOpenChange,
  locale,
  productName,
  productImage,
  size,
  color,
  unitPriceMxnCents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  productName: string;
  productImage: string | null;
  size: string | null;
  color: string | null;
  unitPriceMxnCents: number;
}) {
  const price = useDisplayPrice(unitPriceMxnCents, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 right-4 left-auto max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 sm:top-6 sm:right-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-gradient text-white">
              <Check className="size-3.5" />
            </span>
            {locale === "en" ? "Added to your bag" : "Agregado a tu carrito"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {productImage ? (
              <Image src={productImage} alt="" fill sizes="80px" className="object-cover" />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <p className="truncate text-sm font-medium">{productName}</p>
            {size || color ? (
              <p className="text-sm text-muted-foreground">
                {[color, size ? (locale === "en" ? `Size ${size}` : `Talla ${size}`) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold">{price}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="lg"
            className="w-full"
            render={
              <Link href="/checkout" onClick={() => onOpenChange(false)}>
                {locale === "en" ? "Checkout" : "Comprar"}
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            render={
              <Link href="/carrito" onClick={() => onOpenChange(false)}>
                {locale === "en" ? "View bag" : "Ver bolsa de compra"}
              </Link>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

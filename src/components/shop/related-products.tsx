"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";

export function RelatedProducts({
  products,
  locale,
}: {
  products: ProductCardData[];
  locale: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="border-t pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold tracking-tight">
          {locale === "en" ? "You might also like" : "También te puede interesar"}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={locale === "en" ? "Scroll left" : "Desplazar a la izquierda"}
            className="flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={locale === "en" ? "Scroll right" : "Desplazar a la derecha"}
            className="flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="w-40 shrink-0 snap-start sm:w-48">
            <ProductCard product={product} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}

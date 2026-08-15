"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductLightbox } from "@/components/shop/product-lightbox";

type GalleryImage = { url: string; position: number; alt_text: string | null };

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const current = sorted[active];
  const total = sorted.length;

  function goPrev() {
    setActive((i) => (i - 1 + total) % total);
  }
  function goNext() {
    setActive((i) => (i + 1) % total);
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="flex gap-2.5 overflow-x-auto pb-1 sm:max-h-[560px] sm:flex-col sm:overflow-y-auto sm:overflow-x-visible sm:pb-0 sm:pr-1">
        {sorted.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`${productName} — vista ${index + 1}`}
            aria-current={index === active}
            className={cn(
              "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-all sm:size-20",
              index === active
                ? "border-transparent shadow-[0_0_0_2px_var(--brand-purple)]"
                : "border-border/60 opacity-75 hover:opacity-100 hover:border-border"
            )}
          >
            <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>

      <div className="group relative aspect-square flex-1 overflow-hidden rounded-xl bg-muted">
        {current ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ampliar imagen de ${productName}`}
            className="absolute inset-0 size-full cursor-zoom-in"
          >
            <Image
              src={current.url}
              alt={current.alt_text ?? productName}
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ) : null}

        <div className="pointer-events-none absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          <Expand className="size-4" />
        </div>

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground opacity-0 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:border-transparent hover:bg-brand-gradient hover:text-white active:scale-95 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente imagen"
              className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground opacity-0 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:border-transparent hover:bg-brand-gradient hover:text-white active:scale-95 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>

            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((image, index) => (
                <span
                  key={image.url}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    index === active ? "w-5 bg-brand-gradient" : "w-1.5 bg-background/70"
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {lightboxOpen ? (
        <ProductLightbox
          images={sorted}
          index={active}
          productName={productName}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setActive}
        />
      ) : null}
    </div>
  );
}

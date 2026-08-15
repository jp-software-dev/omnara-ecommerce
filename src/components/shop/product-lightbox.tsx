"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type LightboxImage = { url: string; alt_text: string | null };

export function ProductLightbox({
  images,
  index,
  productName,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[];
  index: number;
  productName: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const total = images.length;
  const current = images[index];

  const goPrev = useCallback(
    () => onNavigate((index - 1 + total) % total),
    [index, total, onNavigate]
  );
  const goNext = useCallback(() => onNavigate((index + 1) % total), [index, total, onNavigate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={productName}
      className="animate-lightbox-in fixed inset-0 z-[100] flex flex-col bg-background/98 backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium tabular-nums text-foreground">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-brand-gradient hover:text-white sm:size-11"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2 pb-4 sm:px-4">
        {total > 1 ? (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Imagen anterior"
            className="absolute left-1 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg transition-all hover:scale-105 hover:bg-brand-gradient hover:text-white active:scale-95 sm:left-4 sm:size-14"
          >
            <ChevronLeft className="size-6 sm:size-7" />
          </button>
        ) : null}

        <div className="relative h-full w-full max-w-5xl">
          <Image
            src={current.url}
            alt={current.alt_text ?? productName}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {total > 1 ? (
          <button
            type="button"
            onClick={goNext}
            aria-label="Siguiente imagen"
            className="absolute right-1 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg transition-all hover:scale-105 hover:bg-brand-gradient hover:text-white active:scale-95 sm:right-4 sm:size-14"
          >
            <ChevronRight className="size-6 sm:size-7" />
          </button>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-4">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => onNavigate(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={cn(
                "relative size-12 shrink-0 overflow-hidden rounded-md border transition-colors sm:size-14",
                i === index ? "border-transparent ring-2 ring-brand-purple" : "border-border opacity-70 hover:opacity-100"
              )}
            >
              <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

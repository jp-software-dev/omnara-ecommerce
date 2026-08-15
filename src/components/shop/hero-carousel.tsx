"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/format";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  slug: string;
  name: Json;
  imageUrl: string | null;
};

const AUTOPLAY_MS = 5000;

export function HeroCarousel({ slides, locale }: { slides: HeroSlide[]; locale: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const goPrev = () => setIndex((current) => (current - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((current) => (current + 1) % slides.length);

  return (
    <div
      className="group relative aspect-[16/7] w-full overflow-hidden bg-muted sm:aspect-[16/5]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, slideIndex) => (
        <Link
          key={slide.id}
          href={`/categoria/${slide.slug}`}
          aria-hidden={slideIndex !== index}
          tabIndex={slideIndex === index ? 0 : -1}
          className={cn(
            "absolute inset-0 transition-opacity duration-(--duration-expressive) ease-(--ease-expressive)",
            slideIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {slide.imageUrl ? (
            <Image
              src={slide.imageUrl}
              alt={pickLocale(slide.name, locale)}
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <p className="text-xs font-medium tracking-wide text-white/80 uppercase">
              {locale === "en" ? "Shop" : "Compra"}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold text-white sm:text-4xl">
              {pickLocale(slide.name, locale)}
            </h2>
          </div>
        </Link>
      ))}

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label={locale === "en" ? "Previous slide" : "Diapositiva anterior"}
            className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={locale === "en" ? "Next slide" : "Siguiente diapositiva"}
            className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`${locale === "en" ? "Go to slide" : "Ir a la diapositiva"} ${slideIndex + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-(--duration-fast)",
                  slideIndex === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

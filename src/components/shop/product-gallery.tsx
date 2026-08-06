"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const current = sorted[active];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="flex gap-2 overflow-x-auto sm:flex-col">
        {sorted.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "relative size-16 shrink-0 overflow-hidden rounded-md border",
              index === active && "border-foreground"
            )}
          >
            <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-muted">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt_text ?? productName}
            fill
            sizes="(min-width: 1024px) 40vw, 90vw"
            priority
            className="object-cover"
          />
        ) : null}
      </div>
    </div>
  );
}

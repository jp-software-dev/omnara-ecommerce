"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { IMAGE_TYPES, uploadImage } from "@/lib/supabase/upload-image";

/**
 * Single-image picker backed by the product-images bucket. The parent keeps the
 * URL in its own form state and saves it with the rest of the form, so nothing
 * is written to the business until the user presses save.
 */
export function ImageUploadField({
  locale,
  label,
  hint,
  kind,
  value,
  onChange,
  wide = false,
}: {
  locale: string;
  label: string;
  hint?: string;
  /** Subfolder under the user's storage folder, e.g. "business-logo". */
  kind: string;
  value: string;
  onChange: (url: string) => void;
  /** Wide preview for banners, square for logos. */
  wide?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const en = locale === "en";

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { publicUrl } = await uploadImage(file, kind, locale);
      onChange(publicUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      {value ? (
        <div
          className={`relative overflow-hidden rounded-lg border bg-muted ${
            wide ? "aspect-[3/1] w-full" : "size-24"
          }`}
        >
          <Image
            src={value}
            alt={label}
            fill
            sizes={wide ? "512px" : "96px"}
            className={wide ? "object-cover" : "object-contain"}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{en ? "No image yet." : "Todavía no hay imagen."}</p>
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => handleFile(event.target.files)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? en
              ? "Uploading..."
              : "Subiendo..."
            : value
              ? en
                ? "Replace"
                : "Reemplazar"
              : en
                ? "Upload"
                : "Subir imagen"}
        </Button>
        {value ? (
          <Button type="button" variant="destructive" size="sm" disabled={uploading} onClick={() => onChange("")}>
            {en ? "Remove" : "Quitar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

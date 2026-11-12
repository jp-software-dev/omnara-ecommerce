"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMAGE_TYPES, uploadImage, removeUploadedImage } from "@/lib/supabase/upload-image";
import { addProductImage, deleteProductImage, makeImagePrimary } from "../../actions";

type ProductImage = { id: string; url: string; position: number };

export function ImagesManager({
  locale,
  productId,
  productName,
  images,
}: {
  locale: string;
  productId: string;
  productName: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const en = locale === "en";
  const t = {
    title: en ? "Images" : "Imágenes",
    hint: en
      ? "JPG, PNG, WebP or AVIF, up to 5 MB. The first image is the cover."
      : "JPG, PNG, WebP o AVIF, hasta 5 MB. La primera imagen es la portada.",
    upload: en ? "Upload images" : "Subir imágenes",
    uploading: en ? "Uploading..." : "Subiendo...",
    cover: en ? "Cover" : "Portada",
    makeCover: en ? "Make cover" : "Hacer portada",
    remove: en ? "Delete" : "Eliminar",
    empty: en ? "No images yet." : "Todavía no hay imágenes.",
  };

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        let uploaded: Awaited<ReturnType<typeof uploadImage>>;
        try {
          uploaded = await uploadImage(file, productId, locale);
        } catch (uploadError) {
          toast.error(`${file.name}: ${uploadError instanceof Error ? uploadError.message : "Error"}`);
          continue;
        }
        try {
          await addProductImage(productId, uploaded.publicUrl, productName);
        } catch (insertError) {
          // Don't leave an orphan file behind if the row couldn't be created.
          await removeUploadedImage(uploaded.path);
          throw insertError;
        }
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <section className="mt-10 max-w-xl">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-square bg-muted">
                <Image
                  src={image.url}
                  alt={productName}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
                {index === 0 ? (
                  <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
                    {t.cover}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1 p-2">
                {index !== 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={pending}
                    onClick={() => run(() => makeImagePrimary(productId, image.id))}
                  >
                    {t.makeCover}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  disabled={pending}
                  onClick={() => run(() => deleteProductImage(image.id))}
                >
                  {t.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="mt-3"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? t.uploading : t.upload}
      </Button>
    </section>
  );
}

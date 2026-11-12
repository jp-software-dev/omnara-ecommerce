"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, deleteProductImage, makeImagePrimary } from "../../actions";

type ProductImage = { id: string; url: string; position: number };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(en ? "Sign in again." : "Vuelve a iniciar sesión.");

      for (const file of Array.from(files)) {
        if (!ALLOWED.includes(file.type)) {
          toast.error(`${file.name}: ${en ? "unsupported format." : "formato no permitido."}`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: ${en ? "larger than 5 MB." : "pesa más de 5 MB."}`);
          continue;
        }
        // The first folder must be the user's id: the storage policy only lets
        // a vendor write inside their own folder.
        const path = `${user.id}/${productId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`${file.name}: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        try {
          await addProductImage(productId, data.publicUrl, productName);
        } catch (insertError) {
          // Don't leave an orphan file behind if the row couldn't be created.
          await supabase.storage.from("product-images").remove([path]);
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
        accept={ALLOWED.join(",")}
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

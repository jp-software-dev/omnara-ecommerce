import { createClient } from "@/lib/supabase/client";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const BUCKET = "product-images";

/**
 * Validates and uploads an image to the product-images bucket, under
 * `<current user id>/<subfolder>/<random>.<ext>`. The first folder must be the
 * user's id: the storage policy only lets a vendor write inside their own folder.
 * Throws an Error with a user-facing message (in `locale`) when it can't.
 */
export async function uploadImage(file: File, subfolder: string, locale: string) {
  const en = locale === "en";

  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      en ? "Use a JPG, PNG, WebP or AVIF image." : "Usa una imagen JPG, PNG, WebP o AVIF."
    );
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(en ? "The image is larger than 5 MB." : "La imagen pesa más de 5 MB.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(en ? "Sign in again." : "Vuelve a iniciar sesión.");

  const path = `${user.id}/${subfolder}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Best-effort removal of an uploaded file (e.g. when the DB row couldn't be created). */
export async function removeUploadedImage(path: string) {
  await createClient().storage.from(BUCKET).remove([path]);
}

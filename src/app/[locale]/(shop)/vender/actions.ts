"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const applicationSchema = z.object({
  businessName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  description: z.string().trim().max(500, "La descripción es demasiado larga (máximo 500)."),
  phone: z.string().trim().max(30),
  documentPath: z.string().min(1, "Sube un documento de identificación."),
});

export async function submitSellerApplication(input: z.input<typeof applicationSchema>) {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  // The document must be in the applicant's own folder (the database enforces it too).
  if (!data.documentPath.startsWith(`${user.id}/`)) {
    throw new Error("El documento no es válido.");
  }

  const { error } = await supabase.from("seller_applications").insert({
    user_id: user.id,
    business_name: data.businessName,
    description: data.description || null,
    phone: data.phone || null,
    document_path: data.documentPath,
  });

  if (error) {
    // 23505 = unique violation: there is already an open application.
    if (error.code === "23505") throw new Error("Ya tienes una solicitud en revisión.");
    // 42501 = RLS: only plain customers can apply.
    if (error.code === "42501") throw new Error("Tu cuenta ya no puede enviar solicitudes.");
    throw error;
  }
  revalidatePath("/[locale]/(shop)/vender", "page");
}

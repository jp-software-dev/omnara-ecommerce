"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Asks for the account to be deleted. An administrator handles it (orders and
// payments must be kept for legal reasons), so nothing is removed here.
export async function requestAccountDeletion(locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) {
    const en = locale === "en";
    if (error.message.includes("already pending")) {
      throw new Error(en ? "You already have a pending request." : "Ya tienes una solicitud pendiente.");
    }
    if (error.message.includes("Not authenticated")) {
      throw new Error(en ? "Sign in to continue." : "Inicia sesión para continuar.");
    }
    throw new Error(en ? "We couldn't send your request. Try again." : "No pudimos enviar tu solicitud. Intenta de nuevo.");
  }
  revalidatePath("/[locale]/(account)/cuenta/privacidad", "page");
  revalidatePath("/[locale]/(admin)/admin/privacidad", "page");
}

"use server";

import { revalidatePath } from "next/cache";
import { addressSchema, type AddressInput } from "@/lib/addresses";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  return { supabase, user };
}

function addressError(error: { code?: string; message: string }) {
  if (error.message.includes("Address limit reached")) {
    return new Error("Puedes guardar hasta 10 direcciones. Elimina una para agregar otra.");
  }
  // 23514 = a CHECK constraint failed (format of postal code, lengths, country)
  if (error.code === "23514") return new Error("Revisa los datos de la dirección.");
  return error;
}

function refresh() {
  revalidatePath("/[locale]/(account)/cuenta/direcciones", "page");
  revalidatePath("/[locale]/(shop)/checkout", "page");
}

// Creates a new address or, when `id` is given, edits one of the user's own.
// RLS also restricts every query below to the signed-in user's rows.
export async function saveAddress(input: AddressInput) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const data = parsed.data;
  const { supabase, user } = await requireUser();

  const row = {
    label: data.label || null,
    recipient_name: data.recipientName,
    phone: data.phone || null,
    line1: data.line1,
    line2: data.line2 || null,
    city: data.city,
    state: data.state,
    postal_code: data.postalCode,
    country: data.country,
    ...(data.makeDefault ? { is_default: true } : {}),
  };

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("addresses")
      .update(row)
      .eq("id", data.id)
      .eq("user_id", user.id)
      .select("id");
    if (error) throw addressError(error);
    if (updated.length === 0) throw new Error("No se encontró esa dirección.");
  } else {
    const { error } = await supabase.from("addresses").insert({ ...row, user_id: user.id, type: "shipping" });
    if (error) throw addressError(error);
  }
  refresh();
}

export async function setDefaultAddress(addressId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw addressError(error);
  if (data.length === 0) throw new Error("No se encontró esa dirección.");
  refresh();
}

export async function deleteAddress(addressId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("addresses").delete().eq("id", addressId).eq("user_id", user.id);
  if (error) throw error;

  // If the default was the one removed, promote the newest remaining address.
  const { data: remaining } = await supabase
    .from("addresses")
    .select("id, is_default")
    .eq("user_id", user.id)
    .eq("type", "shipping")
    .order("created_at", { ascending: false });
  if (remaining && remaining.length > 0 && !remaining.some((a) => a.is_default)) {
    await supabase.from("addresses").update({ is_default: true }).eq("id", remaining[0].id).eq("user_id", user.id);
  }
  refresh();
}

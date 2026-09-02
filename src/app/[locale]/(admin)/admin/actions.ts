"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ORDER_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"] as const;

export async function updateOrderStatus(orderId: string, status: string) {
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    throw new Error("Estado de pedido inválido.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/pedidos", "page");
}

export async function adjustStock(variantId: string, nextQuantity: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: Math.max(0, Math.round(nextQuantity)) })
    .eq("id", variantId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/inventario", "page");
}

export async function createProduct(input: {
  slug: string;
  nameEs: string;
  nameEn: string;
  basePriceMxnCents: number;
  categoryId: string | null;
  status: string;
  attributes: Record<string, string>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: input.slug,
      name: { es: input.nameEs, en: input.nameEn },
      base_price_mxn_cents: input.basePriceMxnCents,
      category_id: input.categoryId,
      status: input.status,
      attributes: input.attributes,
      vendor_id: profile?.role === "vendor" ? user!.id : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/productos", "page");
  return data.id;
}

export async function updateProduct(
  productId: string,
  input: {
    nameEs: string;
    nameEn: string;
    basePriceMxnCents: number;
    categoryId: string | null;
    status: string;
    attributes: Record<string, string>;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: { es: input.nameEs, en: input.nameEn },
      base_price_mxn_cents: input.basePriceMxnCents,
      category_id: input.categoryId,
      status: input.status,
      attributes: input.attributes,
    })
    .eq("id", productId);

  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/productos", "page");
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/productos", "page");
}

const USER_ROLES = ["admin", "vendor", "customer"] as const;

export async function updateUserRole(userId: string, role: string) {
  if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
    throw new Error("Rol inválido.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    throw new Error("No puedes cambiar tu propio rol.");
  }
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/usuarios", "page");
}

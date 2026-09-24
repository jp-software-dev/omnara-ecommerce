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

export async function updateOrderTracking(orderId: string, trackingNumber: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ tracking_number: trackingNumber || null })
    .eq("id", orderId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/pedidos/[id]", "page");
}

export async function markMessageRead(messageId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status: "read" })
    .eq("id", messageId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/mensajes", "page");
}

export async function createPromoCode(input: {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderCents: number;
  usageLimit: number | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    min_order_cents: input.minOrderCents,
    usage_limit: input.usageLimit,
  });
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/promociones", "page");
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

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function assertValidSlug(slug: string) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("El slug solo puede tener minúsculas, números y guiones.");
  }
}

export async function createBusiness(input: {
  ownerId: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
}) {
  assertValidSlug(input.slug);
  const supabase = await createClient();

  const { data: ownerProfile, error: ownerError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", input.ownerId)
    .single();
  if (ownerError) throw ownerError;
  if (ownerProfile.role === "admin") {
    throw new Error("No puedes convertir a un admin en dueño de negocio.");
  }

  // Promote first: if the business insert below fails (duplicate slug, etc.),
  // the owner is left as a vendor with no business yet — a state the app
  // already handles gracefully (/admin/mi-negocio shows "no business"), and
  // createBusiness can simply be retried. Inserting first would instead risk
  // an orphaned business row with no owner-role fix-up path, since owner_id
  // is unique and a retry would fail on the duplicate key.
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "vendor" })
    .eq("id", input.ownerId)
    .neq("role", "vendor");
  if (roleError) throw roleError;

  const { error: businessError } = await supabase.from("businesses").insert({
    owner_id: input.ownerId,
    slug: input.slug,
    name: input.name,
    description: input.description || null,
    logo_url: input.logoUrl || null,
    banner_url: input.bannerUrl || null,
  });
  if (businessError) throw businessError;

  revalidatePath("/[locale]/(admin)/admin/negocios", "page");
  revalidatePath("/[locale]/(admin)/admin/usuarios", "page");
}

export async function updateBusiness(
  businessId: string,
  input: {
    name: string;
    description: string;
    logoUrl: string;
    bannerUrl: string;
    isActive: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      description: input.description || null,
      logo_url: input.logoUrl || null,
      banner_url: input.bannerUrl || null,
      is_active: input.isActive,
    })
    .eq("id", businessId);
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/negocios", "page");
  revalidatePath("/[locale]/(admin)/admin/mi-negocio", "page");
}

export async function updateMyBusiness(input: {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      description: input.description || null,
      logo_url: input.logoUrl || null,
      banner_url: input.bannerUrl || null,
    })
    .eq("owner_id", user.id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) {
    throw new Error("No se encontró un negocio asociado a tu cuenta.");
  }
  revalidatePath("/[locale]/(admin)/admin/mi-negocio", "page");
}

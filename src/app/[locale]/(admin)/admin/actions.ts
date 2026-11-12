"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { returnErrorMessage } from "@/lib/returns";
import { getStripe } from "@/lib/stripe";
import { flushEmailsSoon } from "@/lib/email-outbox";
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

  if (error) {
    // 23503 = products_vendor_business_fkey: the vendor has no business yet.
    if (error.code === "23503") {
      throw new Error("Tu cuenta todavía no tiene un negocio. Un administrador debe crearlo antes de que puedas publicar productos.");
    }
    // 23505 = the slug is already taken.
    if (error.code === "23505") throw new Error("Ya existe un producto con ese slug.");
    throw error;
  }
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

const variantSchema = z.object({
  sku: z.string().trim().min(2, "El SKU es obligatorio.").max(60),
  size: z.string().trim().max(20).optional(),
  color: z.string().trim().max(30).optional(),
  priceOverrideMxnCents: z.number().int().positive().max(100_000_000).nullable(),
  stockQuantity: z.number().int().min(0).max(100_000),
});

export async function addVariant(
  productId: string,
  input: z.input<typeof variantSchema>
) {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos de variante inválidos.");
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    sku: v.sku,
    size: v.size || null,
    color: v.color || null,
    price_override_mxn_cents: v.priceOverrideMxnCents,
    stock_quantity: v.stockQuantity,
  });

  if (error) {
    // 23505 = unique_violation (sku is unique across the whole catalog)
    if (error.code === "23505") throw new Error("Ya existe una variante con ese SKU.");
    throw error;
  }
  revalidatePath("/[locale]/(admin)/admin/productos", "layout");
}

export async function deleteVariant(variantId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", variantId);
  if (error) {
    // 23503 = foreign_key_violation: the variant already appears in an order.
    if (error.code === "23503") {
      throw new Error("Esta variante ya tiene ventas; ponla en 0 de inventario en lugar de borrarla.");
    }
    throw error;
  }
  revalidatePath("/[locale]/(admin)/admin/productos", "layout");
}

const PRODUCT_IMAGES_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`;

export async function addProductImage(productId: string, url: string, altText?: string) {
  // Only images that live in our own bucket may be attached to a product.
  if (!url.startsWith(PRODUCT_IMAGES_PREFIX)) {
    throw new Error("La imagen debe subirse desde la aplicación.");
  }
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    url,
    alt_text: altText?.trim().slice(0, 200) || null,
    position: (last?.position ?? -1) + 1,
  });
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/productos", "layout");
}

export async function deleteProductImage(imageId: string) {
  const supabase = await createClient();
  const { data: image } = await supabase
    .from("product_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;

  // Best-effort cleanup of the file; the row is already gone either way.
  if (image?.url.startsWith(PRODUCT_IMAGES_PREFIX)) {
    await supabase.storage
      .from("product-images")
      .remove([image.url.slice(PRODUCT_IMAGES_PREFIX.length)]);
  }
  revalidatePath("/[locale]/(admin)/admin/productos", "layout");
}

export async function makeImagePrimary(productId: string, imageId: string) {
  const supabase = await createClient();
  const { data: images, error } = await supabase
    .from("product_images")
    .select("id, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;

  const ordered = [
    ...images.filter((i) => i.id === imageId),
    ...images.filter((i) => i.id !== imageId),
  ];
  for (const [index, image] of ordered.entries()) {
    if (image.position === index) continue;
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ position: index })
      .eq("id", image.id);
    if (updateError) throw updateError;
  }
  revalidatePath("/[locale]/(admin)/admin/productos", "layout");
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

// A vendor ships THEIR items of an order. Goes through a SECURITY DEFINER
// function because orders is admin-writable only (and one order can hold
// items from several businesses, so a vendor must not touch the whole order).
export async function shipMyItems(orderId: string, trackingNumber: string) {
  const tracking = trackingNumber.trim();
  if (tracking.length > 80) throw new Error("El número de rastreo es demasiado largo.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("vendor_ship_items", {
    p_order_id: orderId,
    p_tracking: tracking,
  });
  if (error) {
    if (error.message.includes("not paid")) throw new Error("El pedido todavía no está pagado.");
    if (error.message.includes("no items")) throw new Error("No tienes artículos en este pedido.");
    throw error;
  }
  flushEmailsSoon();
  revalidatePath("/[locale]/(admin)/admin/pedidos", "layout");
}

// Approving creates the business and promotes the applicant in one database
// transaction (approve_seller_application); the function re-checks that the
// caller is an admin.
export async function approveApplication(applicationId: string, slug: string) {
  assertValidSlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_seller_application", {
    p_id: applicationId,
    p_slug: slug,
  });
  if (error) {
    // 23505 = the slug is already used by another business
    if (error.code === "23505") throw new Error("Ya existe un negocio con ese slug.");
    if (error.message.includes("already has a business")) {
      throw new Error("Este usuario ya tiene un negocio.");
    }
    if (error.message.includes("already reviewed")) {
      throw new Error("Esta solicitud ya fue revisada.");
    }
    throw error;
  }
  flushEmailsSoon();
  revalidatePath("/[locale]/(admin)/admin/solicitudes", "page");
  revalidatePath("/[locale]/(admin)/admin/negocios", "page");
  revalidatePath("/[locale]/(admin)/admin/usuarios", "page");
}

export async function rejectApplication(applicationId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_seller_application", {
    p_id: applicationId,
    p_reason: reason,
  });
  if (error) {
    if (error.message.includes("already reviewed")) {
      throw new Error("Esta solicitud ya fue revisada.");
    }
    throw error;
  }
  flushEmailsSoon();
  revalidatePath("/[locale]/(admin)/admin/solicitudes", "page");
}

// ---- Returns --------------------------------------------------------------
// Thin wrappers over the database functions, which re-check who is calling.

function revalidateReturns() {
  revalidatePath("/[locale]/(admin)/admin/devoluciones", "layout");
  revalidatePath("/[locale]/(account)/cuenta/devoluciones", "layout");
  // The database queued an email for the decision that was just made.
  flushEmailsSoon();
}

// The item's seller approves or rejects a new return request.
export async function decideReturn(returnId: string, approve: boolean, note: string, locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_return", {
    p_id: returnId,
    p_approve: approve,
    p_note: note,
  });
  if (error) throw new Error(returnErrorMessage(error.message, locale));
  revalidateReturns();
}

// Admin settles an escalated (or stuck) request: approve it or close it.
export async function resolveReturn(returnId: string, approve: boolean, note: string, locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_return", {
    p_id: returnId,
    p_approve: approve,
    p_note: note,
  });
  if (error) throw new Error(returnErrorMessage(error.message, locale));
  revalidateReturns();
}

// Sends an approved return's money back through Stripe, then records it. Only
// admins: the platform holds the funds (no Stripe Connect), so the refund is
// issued from the platform account.
//
// The idempotency key makes a retry safe: if Stripe accepted the refund but
// recording it in the database failed, clicking again returns the SAME refund
// from Stripe instead of refunding twice, and then finishes the bookkeeping.
export async function refundReturn(returnId: string, locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Solo un administrador puede reembolsar.");

  const { data: request, error } = await supabase
    .from("return_requests")
    .select("id, status, refund_amount_cents, currency, order_id, orders(stripe_payment_intent_id)")
    .eq("id", returnId)
    .single();
  if (error) throw error;
  if (request.status !== "approved") {
    throw new Error(returnErrorMessage("not approved", locale));
  }
  const paymentIntentId = request.orders?.stripe_payment_intent_id;
  if (!paymentIntentId) {
    throw new Error("Este pedido no tiene un pago de Stripe asociado, no se puede reembolsar.");
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    throw new Error("Stripe no está configurado en el servidor (falta STRIPE_SECRET_KEY de prueba).");
  }

  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: request.refund_amount_cents,
      reason: "requested_by_customer",
      metadata: { return_id: request.id, order_id: request.order_id },
    },
    { idempotencyKey: `return-refund-${request.id}` }
  );
  if (refund.status === "failed" || refund.status === "canceled") {
    throw new Error("Stripe no pudo procesar el reembolso. Revisa el pago en el panel de Stripe.");
  }

  const { error: markError } = await supabase.rpc("mark_return_refunded", {
    p_id: request.id,
    p_refund_id: refund.id,
  });
  if (markError) throw new Error(returnErrorMessage(markError.message, locale));

  revalidateReturns();
  revalidatePath("/[locale]/(admin)/admin/pedidos", "layout");
}

// Hides or restores a review. The database function re-checks that the caller is an admin.
export async function moderateReview(reviewId: string, hidden: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_review", { p_id: reviewId, p_hidden: hidden });
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/resenas", "page");
  revalidatePath("/[locale]/(shop)/producto/[slug]", "page");
}

// Hides or restores a product question. The database function re-checks that the caller is an admin.
export async function moderateQuestion(questionId: string, hidden: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_question", { p_id: questionId, p_hidden: hidden });
  if (error) throw error;
  revalidatePath("/[locale]/(admin)/admin/preguntas", "page");
  revalidatePath("/[locale]/(shop)/producto/[slug]", "page");
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

// Logo and banner must come from our own bucket (or be empty): the CSP and
// next/image only allow that host, and it keeps arbitrary URLs out of the DB.
function assertBucketImageUrl(url: string) {
  if (url !== "" && !url.startsWith(PRODUCT_IMAGES_PREFIX)) {
    throw new Error("La imagen debe subirse desde la aplicación.");
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
  assertBucketImageUrl(input.logoUrl);
  assertBucketImageUrl(input.bannerUrl);
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
  assertBucketImageUrl(input.logoUrl);
  assertBucketImageUrl(input.bannerUrl);
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
  assertBucketImageUrl(input.logoUrl);
  assertBucketImageUrl(input.bannerUrl);
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

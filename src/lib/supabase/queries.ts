import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/types";

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, position")
    .order("position");

  if (error) throw error;
  return data;
}

export async function getCategoryShowcases() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name, position, products(status, created_at, product_images(url, position))"
    )
    .order("position");

  if (error) throw error;

  return data.map((category) => {
    const activeProducts = category.products
      .filter((product) => product.status === "active")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const image = activeProducts[0]?.product_images
      ?.slice()
      .sort((a, b) => a.position - b.position)[0];

    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: image?.url ?? null,
    };
  });
}

export async function getFeaturedProducts(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, base_price_mxn_cents, category_id, product_images(url, position)"
    )
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categorySlug: string) {
  const supabase = await createClient();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("slug", categorySlug)
    .single();

  if (categoryError) throw categoryError;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, slug, name, description_short, base_price_mxn_cents, attributes, created_at, product_images(url, position), product_variants(id, size, color, stock_quantity)"
    )
    .eq("category_id", category.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (productsError) throw productsError;

  return { category, products };
}

export async function getNewArrivals(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, base_price_mxn_cents, product_images(url, position)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getBestSellers(limit = 8) {
  // order_items is RLS-scoped to buyer/vendor/admin, so a normal storefront
  // visitor can't see enough rows to compute a sitewide aggregate — this is
  // a read-only sales-count rollup (no order/customer details returned),
  // the same class of exception the Stripe webhook already uses.
  let db;
  try {
    db = createServiceRoleClient();
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not configured in this environment yet —
    // hide the section rather than crash the homepage.
    return [];
  }

  const { data: items, error } = await db
    .from("order_items")
    .select("quantity, product_variants(product_id)");

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const item of items) {
    const productId = item.product_variants?.product_id;
    if (!productId) continue;
    totals.set(productId, (totals.get(productId) ?? 0) + item.quantity);
  }

  const topProductIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topProductIds.length === 0) return [];

  const supabase = await createClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, slug, name, base_price_mxn_cents, product_images(url, position)")
    .in("id", topProductIds)
    .eq("status", "active");

  if (productsError) throw productsError;

  const order = new Map(topProductIds.map((id, index) => [id, index]));
  return [...products].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description_short, description_long, base_price_mxn_cents, category_id, attributes, categories(slug, name), product_images(id, url, alt_text, position, variant_id), product_variants(id, sku, size, color, stock_quantity, low_stock_threshold, price_override_mxn_cents)"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error) throw error;
  return data;
}

export async function getRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 4
) {
  if (!categoryId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, base_price_mxn_cents, product_images(url, position)")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getWishlistProducts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(
      "product_id, products(id, slug, name, base_price_mxn_cents, status, product_images(url, position))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data
    .map((row) => row.products)
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .filter((product) => product.status === "active");
}

export async function getVariantsForCheckout(variantIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, size, color, stock_quantity, price_override_mxn_cents, product_id, products(name, base_price_mxn_cents, status)"
    )
    .in("id", variantIds);

  if (error) throw error;
  return data;
}

export async function getProductReviews(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, title, comment, is_verified_purchase, created_at, profiles(full_name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, base_price_mxn_cents, product_images(url, position)")
    .eq("status", "active");

  if (error) throw error;

  // The catalog is small enough that filtering in JS (matching either
  // locale's name) is simpler and more forgiving than fighting Postgres
  // JSONB operators through the query builder for a couple dozen rows.
  return data.filter((product) => {
    const name = product.name as { es?: string; en?: string } | null;
    const es = name?.es?.toLowerCase() ?? "";
    const en = name?.en?.toLowerCase() ?? "";
    return es.includes(q) || en.includes(q);
  });
}

export async function getUserOrders(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, currency, total_cents, created_at, order_items(quantity)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAppSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("usd_exchange_rate, free_shipping_threshold_mxn_cents")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data;
}

export type PromoCodeValidation =
  | { valid: true; discountCents: number; discountType: "percentage" | "fixed" }
  | { valid: false; reason: "not_found" | "expired" | "limit_reached" | "min_order" };

// promo_codes is admin-only under RLS (see promo_codes_admin_all), so validating a
// customer-entered code has to go through the service-role client — same exception
// getBestSellers already relies on for a public, read-only, non-sensitive lookup.
// Convention: discount_value is 0-100 for "percentage", and MXN cents for "fixed"
// (matching every other *_cents column in this schema).
export async function validatePromoCode(
  rawCode: string,
  subtotalMxnCents: number
): Promise<PromoCodeValidation> {
  let db;
  try {
    db = createServiceRoleClient();
  } catch {
    return { valid: false, reason: "not_found" };
  }

  const code = rawCode.trim().toUpperCase();
  const { data: promo } = await db
    .from("promo_codes")
    .select("discount_type, discount_value, min_order_cents, expires_at, usage_limit, times_used, is_active")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!promo) return { valid: false, reason: "not_found" };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, reason: "expired" };
  }
  if (promo.usage_limit !== null && promo.times_used >= promo.usage_limit) {
    return { valid: false, reason: "limit_reached" };
  }
  if (subtotalMxnCents < promo.min_order_cents) {
    return { valid: false, reason: "min_order" };
  }

  const discountType = promo.discount_type as "percentage" | "fixed";
  const discountCents =
    discountType === "percentage"
      ? Math.round((subtotalMxnCents * promo.discount_value) / 100)
      : Math.round(promo.discount_value);

  return { valid: true, discountCents: Math.min(discountCents, subtotalMxnCents), discountType };
}

export async function getOrderDetail(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, currency, subtotal_cents, shipping_cents, discount_cents, promo_code, total_cents, shipping_address_snapshot, tracking_number, created_at, user_id, order_items(id, quantity, unit_price_cents, product_name_snapshot, variant_attrs_snapshot, product_variants(product_id, products(slug)))"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
export type ContactMessage = Database["public"]["Tables"]["contact_messages"]["Row"];

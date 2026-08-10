import { createClient } from "@/lib/supabase/server";

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, position")
    .order("position");

  if (error) throw error;
  return data;
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
      "id, slug, name, description_short, base_price_mxn_cents, product_images(url, position), product_variants(id, size, color, stock_quantity)"
    )
    .eq("category_id", category.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (productsError) throw productsError;

  return { category, products };
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

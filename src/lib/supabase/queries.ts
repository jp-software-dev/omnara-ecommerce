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
      "id, slug, name, description_short, description_long, base_price_mxn_cents, category_id, categories(slug, name), product_images(id, url, alt_text, position, variant_id), product_variants(id, sku, size, color, stock_quantity, low_stock_threshold, price_override_mxn_cents)"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

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

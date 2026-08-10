import { createClient } from "@/lib/supabase/server";

// RLS already scopes these to "own products" for a vendor and "all" for an
// admin (see products_public_read_active / orders_select_own_vendor_admin),
// so no manual role filtering is needed here.

export async function getAdminProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, base_price_mxn_cents, status, category_id, vendor_id, product_images(url, position), product_variants(id, sku, size, color, stock_quantity, low_stock_threshold)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAdminProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description_short, description_long, base_price_mxn_cents, status, category_id, vendor_id, attributes, product_variants(id, sku, size, color, stock_quantity, low_stock_threshold, price_override_mxn_cents)"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getLowStockVariants() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, sku, size, color, stock_quantity, low_stock_threshold, product_id, products(name, slug, vendor_id)"
    )
    .order("stock_quantity", { ascending: true });

  if (error) throw error;
  return data.filter((variant) => variant.stock_quantity <= variant.low_stock_threshold);
}

export async function getAllVariantsForInventory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, sku, size, color, stock_quantity, low_stock_threshold, product_id, products(name, slug)"
    )
    .order("stock_quantity", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getOrdersForRole() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, currency, total_cents, created_at, user_id, order_items(id, quantity, unit_price_cents, product_name_snapshot, vendor_id)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

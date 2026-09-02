import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

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

export async function getContactMessages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPromoCodes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, min_order_cents, usage_limit, times_used, is_active, expires_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRevenueByDay(days = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("orders")
    .select("total_cents, created_at, status")
    .gte("created_at", since.toISOString())
    .in("status", ["paid", "fulfilled"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byDay = new Map<string, number>();
  for (const order of data) {
    const day = order.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + order.total_cents);
  }

  const series: { day: string; totalCents: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    series.push({ day: key, totalCents: byDay.get(key) ?? 0 });
  }
  return series;
}

export async function getTopProducts(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, unit_price_cents, product_name_snapshot, product_variants(product_id)");

  if (error) throw error;

  const totals = new Map<string, { name: Json; units: number; revenueCents: number }>();
  for (const item of data) {
    const productId = item.product_variants?.product_id;
    if (!productId) continue;
    const existing = totals.get(productId);
    if (existing) {
      existing.units += item.quantity;
      existing.revenueCents += item.quantity * item.unit_price_cents;
    } else {
      totals.set(productId, {
        name: item.product_name_snapshot,
        units: item.quantity,
        revenueCents: item.quantity * item.unit_price_cents,
      });
    }
  }

  return [...totals.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

export async function getOrderStatusCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("status");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const order of data) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }
  return counts;
}

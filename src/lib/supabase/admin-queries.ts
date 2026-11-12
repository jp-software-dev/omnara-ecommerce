import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/supabase/queries";
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
      "id, slug, name, description_short, description_long, base_price_mxn_cents, status, category_id, vendor_id, attributes, product_images(id, url, position), product_variants(id, sku, size, color, stock_quantity, low_stock_threshold, price_override_mxn_cents)"
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

// Sales analytics are built from order_items, not from orders.total_cents:
// an order can mix several businesses (and carry shipping and discounts), so the
// order total says nothing about what ONE seller earned. order_items is already
// RLS-scoped — a vendor only receives their own lines, an admin receives all —
// so this one query serves both roles without any manual filtering.
// Orders paid in USD store USD cents; they are converted to MXN at the current
// exchange rate (the rate at the time of sale is not stored).
export async function getSalesAnalytics(days = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [{ data, error }, settings] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "order_id, quantity, unit_price_cents, product_name_snapshot, orders!inner(created_at, status, currency), product_variants(product_id)"
      )
      .in("orders.status", ["paid", "fulfilled"])
      .gte("orders.created_at", since.toISOString()),
    getAppSettings(),
  ]);

  if (error) throw error;

  const toMxn = (cents: number, currency: string) =>
    currency === "USD" ? Math.round(cents * settings.usd_exchange_rate) : cents;

  const byDay = new Map<string, number>();
  const orderIds = new Set<string>();
  const products = new Map<string, { name: Json; units: number; revenueCents: number }>();
  let totalCents = 0;

  for (const item of data) {
    const lineCents = toMxn(item.unit_price_cents * item.quantity, item.orders.currency);
    totalCents += lineCents;
    orderIds.add(item.order_id);

    const day = item.orders.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + lineCents);

    const productId = item.product_variants?.product_id;
    if (productId) {
      const existing = products.get(productId);
      if (existing) {
        existing.units += item.quantity;
        existing.revenueCents += lineCents;
      } else {
        products.set(productId, {
          name: item.product_name_snapshot,
          units: item.quantity,
          revenueCents: lineCents,
        });
      }
    }
  }

  const revenueByDay: { day: string; totalCents: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    revenueByDay.push({ day: key, totalCents: byDay.get(key) ?? 0 });
  }

  return {
    revenueByDay,
    totalCents,
    paidOrders: orderIds.size,
    avgOrderCents: orderIds.size > 0 ? Math.round(totalCents / orderIds.size) : 0,
    topProducts: [...products.values()].sort((a, b) => b.units - a.units).slice(0, 5),
  };
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

// admin_list_users() is a SECURITY DEFINER function (profiles has no email —
// that lives in auth.users, which isn't exposed to PostgREST directly) that
// returns rows itself only when the caller is an admin, so no service-role
// key is needed here.
export async function getAdminUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users");

  if (error) throw error;
  return data;
}

export async function getBusinesses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, slug, name, description, logo_url, banner_url, is_active, created_at, owner_id, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getBusinessById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, slug, name, description, logo_url, banner_url, is_active, owner_id, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSellerApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_applications")
    .select(
      "id, user_id, business_name, description, phone, document_path, status, rejection_reason, created_at, reviewed_at, profiles!seller_applications_user_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Identity documents live in a private bucket; only admins can sign URLs for them.
export async function getApplicationDocumentUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("seller-documents")
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

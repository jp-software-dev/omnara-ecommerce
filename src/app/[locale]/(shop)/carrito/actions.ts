"use server";

import { getVariantsForCheckout } from "@/lib/supabase/queries";
import type { CurrentVariant } from "@/lib/cart-prices";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The current price, stock and availability of the variants in the cart (public data). */
export async function getCurrentVariants(variantIds: string[]): Promise<CurrentVariant[]> {
  const ids = [...new Set(variantIds)].filter((id) => UUID.test(id)).slice(0, 30);
  if (ids.length === 0) return [];
  const rows = await getVariantsForCheckout(ids);
  return rows.map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    return {
      variantId: row.id,
      priceMxnCents: row.price_override_mxn_cents ?? product?.base_price_mxn_cents ?? 0,
      stockQuantity: row.stock_quantity,
      available: product?.status === "active",
    };
  });
}

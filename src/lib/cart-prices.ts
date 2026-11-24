// Compares what the cart saved when the item was added with what the shop says now. The
// order is always charged at the current price, so a changed price must be shown before paying.

export type CartLine = { variantId: string; name: string; unitPriceMxnCents: number; quantity: number };

/** What the shop says about a variant right now. A variant that is not listed is gone. */
export type CurrentVariant = { variantId: string; priceMxnCents: number; stockQuantity: number; available: boolean };

export type CartChange =
  | { kind: "price"; variantId: string; name: string; fromMxnCents: number; toMxnCents: number }
  | { kind: "stock"; variantId: string; name: string; fromQuantity: number; toQuantity: number }
  | { kind: "unavailable"; variantId: string; name: string };

export function findCartChanges(lines: CartLine[], current: CurrentVariant[]): CartChange[] {
  const byId = new Map(current.map((variant) => [variant.variantId, variant]));
  const changes: CartChange[] = [];
  for (const line of lines) {
    const now = byId.get(line.variantId);
    if (!now || !now.available || now.stockQuantity < 1) {
      changes.push({ kind: "unavailable", variantId: line.variantId, name: line.name });
      continue;
    }
    if (now.priceMxnCents !== line.unitPriceMxnCents) {
      changes.push({
        kind: "price",
        variantId: line.variantId,
        name: line.name,
        fromMxnCents: line.unitPriceMxnCents,
        toMxnCents: now.priceMxnCents,
      });
    }
    if (line.quantity > now.stockQuantity) {
      changes.push({
        kind: "stock",
        variantId: line.variantId,
        name: line.name,
        fromQuantity: line.quantity,
        toQuantity: now.stockQuantity,
      });
    }
  }
  return changes;
}

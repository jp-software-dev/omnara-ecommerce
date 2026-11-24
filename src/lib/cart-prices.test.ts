import { describe, expect, it } from "vitest";
import { findCartChanges, type CartLine, type CurrentVariant } from "@/lib/cart-prices";

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  variantId: "v1",
  name: "Lámpara",
  unitPriceMxnCents: 10000,
  quantity: 2,
  ...overrides,
});
const now = (overrides: Partial<CurrentVariant> = {}): CurrentVariant => ({
  variantId: "v1",
  priceMxnCents: 10000,
  stockQuantity: 5,
  available: true,
  ...overrides,
});

describe("findCartChanges", () => {
  it("reports nothing when the cart still matches the shop", () => {
    expect(findCartChanges([line()], [now()])).toEqual([]);
  });

  it("reports a price that went up or down", () => {
    expect(findCartChanges([line()], [now({ priceMxnCents: 12000 })])).toEqual([
      { kind: "price", variantId: "v1", name: "Lámpara", fromMxnCents: 10000, toMxnCents: 12000 },
    ]);
    expect(findCartChanges([line()], [now({ priceMxnCents: 8000 })])[0]).toMatchObject({ kind: "price", toMxnCents: 8000 });
  });

  it("reports a quantity above the stock that is left", () => {
    expect(findCartChanges([line({ quantity: 4 })], [now({ stockQuantity: 3 })])).toEqual([
      { kind: "stock", variantId: "v1", name: "Lámpara", fromQuantity: 4, toQuantity: 3 },
    ]);
  });

  it("reports an item that is gone, inactive or out of stock, and nothing else about it", () => {
    expect(findCartChanges([line()], [])).toEqual([{ kind: "unavailable", variantId: "v1", name: "Lámpara" }]);
    expect(findCartChanges([line()], [now({ available: false, priceMxnCents: 1 })])).toHaveLength(1);
    expect(findCartChanges([line()], [now({ stockQuantity: 0 })])[0].kind).toBe("unavailable");
  });

  it("reports price and stock of the same item together, and each item on its own", () => {
    const changes = findCartChanges(
      [line({ quantity: 9 }), line({ variantId: "v2", name: "Taza" })],
      [now({ priceMxnCents: 11000, stockQuantity: 2 }), now({ variantId: "v2" })]
    );
    expect(changes.map((change) => change.kind)).toEqual(["price", "stock"]);
  });
});

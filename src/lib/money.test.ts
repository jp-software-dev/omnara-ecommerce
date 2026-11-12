import { describe, expect, it } from "vitest";
import { convertToUsd, formatPrice, pickLocale } from "@/lib/format";
import { computeShippingCents, FLAT_SHIPPING_MXN_CENTS } from "@/lib/shipping";

describe("shipping", () => {
  const threshold = 150_000; // $1,500 MXN in cents

  it("charges the flat rate below the free-shipping threshold", () => {
    expect(computeShippingCents(149_999, threshold, FLAT_SHIPPING_MXN_CENTS)).toBe(9_900);
  });

  it("is free exactly at and above the threshold", () => {
    expect(computeShippingCents(150_000, threshold, FLAT_SHIPPING_MXN_CENTS)).toBe(0);
    expect(computeShippingCents(500_000, threshold, FLAT_SHIPPING_MXN_CENTS)).toBe(0);
  });
});

describe("currency", () => {
  it("converts MXN cents to USD cents with the given rate, rounded", () => {
    expect(convertToUsd(34_900, 18)).toBe(1_939); // 349.00 / 18 = 19.388…
    expect(convertToUsd(0, 18)).toBe(0);
  });

  it("formats prices per locale without decimals", () => {
    expect(formatPrice(34_900, "MXN", "es")).toContain("349");
    expect(formatPrice(34_900, "MXN", "es")).not.toContain(".00");
    expect(formatPrice(1_939, "USD", "en")).toBe("$19");
  });
});

describe("pickLocale", () => {
  const name = { es: "Playera", en: "Shirt" };

  it("picks the requested language", () => {
    expect(pickLocale(name, "en")).toBe("Shirt");
    expect(pickLocale(name, "es")).toBe("Playera");
  });

  it("falls back to Spanish when the language is missing", () => {
    expect(pickLocale({ es: "Playera" }, "en")).toBe("Playera");
  });

  it("returns an empty string for anything that is not a localized object", () => {
    expect(pickLocale(null, "es")).toBe("");
    expect(pickLocale("texto", "es")).toBe("");
    expect(pickLocale(["a"], "es")).toBe("");
    expect(pickLocale({ es: 5 }, "es")).toBe("");
  });
});

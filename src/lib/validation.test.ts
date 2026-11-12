import { describe, expect, it } from "vitest";
import { addressSchema } from "@/lib/addresses";
import {
  businessCreateSchema,
  parseOrThrow,
  productSchema,
  promoSchema,
} from "@/lib/validation";

const product = {
  slug: "mi-producto",
  nameEs: "Playera",
  nameEn: "Shirt",
  basePriceMxnCents: 34_900,
  categoryId: null,
  status: "active" as const,
  attributes: { material: "Algodón", año: "2026" },
};

const rejects = (schema: Parameters<typeof parseOrThrow>[0], input: unknown, message: RegExp) =>
  expect(() => parseOrThrow(schema, input)).toThrow(message);

describe("product validation", () => {
  it("accepts a valid product, including accented attribute keys", () => {
    expect(parseOrThrow(productSchema, product).slug).toBe("mi-producto");
  });

  it("rejects bad slugs, prices and statuses", () => {
    rejects(productSchema, { ...product, slug: "Mi Producto!" }, /slug/i);
    rejects(productSchema, { ...product, basePriceMxnCents: 0 }, /precio/i);
    rejects(productSchema, { ...product, basePriceMxnCents: 10.5 }, /precio/i);
    rejects(productSchema, { ...product, basePriceMxnCents: Number.NaN }, /precio/i);
    rejects(productSchema, { ...product, status: "deleted" }, /estado/i);
    rejects(productSchema, { ...product, categoryId: "abc" }, /categor/i);
  });

  it("caps the number, names and size of category attributes", () => {
    const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, "v"]));
    rejects(productSchema, { ...product, attributes: many }, /máximo 20/);
    rejects(productSchema, { ...product, attributes: { "a b": "x" } }, /nombre no válido/);
    rejects(productSchema, { ...product, attributes: { material: "x".repeat(201) } }, /máximo 200/);
  });
});

describe("business validation", () => {
  const business = {
    ownerId: "3f8e2b6a-1c4d-4e5f-8a9b-0c1d2e3f4a5b",
    slug: "cafe",
    name: "Café",
    description: "",
    logoUrl: "",
    bannerUrl: "",
  };

  it("accepts a valid business and rejects an over-long name", () => {
    expect(parseOrThrow(businessCreateSchema, business).name).toBe("Café");
    rejects(businessCreateSchema, { ...business, name: "n".repeat(81) }, /máximo 80/);
  });

  it("requires a real owner id", () => {
    rejects(businessCreateSchema, { ...business, ownerId: "no-es-un-uuid" }, /dueño/);
  });
});

describe("promo code validation", () => {
  const promo = { code: "bienvenido10", discountType: "percentage" as const, discountValue: 10, minOrderCents: 0, usageLimit: null };

  it("accepts a percentage and a fixed amount", () => {
    expect(parseOrThrow(promoSchema, promo).discountValue).toBe(10);
    expect(parseOrThrow(promoSchema, { ...promo, discountType: "fixed", discountValue: 10_000 }).discountValue).toBe(10_000);
  });

  it("rejects impossible discounts", () => {
    rejects(promoSchema, { ...promo, discountValue: 150 }, /entre 0 y 100/);
    rejects(promoSchema, { ...promo, discountValue: 0 }, /entre 0 y 100/);
    rejects(promoSchema, { ...promo, discountType: "fixed", discountValue: 10.5 }, /monto fijo/);
  });

  it("rejects codes with spaces and a zero usage limit", () => {
    rejects(promoSchema, { ...promo, code: "mi codigo" }, /código/);
    rejects(promoSchema, { ...promo, usageLimit: 0 }, /al menos 1/);
  });
});

describe("address validation", () => {
  const address = {
    recipientName: "Ana Pérez",
    line1: "Calle 1 #20",
    city: "Mérida",
    state: "Yucatán",
    postalCode: "97000",
    country: "MX" as const,
  };

  it("accepts a Mexican address with a 5-digit postal code", () => {
    expect(addressSchema.safeParse(address).success).toBe(true);
  });

  it("requires 5 digits for Mexico and allows ZIP+4 for the United States", () => {
    expect(addressSchema.safeParse({ ...address, postalCode: "9700" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, postalCode: "97000-1234" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, country: "US", postalCode: "73301-1234" }).success).toBe(true);
  });

  it("rejects other countries and over-long fields", () => {
    expect(addressSchema.safeParse({ ...address, country: "ES" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, recipientName: "n".repeat(61) }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, line1: "ab" }).success).toBe(false);
  });
});

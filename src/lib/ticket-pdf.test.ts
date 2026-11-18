import { describe, expect, it } from "vitest";
import { buildTicketPdf } from "@/lib/ticket-pdf";
import { parseTicket, ticketAddressLines, ticketFilename, ticketItemLabel, type Ticket } from "@/lib/ticket";

function sample(overrides: Partial<Ticket> = {}): Ticket {
  return {
    order_id: "38f6bcc7-ba46-4c84-9372-94d49968733c",
    order_number: "DEMO-46DE52C0",
    created_at: "2026-11-13T01:54:30.996033+00:00",
    status: "paid",
    currency: "MXN",
    subtotal_cents: 24900,
    shipping_cents: 9900,
    discount_cents: 0,
    promo_code: null,
    total_cents: 34800,
    customer_email: "alumno.demo@example.com",
    shipping_address: {
      name: "Alumno Demo",
      address: { line1: "Calle Ejemplo 123", line2: null, city: "Ciudad de México", state: "CDMX", postal_code: "06000", country: "MX" },
    },
    demo: true,
    has_account: false,
    items: [
      { name: { es: "Portavelas de vidrio", en: "Glass candle holder" }, attrs: { size: null, color: "Transparente" }, quantity: 1, unit_price_cents: 24900, seller: "Café Estudiantil" },
    ],
    shipments: [{ seller: "Café Estudiantil", status: "out_for_delivery", tracking_number: "SIM-EXP-2446094102", estimated_delivery_at: "2026-11-18T20:00:00+00:00" }],
    estimated_delivery_at: "2026-11-18T20:00:00+00:00",
    ...overrides,
  };
}

const asText = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

describe("buildTicketPdf", () => {
  it("writes a structurally valid PDF whose cross-reference offsets are exact", () => {
    const pdf = asText(buildTicketPdf(sample(), "es"));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);

    const start = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(start, start + 4)).toBe("xref");

    const entries = [...pdf.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThanOrEqual(6);
    entries.forEach((offset, index) => {
      expect(pdf.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(`${index + 1} 0 obj`);
    });
  });

  it("declares the right length for every content stream", () => {
    const pdf = asText(buildTicketPdf(sample(), "es"));
    for (const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
      expect(match[2].length).toBe(Number(match[1]));
    }
  });

  it("includes the order, the items, the totals and the sample-receipt notice", () => {
    const pdf = asText(buildTicketPdf(sample(), "es"));
    expect(pdf).toContain("DEMO-46DE52C0");
    expect(pdf).toContain("Portavelas de vidrio \\(Transparente\\)");
    expect(pdf).toContain("COMPROBANTE DE EJEMPLO");
    expect(pdf).toContain("SIM-EXP-2446094102");
    expect(pdf).toContain("Calle Ejemplo 123");
    // whole amounts are shown without decimals: total 348 = 249 + 99 shipping
    expect(pdf).toContain("($348)");
    expect(pdf).toContain("($249)");
    expect(pdf).toContain("($99)");
  });

  it("writes accents and ñ as single WinAnsi bytes and escapes parentheses", () => {
    const pdf = asText(
      buildTicketPdf(sample({ items: [{ name: { es: "Camiseta básica niño (grande)", en: "x" }, attrs: null, quantity: 2, unit_price_cents: 5000, seller: null }] }), "es")
    );
    expect(pdf).toContain("Camiseta básica niño \\(grande\\)");
  });

  it("is available in English", () => {
    const pdf = asText(buildTicketPdf(sample(), "en"));
    expect(pdf).toContain("Purchase receipt");
    expect(pdf).toContain("SAMPLE RECEIPT");
    expect(pdf).toContain("Glass candle holder");
  });

  it("shows the discount line only when there is a discount", () => {
    expect(asText(buildTicketPdf(sample(), "es"))).not.toContain("Descuento");
    const withDiscount = asText(buildTicketPdf(sample({ discount_cents: 2500, promo_code: "BIENVENIDO10", total_cents: 32300 }), "es"));
    expect(withDiscount).toContain("Descuento \\(BIENVENIDO10\\)");
    expect(withDiscount).toContain("(-$25)");
  });

  it("continues on more pages when there are many items", () => {
    const items = Array.from({ length: 70 }, (_, i) => ({
      name: { es: `Producto de ejemplo número ${i + 1}`, en: `Sample product ${i + 1}` },
      attrs: null,
      quantity: 1,
      unit_price_cents: 1000,
      seller: "Negocio",
    }));
    const pdf = asText(buildTicketPdf(sample({ items }), "es"));
    const pages = Number(/\/Count (\d+)/.exec(pdf)?.[1]);
    expect(pages).toBeGreaterThan(1);
    expect(pdf).toContain(`Página ${pages}/${pages}`);
    expect(pdf).toContain("Producto de ejemplo número 70");
  });
});

describe("ticket helpers", () => {
  it("validates what the database returns", () => {
    expect(parseTicket(sample())?.order_number).toBe("DEMO-46DE52C0");
    expect(parseTicket(null)).toBeNull();
    expect(parseTicket({ order_number: "x" })).toBeNull();
  });

  it("labels items in the requested language with their variant", () => {
    const item = sample().items[0];
    expect(ticketItemLabel(item, "es")).toBe("Portavelas de vidrio (Transparente)");
    expect(ticketItemLabel(item, "en")).toBe("Glass candle holder (Transparente)");
  });

  it("reads the address from either snapshot shape", () => {
    expect(ticketAddressLines(sample())).toEqual(["Alumno Demo", "Calle Ejemplo 123", "Ciudad de México, CDMX, 06000", "MX"]);
    expect(ticketAddressLines(sample({ shipping_address: null }))).toEqual([]);
  });

  it("builds a safe file name", () => {
    expect(ticketFilename(sample({ order_number: "DEMO/../46" }))).toBe("comprobante-DEMO46.pdf");
  });
});

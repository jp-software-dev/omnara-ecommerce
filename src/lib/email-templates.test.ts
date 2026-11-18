import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/email-templates";

describe("email templates", () => {
  it("renders the order confirmation in both languages with the total", () => {
    const payload = { order_number: "ORD-1234", total_cents: 44_800, currency: "MXN" };
    const es = renderEmail("order_confirmation", "es", payload);
    const en = renderEmail("order_confirmation", "en", payload);

    expect(es?.subject).toBe("Pedido ORD-1234 confirmado");
    expect(en?.subject).toBe("Order ORD-1234 confirmed");
    expect(es?.html).toContain("448");
  });

  it("picks the product name in the recipient's language", () => {
    const payload = { order_number: "ORD-1", item_name: { es: "Playera", en: "Shirt" }, tracking_number: "GUIA-9" };
    expect(renderEmail("item_shipped", "es", payload)?.html).toContain("Playera");
    expect(renderEmail("item_shipped", "en", payload)?.html).toContain("Shirt");
    expect(renderEmail("item_shipped", "es", payload)?.html).toContain("GUIA-9");
  });

  it("escapes anything a person typed so it can't inject HTML", () => {
    const payload = {
      order_number: "ORD-1",
      item_name: { es: '<img src=x onerror="alert(1)">', en: "x" },
      note: "<script>alert(1)</script>",
      status: "rejected",
    };
    const shipped = renderEmail("new_sale", "es", payload);
    const status = renderEmail("return_status", "es", { ...payload, return_id: "r1" });

    expect(shipped?.html).not.toContain("<img");
    expect(shipped?.html).toContain("&lt;img");
    expect(status?.html).not.toContain("<script>");
    expect(status?.html).toContain("&lt;script&gt;");
  });

  it("explains a return outcome and shows the refund amount when it applies", () => {
    const refunded = renderEmail("return_status", "es", {
      order_number: "ORD-1",
      item_name: { es: "Playera", en: "Shirt" },
      status: "refunded",
      refund_amount_cents: 134_500,
      currency: "MXN",
      return_id: "r1",
    });
    expect(refunded?.html).toContain("reembolso fue enviado");
    expect(refunded?.html).toContain("1,345");
  });

  it("returns null for templates or states it doesn't know", () => {
    expect(renderEmail("does_not_exist", "es", {})).toBeNull();
    expect(renderEmail("return_status", "es", { status: "pending" })).toBeNull();
  });

  it("tells a rejected seller applicant why", () => {
    const email = renderEmail("application_decision", "es", {
      status: "rejected",
      business_name: "Mi Tienda",
      reason: "Falta una foto legible",
    });
    expect(email?.html).toContain("Falta una foto legible");
    expect(email?.subject).toContain("no fue aprobada");
  });

  it("marks every email as a demo, in the recipient's language", () => {
    const payload = { order_number: "ORD-1", total_cents: 100, currency: "MXN" };
    expect(renderEmail("order_confirmation", "es", payload)?.html).toContain("proyecto educativo de demostración");
    expect(renderEmail("order_confirmation", "en", payload)?.html).toContain("educational demo project");
    expect(renderEmail("new_sale", "en", { order_number: "ORD-1", item_name: { en: "x" } })?.html).toContain("educational demo project");
  });
});

describe("purchase confirmation with the full ticket", () => {
  const ticket = {
    order_id: "38f6bcc7-ba46-4c84-9372-94d49968733c",
    order_number: "DEMO-46DE52C0",
    created_at: "2026-11-13T01:54:30.996033+00:00",
    status: "paid",
    currency: "MXN",
    subtotal_cents: 24900,
    shipping_cents: 9900,
    discount_cents: 2500,
    promo_code: "BIENVENIDO10",
    total_cents: 32300,
    customer_email: "alumno.demo@example.com",
    shipping_address: { name: "Alumno Demo", address: { line1: "Calle Ejemplo 123", city: "Ciudad de México", state: "CDMX", postal_code: "06000", country: "MX" } },
    demo: true,
    has_account: false,
    items: [{ name: { es: "Portavelas <b>de</b> vidrio", en: "Glass candle holder" }, attrs: { color: "Transparente" }, quantity: 1, unit_price_cents: 24900, seller: "Café Estudiantil" }],
    shipments: [{ seller: "Café Estudiantil", status: "confirmed", tracking_number: null, estimated_delivery_at: "2026-11-18T20:00:00+00:00" }],
    estimated_delivery_at: "2026-11-18T20:00:00+00:00",
  };
  const payload = { order_number: "DEMO-46DE52C0", total_cents: 32300, currency: "MXN", ticket, view_path: "/es/checkout/confirmacion?demo_order=38f6bcc7&token=abc" };

  it("lists the items, discount, shipping, total, address and the estimated delivery", () => {
    const email = renderEmail("order_confirmation", "es", payload);
    expect(email?.subject).toBe("Pedido DEMO-46DE52C0 confirmado");
    const html = email?.html ?? "";
    expect(html).toContain("Café Estudiantil");
    expect(html).toContain("BIENVENIDO10");
    expect(html).toContain("Calle Ejemplo 123");
    expect(html).toContain("Entrega estimada");
    expect(html).toContain("COMPROBANTE DE EJEMPLO");
    expect(html).toContain("PDF");
  });

  it("escapes product names inside the HTML", () => {
    const html = renderEmail("order_confirmation", "es", payload)?.html ?? "";
    expect(html).not.toContain("<b>de</b>");
    expect(html).toContain("&lt;b&gt;de&lt;/b&gt;");
  });

  it("opens the order through the link it was given, and ignores one that is not a path", () => {
    expect(renderEmail("order_confirmation", "es", payload)?.html).toContain("/es/checkout/confirmacion?demo_order=38f6bcc7");
    const unsafe = renderEmail("order_confirmation", "es", { ...payload, view_path: "https://evil.example/x" })?.html ?? "";
    expect(unsafe).not.toContain("evil.example");
  });

  it("falls back to the short confirmation when the ticket is missing or invalid", () => {
    const short = renderEmail("order_confirmation", "es", { ...payload, ticket: { nope: true } });
    expect(short?.html).toContain("DEMO-46DE52C0");
    expect(short?.html).not.toContain("Entrega estimada");
  });

  it("is available in English", () => {
    const html = renderEmail("order_confirmation", "en", payload)?.html ?? "";
    expect(html).toContain("Glass candle holder");
    expect(html).toContain("SAMPLE RECEIPT");
    expect(html).toContain("Estimated delivery");
  });
});

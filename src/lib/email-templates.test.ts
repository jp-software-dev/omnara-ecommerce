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
});

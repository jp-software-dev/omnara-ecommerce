import { describe, expect, it } from "vitest";
import { withTicketCore, type TicketDb } from "@/lib/email-ticket-core";

const ORDER = "38f6bcc7-ba46-4c84-9372-94d49968733c";

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    order_id: ORDER,
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
    shipping_address: null,
    demo: true,
    has_account: false,
    items: [{ name: { es: "Portavelas de vidrio", en: "Glass candle holder" }, attrs: null, quantity: 1, unit_price_cents: 24900, seller: null }],
    shipments: [],
    estimated_delivery_at: null,
    ...overrides,
  };
}

/** A fake database: what the ticket function answers and which demo token the order has. */
function fakeDb(answer: { data: unknown; error: { message: string } | null }, demoToken: string | null = null) {
  const calls: string[] = [];
  const db: TicketDb = {
    rpc: (name, args) => {
      calls.push(`${name}:${args.p_order}`);
      return Promise.resolve(answer);
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: { demo_token: demoToken } }) }),
      }),
    }),
  };
  return { db, calls };
}

const payload = { order_id: ORDER, order_number: "DEMO-46DE52C0", total_cents: 34800, currency: "MXN" };

describe("withTicketCore", () => {
  it("leaves every other email alone and does not even ask the database", async () => {
    const { db, calls } = fakeDb({ data: ticket(), error: null });
    const result = await withTicketCore(db, "item_shipped", "es", payload);
    expect(result).toEqual({ payload, attachments: [] });
    expect(calls).toEqual([]);
  });

  it("leaves a confirmation without an order id alone", async () => {
    const { db } = fakeDb({ data: ticket(), error: null });
    const result = await withTicketCore(db, "order_confirmation", "es", { order_number: "X" });
    expect(result.attachments).toEqual([]);
    expect(result.payload).toEqual({ order_number: "X" });
  });

  it("adds the ticket, the account link and a real PDF for a signed-in buyer", async () => {
    const { db, calls } = fakeDb({ data: ticket({ has_account: true }), error: null });
    const result = await withTicketCore(db, "order_confirmation", "es", payload);
    expect(calls).toEqual([`order_ticket_for_email:${ORDER}`]);
    expect(result.payload.view_path).toBe(`/es/cuenta/pedidos/${ORDER}`);
    expect((result.payload.ticket as { order_number: string }).order_number).toBe("DEMO-46DE52C0");
    expect(result.payload.total_cents).toBe(34800);

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe("comprobante-DEMO-46DE52C0.pdf");
    const bytes = Buffer.from(result.attachments[0].content, "base64").toString("latin1");
    expect(bytes.startsWith("%PDF-1.4")).toBe(true);
    expect(bytes).toContain("Portavelas de vidrio");
  });

  it("links a guest to the confirmation page with the order token", async () => {
    const { db } = fakeDb({ data: ticket({ has_account: false }), error: null }, "tok-123");
    const result = await withTicketCore(db, "order_confirmation", "en", payload);
    expect(result.payload.view_path).toBe(`/en/checkout/confirmacion?demo_order=${ORDER}&token=tok-123`);
  });

  it("falls back to the home page for a guest order that has no token", async () => {
    const { db } = fakeDb({ data: ticket({ has_account: false }), error: null }, null);
    const result = await withTicketCore(db, "order_confirmation", "es", payload);
    expect(result.payload.view_path).toBe("/es");
  });

  it("sends the short confirmation when the ticket cannot be read or is not valid", async () => {
    const failing = fakeDb({ data: null, error: { message: "boom" } });
    expect(await withTicketCore(failing.db, "order_confirmation", "es", payload)).toEqual({ payload, attachments: [] });

    const missing = fakeDb({ data: null, error: null });
    expect(await withTicketCore(missing.db, "order_confirmation", "es", payload)).toEqual({ payload, attachments: [] });

    const broken = fakeDb({ data: { nope: true }, error: null });
    expect(await withTicketCore(broken.db, "order_confirmation", "es", payload)).toEqual({ payload, attachments: [] });
  });
});

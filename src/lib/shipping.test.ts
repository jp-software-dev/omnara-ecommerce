import { describe, expect, it } from "vitest";
import {
  carrierName,
  computeShippingBySeller,
  generateSimulatedTracking,
  isSimulatedTracking,
  SHIPMENT_STEPS,
  shipmentNoticeText,
  shipmentStepLabel,
} from "@/lib/shipping";

describe("simulated tracking numbers", () => {
  it("generates a recognizable SIM- number for the chosen carrier", () => {
    const tracking = generateSimulatedTracking("DPQ", () => 0.5);
    expect(tracking).toBe("SIM-DPQ-5555555555");
    expect(isSimulatedTracking(tracking)).toBe(true);
    expect(carrierName(tracking)).toBe("DemoPaq");
  });

  it("does not treat real-looking numbers as simulated", () => {
    expect(isSimulatedTracking("1Z999AA10123456784")).toBe(false);
    expect(isSimulatedTracking(null)).toBe(false);
    expect(carrierName("1Z999AA10123456784")).toBeNull();
  });
});

describe("shipment steps", () => {
  it("has the eight steps of the cycle in order, ending when the customer closes it", () => {
    expect(SHIPMENT_STEPS).toEqual([
      "confirmed",
      "preparing",
      "shipped",
      "in_transit",
      "arrived_state",
      "out_for_delivery",
      "delivered",
      "completed",
    ]);
  });

  it("labels every step in both languages", () => {
    for (const step of [...SHIPMENT_STEPS, "cancelled"]) {
      expect(shipmentStepLabel(step, "es")).not.toBe(step);
      expect(shipmentStepLabel(step, "en")).not.toBe(step);
    }
    expect(shipmentStepLabel("arrived_state", "es")).toBe("Ya llegó a tu estado");
  });

  it("falls back to the raw key for an unknown step", () => {
    expect(shipmentStepLabel("teleported", "es")).toBe("teleported");
  });
});

describe("shipmentNoticeText", () => {
  it("explains a delay with the new estimated date", () => {
    expect(shipmentNoticeText({ kind: "delay", until: "x" }, "es", "mar 24 de nov, 02:00 p.m.")).toBe(
      "Tu envío tiene un retraso. Nueva entrega estimada: mar 24 de nov, 02:00 p.m."
    );
    expect(shipmentNoticeText({ kind: "failed_attempt", until: "x" }, "en", "Tue, Nov 24")).toBe(
      "We couldn't deliver your order on the first attempt. New estimated delivery: Tue, Nov 24."
    );
  });

  it("does not invent a date when there is none", () => {
    expect(shipmentNoticeText({ kind: "delay", until: null }, "es", null)).toBe("Tu envío tiene un retraso.");
  });

  it("says a paused shipment will continue and what to do about damage", () => {
    expect(shipmentNoticeText({ kind: "paused", until: null }, "es", null)).toContain("en pausa");
    expect(shipmentNoticeText({ kind: "damaged", until: null }, "en", null)).toContain("request a return");
  });
});

describe("computeShippingBySeller", () => {
  const FREE = 150000;
  const FLAT = 9900;

  it("charges one flat rate per seller and treats products without a seller as Omnara's", () => {
    const quote = computeShippingBySeller(
      [
        { sellerId: "a", amountCents: 20000 },
        { sellerId: "b", amountCents: 30000 },
        { sellerId: null, amountCents: 10000 },
        { sellerId: undefined, amountCents: 5000 },
      ],
      FREE,
      FLAT
    );
    expect(quote.shipments).toBe(3);
    expect(quote.totalCents).toBe(3 * FLAT);
  });

  it("makes a package free only when that seller's own part reaches the threshold", () => {
    const quote = computeShippingBySeller(
      [
        { sellerId: "a", amountCents: 100000 },
        { sellerId: "a", amountCents: 50000 },
        { sellerId: "b", amountCents: 140000 },
      ],
      FREE,
      FLAT
    );
    expect(quote.perSeller.find((group) => group.sellerId === "a")?.shippingCents).toBe(0);
    expect(quote.perSeller.find((group) => group.sellerId === "b")?.shippingCents).toBe(FLAT);
    expect(quote.totalCents).toBe(FLAT);
  });

  it("charges nothing for an empty cart", () => {
    expect(computeShippingBySeller([], FREE, FLAT)).toEqual({ totalCents: 0, shipments: 0, perSeller: [] });
  });
});

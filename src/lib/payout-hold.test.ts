import { describe, expect, it } from "vitest";
import { holdReason, holdReasonText } from "@/lib/payout-hold";

const base = { completed_at: null, shipmentStatus: "in_transit", returnStatus: null };

describe("holdReason", () => {
  it("puts an open or refunded return before anything else", () => {
    for (const status of ["requested", "approved", "escalated", "refunded"]) {
      expect(holdReason({ ...base, shipmentStatus: "delivered", returnStatus: status })).toEqual({ kind: "return", status });
    }
  });

  it("ignores a return that was rejected or closed", () => {
    expect(holdReason({ ...base, shipmentStatus: "delivered", returnStatus: "rejected" })).toEqual({ kind: "awaiting_customer" });
    expect(holdReason({ ...base, shipmentStatus: "delivered", returnStatus: "closed" })).toEqual({ kind: "awaiting_customer" });
  });

  it("tells a delivered item (customer has not confirmed) from one still on its way", () => {
    expect(holdReason({ ...base, shipmentStatus: "delivered" })).toEqual({ kind: "awaiting_customer" });
    expect(holdReason(base)).toEqual({ kind: "in_progress", status: "in_transit" });
    expect(holdReason({ ...base, shipmentStatus: null })).toEqual({ kind: "no_shipment" });
  });
});

describe("holdReasonText", () => {
  it("explains each reason in both languages", () => {
    expect(holdReasonText({ kind: "awaiting_customer" }, "es")).toContain("confirme");
    expect(holdReasonText({ kind: "awaiting_customer" }, "en")).toContain("confirm");
    expect(holdReasonText({ kind: "return", status: "requested" }, "es")).toContain("pendiente de tu decisión");
    expect(holdReasonText({ kind: "in_progress", status: "in_transit" }, "es")).toContain("En tránsito");
    expect(holdReasonText({ kind: "no_shipment" }, "en")).toBe("Waiting to be shipped.");
  });
});

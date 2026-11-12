import { describe, expect, it } from "vitest";
import {
  isReturnEligible,
  isSettled,
  reasonLabel,
  returnErrorMessage,
  RETURN_WINDOW_DAYS,
  statusLabel,
} from "@/lib/returns";

const DAY = 24 * 60 * 60 * 1000;
const shippedAt = "2026-11-01T12:00:00.000Z";
const shippedMs = new Date(shippedAt).getTime();

describe("return eligibility", () => {
  it("allows a shipped item of a paid or fulfilled order inside the window", () => {
    expect(isReturnEligible({ shipped_at: shippedAt }, "paid", shippedMs + DAY)).toBe(true);
    expect(isReturnEligible({ shipped_at: shippedAt }, "fulfilled", shippedMs + DAY)).toBe(true);
  });

  it("includes the last moment of the window and excludes anything after it", () => {
    const deadline = shippedMs + RETURN_WINDOW_DAYS * DAY;
    expect(isReturnEligible({ shipped_at: shippedAt }, "paid", deadline)).toBe(true);
    expect(isReturnEligible({ shipped_at: shippedAt }, "paid", deadline + 1)).toBe(false);
  });

  it("rejects unshipped items and orders that are not paid", () => {
    expect(isReturnEligible({ shipped_at: null }, "paid", shippedMs)).toBe(false);
    expect(isReturnEligible({}, "paid", shippedMs)).toBe(false);
    for (const status of ["pending", "cancelled", "refunded"]) {
      expect(isReturnEligible({ shipped_at: shippedAt }, status, shippedMs)).toBe(false);
    }
  });
});

describe("return labels and states", () => {
  it("labels reasons and statuses in both languages", () => {
    expect(reasonLabel("damaged", "es")).toBe("Llegó dañado");
    expect(reasonLabel("damaged", "en")).toBe("Arrived damaged");
    expect(statusLabel("escalated", "en")).toContain("dispute");
  });

  it("falls back to the raw key for something unknown", () => {
    expect(reasonLabel("alien", "es")).toBe("alien");
  });

  it("treats only refunded and closed as settled", () => {
    expect(isSettled("refunded")).toBe(true);
    expect(isSettled("closed")).toBe(true);
    for (const status of ["requested", "approved", "rejected", "escalated"]) {
      expect(isSettled(status)).toBe(false);
    }
  });
});

describe("return error messages", () => {
  it("turns database exceptions into readable text", () => {
    expect(returnErrorMessage("Return window has closed", "es")).toContain("30 días");
    expect(returnErrorMessage("Return window has closed", "en")).toContain("30-day");
    expect(returnErrorMessage("A return was already requested for this item", "es")).toContain("Ya pediste");
  });

  it("passes unknown messages through unchanged", () => {
    expect(returnErrorMessage("something unexpected", "es")).toBe("something unexpected");
  });
});

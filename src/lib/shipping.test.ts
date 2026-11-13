import { describe, expect, it } from "vitest";
import {
  carrierName,
  generateSimulatedTracking,
  isSimulatedTracking,
  trackingTimeline,
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

describe("trackingTimeline", () => {
  const shipped = "2026-11-10T12:00:00Z";
  const at = (hours: number) => Date.parse(shipped) + hours * 3_600_000;

  it("only the pickup is done right after shipping", () => {
    expect(trackingTimeline(shipped, at(0)).map((s) => s.done)).toEqual([true, false, false, false]);
  });

  it("advances with time and ends delivered after 60 hours", () => {
    expect(trackingTimeline(shipped, at(13)).map((s) => s.done)).toEqual([true, true, false, false]);
    expect(trackingTimeline(shipped, at(60)).map((s) => s.done)).toEqual([true, true, true, true]);
  });
});

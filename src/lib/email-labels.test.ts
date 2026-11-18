import { describe, expect, it } from "vitest";
import { durationLabel, emailTemplateLabel } from "@/lib/email-labels";

describe("emailTemplateLabel", () => {
  it("names the templates in both languages", () => {
    expect(emailTemplateLabel("shipment_update", "es")).toBe("Avance del envío");
    expect(emailTemplateLabel("shipment_update", "en")).toBe("Shipment update");
    expect(emailTemplateLabel("order_confirmation", "es")).toContain("ticket");
  });

  it("falls back to the key for an unknown template", () => {
    expect(emailTemplateLabel("brand_new", "es")).toBe("brand_new");
  });
});

describe("durationLabel", () => {
  it("uses minutes, hours and days", () => {
    expect(durationLabel(5)).toBe("5 min");
    expect(durationLabel(180)).toBe("3 h");
    expect(durationLabel(5 * 24 * 60)).toBe("5 d");
  });
  it("never goes negative", () => {
    expect(durationLabel(-20)).toBe("0 min");
  });
});

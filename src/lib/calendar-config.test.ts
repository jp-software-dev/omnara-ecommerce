import { describe, expect, it } from "vitest";
import { calendarSchema, holidaySchema, minutesLabel, stepRuleSchema } from "@/lib/calendar-config";

describe("calendarSchema", () => {
  it("accepts a normal week", () => {
    expect(calendarSchema.safeParse({ businessStart: "08:00", businessEnd: "20:00", workingDays: [1, 2, 3, 4, 5, 6] }).success).toBe(true);
  });

  it("rejects hours in the wrong order or format, and weeks without days", () => {
    expect(calendarSchema.safeParse({ businessStart: "20:00", businessEnd: "08:00", workingDays: [1] }).success).toBe(false);
    expect(calendarSchema.safeParse({ businessStart: "8am", businessEnd: "20:00", workingDays: [1] }).success).toBe(false);
    expect(calendarSchema.safeParse({ businessStart: "08:00", businessEnd: "20:00", workingDays: [] }).success).toBe(false);
    expect(calendarSchema.safeParse({ businessStart: "08:00", businessEnd: "20:00", workingDays: [1, 1] }).success).toBe(false);
    expect(calendarSchema.safeParse({ businessStart: "08:00", businessEnd: "20:00", workingDays: [8] }).success).toBe(false);
  });
});

describe("holidaySchema", () => {
  it("needs a real date and a name", () => {
    expect(holidaySchema.safeParse({ day: "2026-12-25", name: "Navidad" }).success).toBe(true);
    expect(holidaySchema.safeParse({ day: "25/12/2026", name: "Navidad" }).success).toBe(false);
    expect(holidaySchema.safeParse({ day: "2026-13-45", name: "Navidad" }).success).toBe(false);
    expect(holidaySchema.safeParse({ day: "2026-12-25", name: " " }).success).toBe(false);
  });
});

describe("stepRuleSchema", () => {
  it("limits a step to between 0 minutes and 10 days", () => {
    const ok = { status: "in_transit", offsetMinutes: 360, businessHoursOnly: true };
    expect(stepRuleSchema.safeParse(ok).success).toBe(true);
    expect(stepRuleSchema.safeParse({ ...ok, offsetMinutes: -1 }).success).toBe(false);
    expect(stepRuleSchema.safeParse({ ...ok, offsetMinutes: 14_401 }).success).toBe(false);
    expect(stepRuleSchema.safeParse({ ...ok, offsetMinutes: 1.5 }).success).toBe(false);
    expect(stepRuleSchema.safeParse({ ...ok, status: "completed" }).success).toBe(false);
  });
});

describe("minutesLabel", () => {
  it("writes minutes as days, hours and minutes", () => {
    expect(minutesLabel(0)).toBe("0 min");
    expect(minutesLabel(90)).toBe("1 h 30 min");
    expect(minutesLabel(1440)).toBe("1 d");
    expect(minutesLabel(2160)).toBe("1 d 12 h");
  });
});

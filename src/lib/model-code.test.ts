import { describe, expect, it } from "vitest";
import { escapeLike, normalizeModelCode, sameModel } from "@/lib/model-code";

describe("model code", () => {
  it("normalizes spacing and ignores non-strings", () => {
    expect(normalizeModelCode("  WH-1000   XM5 ")).toBe("WH-1000 XM5");
    expect(normalizeModelCode(42)).toBe("");
    expect(normalizeModelCode(undefined)).toBe("");
  });

  it("matches the same model regardless of case and spacing", () => {
    expect(sameModel("wh-1000xm5", " WH-1000XM5 ")).toBe(true);
    expect(sameModel("A1", "A2")).toBe(false);
  });

  it("never matches an empty model code", () => {
    expect(sameModel("", "")).toBe(false);
    expect(sameModel(null, undefined)).toBe(false);
  });

  it("escapes LIKE wildcards so codes are compared literally", () => {
    expect(escapeLike("100%_X")).toBe("100\\%\\_X");
  });
});

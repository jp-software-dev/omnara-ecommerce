import { describe, expect, it } from "vitest";
import { countInRange, sha1Parts } from "@/lib/pwned";

describe("sha1Parts", () => {
  it("splits the SHA-1 of a known password into a 5-char prefix and the rest", () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    expect(sha1Parts("password")).toEqual({
      prefix: "5BAA6",
      suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8",
    });
  });
});

describe("countInRange", () => {
  const body = "0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:10434004\r\n011053FD0102E94D6AE2F8B83D76FAF94F6:0";

  it("returns the breach count when the suffix is listed", () => {
    expect(countInRange(body, "1E4C9B93F3F0682250B6CF8331B7EE68FD8")).toBe(10434004);
  });

  it("is case-insensitive", () => {
    expect(countInRange(body, "1e4c9b93f3f0682250b6cf8331b7ee68fd8")).toBe(10434004);
  });

  it("returns 0 when the suffix is not listed, and treats padded zero rows as clean", () => {
    expect(countInRange(body, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toBe(0);
    expect(countInRange(body, "011053FD0102E94D6AE2F8B83D76FAF94F6")).toBe(0);
  });
});

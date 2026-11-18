import { describe, expect, it } from "vitest";
import { hasAuthCookie, withFavorite } from "@/stores/wishlist-store";

describe("hasAuthCookie", () => {
  it("detects the Supabase session cookie, whole or chunked", () => {
    expect(hasAuthCookie("theme=dark; sb-abcdef-auth-token=xyz; NEXT_LOCALE=es")).toBe(true);
    expect(hasAuthCookie("sb-abcdef-auth-token.0=part1; sb-abcdef-auth-token.1=part2")).toBe(true);
  });

  it("is false for anonymous visitors and unrelated cookies", () => {
    expect(hasAuthCookie("")).toBe(false);
    expect(hasAuthCookie("NEXT_LOCALE=en; theme=dark")).toBe(false);
    expect(hasAuthCookie("not-sb-token=1")).toBe(false);
  });
});

describe("withFavorite", () => {
  it("adds a product once and removes it", () => {
    expect(withFavorite([], "p1", true)).toEqual(["p1"]);
    expect(withFavorite(["p1"], "p1", true)).toEqual(["p1"]);
    expect(withFavorite(["p1", "p2"], "p1", false)).toEqual(["p2"]);
    expect(withFavorite(["p2"], "p1", false)).toEqual(["p2"]);
  });

  it("does not change the list it receives", () => {
    const ids = ["p1"];
    withFavorite(ids, "p2", true);
    expect(ids).toEqual(["p1"]);
  });
});

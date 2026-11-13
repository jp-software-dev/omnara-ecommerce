// "Same item" comparison: two products from different businesses are the exact same
// item when they carry the same model code (the `modelo` attribute). The match is
// case- and spacing-insensitive, so "wh-1000xm5" equals " WH-1000XM5 ".

export function normalizeModelCode(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Escapes LIKE wildcards so a model code is compared literally with ilike. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function sameModel(a: unknown, b: unknown): boolean {
  const left = normalizeModelCode(a).toLowerCase();
  return left !== "" && left === normalizeModelCode(b).toLowerCase();
}

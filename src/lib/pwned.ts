import { createHash } from "node:crypto";

/**
 * Leaked-password check using the Have I Been Pwned "range" API with k-anonymity:
 * only the first 5 characters of the password's SHA-1 hash ever leave the server,
 * never the password or the full hash. The API answers with every known suffix for
 * that prefix and the comparison happens here.
 */
export function sha1Parts(password: string): { prefix: string; suffix: string } {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  return { prefix: hash.slice(0, 5), suffix: hash.slice(5) };
}

/** Parses a range response ("SUFFIX:COUNT" per line) and returns how often the suffix appears. */
export function countInRange(body: string, suffix: string): number {
  for (const line of body.split(/\r?\n/)) {
    const [candidate, count] = line.trim().split(":");
    if (candidate?.toUpperCase() === suffix.toUpperCase()) {
      const parsed = Number.parseInt(count ?? "0", 10);
      return Number.isFinite(parsed) ? parsed : 1;
    }
  }
  return 0;
}

/**
 * True when the password appears in a known breach. Fails OPEN (returns false) when
 * the service is unreachable, so a third-party outage never blocks sign-ups.
 */
export async function isPasswordLeaked(password: string): Promise<boolean> {
  const { prefix, suffix } = sha1Parts(password);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    return countInRange(await response.text(), suffix) > 0;
  } catch {
    return false;
  }
}

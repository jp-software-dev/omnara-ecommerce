import "server-only";
import Stripe from "stripe";

function assertTestKey(key: string | undefined, name: string): string {
  if (!key) {
    throw new Error(`${name} is not set.`);
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error(
      `${name} must be a Stripe TEST key (sk_test_/rk_test_). Refusing to start with a live key — this project must never process a real charge.`
    );
  }
  return key;
}

let cachedStripe: Stripe | null = null;

// Lazy on purpose: constructing this at module scope means Next.js throws
// during build-time page-data collection for any server component that
// imports it, even ones that never actually call Stripe during that pass.
export function getStripe(): Stripe {
  if (!cachedStripe) {
    cachedStripe = new Stripe(
      assertTestKey(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
      { apiVersion: "2026-07-29.dahlia" }
    );
  }
  return cachedStripe;
}

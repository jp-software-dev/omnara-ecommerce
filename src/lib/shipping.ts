// Flat demo shipping rate — a real deployment would price this per carrier/zone.
export const FLAT_SHIPPING_MXN_CENTS = 9900;

export function computeShippingCents(
  subtotalCents: number,
  freeThresholdCents: number,
  flatRateCents: number
) {
  return subtotalCents >= freeThresholdCents ? 0 : flatRateCents;
}

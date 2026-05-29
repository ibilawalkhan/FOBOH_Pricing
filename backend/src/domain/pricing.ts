import type { ProfileAdjustment } from '../schemas/index.js';

/**
 * Apply a profile's adjustment to a product's base price.
 *
 * All math is in integer cents. For dynamic mode the delta is
 * Math.round(base * percent / 100) so percentages produce exact integer cents
 * and we never carry a floating-point residue across composition.
 *
 * Caller is responsible for the clamp; this returns the raw signed result.
 */
export function applyAdjustment(
  productId: string,
  basePriceCents: number,
  adjustment: ProfileAdjustment,
): number {
  switch (adjustment.mode) {
    case 'fixed': {
      const delta = adjustment.amountCents;
      return adjustment.direction === 'increase'
        ? basePriceCents + delta
        : basePriceCents - delta;
    }
    case 'dynamic': {
      const delta = Math.round((basePriceCents * adjustment.percent) / 100);
      return adjustment.direction === 'increase'
        ? basePriceCents + delta
        : basePriceCents - delta;
    }
    case 'custom': {
      const custom = adjustment.fixedPricesCents[productId];
      // If a product isn't priced in the custom map, the adjustment doesn't
      // apply — fall back to base. The resolver shouldn't have picked this
      // profile in the first place if the product wasn't in `selection`, but
      // the two lists can in principle diverge, so handle defensively.
      return custom ?? basePriceCents;
    }
  }
}

/**
 * Never let a final price go negative. Selling at $0 is suspicious but valid;
 * selling at -$5 is a bug.
 */
export function clampToZero(cents: number): { cents: number; clamped: boolean } {
  if (cents < 0) return { cents: 0, clamped: true };
  return { cents, clamped: false };
}

/**
 * Integer-cents → dollars (2dp) for response serialisation. Uses a Number-based
 * round to 2dp; safe because we're only consumed by the JSON boundary.
 */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

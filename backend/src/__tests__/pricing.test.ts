import { describe, it, expect } from 'vitest';
import { applyAdjustment, clampToZero, centsToDollars } from '../domain/pricing.js';

describe('applyAdjustment', () => {
  it('fixed decrease subtracts integer cents', () => {
    const result = applyAdjustment('KOYBRUNV6', 12000, {
      mode: 'fixed',
      direction: 'decrease',
      amountCents: 1500,
    });
    expect(result).toBe(10500);
  });

  it('fixed increase adds integer cents', () => {
    const result = applyAdjustment('KOYBRUNV6', 12000, {
      mode: 'fixed',
      direction: 'increase',
      amountCents: 500,
    });
    expect(result).toBe(12500);
  });

  it('dynamic decrease — 10% off $120 = $108 exactly', () => {
    const result = applyAdjustment('KOYBRUNV6', 12000, {
      mode: 'dynamic',
      direction: 'decrease',
      percent: 10,
    });
    expect(result).toBe(10800);
  });

  it('dynamic increase rounds half-away-from-zero', () => {
    // 27906 * 7% = 1953.42 -> rounds to 1953
    const result = applyAdjustment('HGVPIN216', 27906, {
      mode: 'dynamic',
      direction: 'increase',
      percent: 7,
    });
    expect(result).toBe(27906 + 1953);
  });

  it('custom returns the configured value for the product', () => {
    const result = applyAdjustment('KOYBRUNV6', 12000, {
      mode: 'custom',
      fixedPricesCents: { KOYBRUNV6: 9500 },
    });
    expect(result).toBe(9500);
  });
});

describe('clampToZero', () => {
  it('clamps negative to 0 and flags clamped', () => {
    const base = 1000; // $10
    const after = base - 2000; // -$10
    const { cents, clamped } = clampToZero(after);
    expect(cents).toBe(0);
    expect(clamped).toBe(true);
  });

  it('passes positive values through', () => {
    const { cents, clamped } = clampToZero(5000);
    expect(cents).toBe(5000);
    expect(clamped).toBe(false);
  });
});

describe('centsToDollars', () => {
  it('converts integer cents to a 2dp dollar number', () => {
    expect(centsToDollars(9500)).toBe(95);
    expect(centsToDollars(10800)).toBe(108);
    expect(centsToDollars(12345)).toBe(123.45);
  });
});

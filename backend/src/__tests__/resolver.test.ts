import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type Store } from '../data/seed.js';
import { resolvePrice, isResolveError } from '../domain/resolver.js';

describe('resolver — Bondi scenario', () => {
  let store: Store;
  beforeEach(() => {
    store = createStore();
  });

  it('Bondi + KOYBRUNV6 -> $95 via profile-c (customer tier)', () => {
    const result = resolvePrice('bondi-cellars', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(9500);
    expect(result.price).toBe(95);
    expect(result.sourceProfileId).toBe('profile-c');
    expect(result.reason.tier).toBe('customer');
  });

  it('Green Grocer (IR only) + KOYBRUNV6 -> $108 via profile-a (group tier, 10% off)', () => {
    const result = resolvePrice('green-grocer', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(10800);
    expect(result.sourceProfileId).toBe('profile-a');
    expect(result.reason.tier).toBe('group');
  });

  it('Harbour Hotel (VIP only) + KOYBRUNV6 -> $105 via profile-b ($15 off)', () => {
    const result = resolvePrice('harbour-hotel', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(10500);
    expect(result.sourceProfileId).toBe('profile-b');
    expect(result.reason.tier).toBe('group');
  });

  it('Green Grocer + HGVPIN216 (Pinot Noir/Red) -> 10% off via profile-a', () => {
    const result = resolvePrice('green-grocer', 'HGVPIN216', store);
    if (isResolveError(result)) throw new Error('expected success');
    // 27906 * 10% = 2790.6 -> 2791. 27906 - 2791 = 25115.
    expect(result.priceCents).toBe(27906 - Math.round((27906 * 10) / 100));
    expect(result.sourceProfileId).toBe('profile-a');
    expect(result.reason.tier).toBe('group');
  });

  it('Corner Store (no groups) + KOYBRUNV6 -> base price, no profile', () => {
    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(12000);
    expect(result.sourceProfileId).toBeNull();
    expect(result.reason.tier).toBe('none');
  });

  it('Bondi + a deleted product -> product-not-found', () => {
    // Mark KOYBRUNV6 as deleted via a fresh patched store
    const patched: Store = {
      ...store,
      getProductById: (id: string) => {
        const p = store.getProductById(id);
        if (!p) return undefined;
        if (id === 'KOYBRUNV6') return { ...p, isDeleted: true };
        return p;
      },
    };
    const result = resolvePrice('bondi-cellars', 'KOYBRUNV6', patched);
    expect(isResolveError(result)).toBe(true);
    if (isResolveError(result)) {
      expect(result.error).toBe('product-not-found');
    }
  });

  it('Unknown product -> product-not-found', () => {
    const result = resolvePrice('bondi-cellars', 'NOSUCH', store);
    expect(isResolveError(result)).toBe(true);
    if (isResolveError(result)) expect(result.error).toBe('product-not-found');
  });

  it('Unknown customer -> customer-not-found', () => {
    const result = resolvePrice('nobody', 'KOYBRUNV6', store);
    expect(isResolveError(result)).toBe(true);
    if (isResolveError(result)) expect(result.error).toBe('customer-not-found');
  });

  it('clamped-to-zero is exposed when a fixed decrease swamps the base', () => {
    // Add a profile that subtracts $1000 from KOYBRUNV6 for Corner Store directly.
    const ts = new Date().toISOString();
    store.addProfile({
      id: 'profile-clamp',
      name: 'clamp test',
      description: '',
      scope: { type: 'customer', customerId: 'corner-store' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'fixed', direction: 'decrease', amountCents: 100000 },
      createdAt: ts,
      updatedAt: ts,
    });
    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(0);
    expect(result.clampedToZero).toBe(true);
  });
});

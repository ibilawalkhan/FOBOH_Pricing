import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type Store } from '../data/seed.js';
import { resolvePrice, isResolveError } from '../domain/resolver.js';
import type { PricingProfile } from '../schemas/index.js';

/**
 * Tiebreakers (inside the winning tier) are applied in order:
 *   (a) custom adjustment beats fixed/dynamic              -> 'custom-beats-adjustment'
 *   (b) products-selection beats all-products selection    -> 'narrower-selection'
 *   (c) most recent updatedAt                              -> 'updatedAt'
 *
 * The seed already covers the Bondi (Tier 1) scenario without tiebreakers
 * because there's only one customer-scoped profile. These tests construct
 * collisions at the same tier deliberately.
 */
describe('resolver — tiebreakers within the winning tier', () => {
  let store: Store;
  beforeEach(() => {
    store = createStore();
  });

  it('(a) custom-mode profile beats a dynamic/fixed adjustment at the same tier', () => {
    // Add a second customer-tier profile for Bondi on KOYBRUNV6 with a -50% dynamic adjustment.
    // It would produce $60. profile-c (custom $95) must still win — custom beats adjustment.
    const competing: PricingProfile = {
      id: 'profile-bondi-dynamic',
      name: 'Bondi 50% off Koyama',
      description: 'should lose to profile-c via custom-beats-adjustment',
      scope: { type: 'customer', customerId: 'bondi-cellars' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 50 },
      createdAt: '2026-06-01T00:00:00.000Z', // newer than profile-c
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(competing);

    const result = resolvePrice('bondi-cellars', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(9500);
    expect(result.sourceProfileId).toBe('profile-c');
    expect(result.reason.tiebreaker).toBe('custom-beats-adjustment');
  });

  it('(b) narrower selection (products) beats wider selection (all) at the same tier', () => {
    // Build two profiles for Corner Store (no groups → only Tier 3 is reachable normally).
    // We add two all-tier profiles: one with selection=all, one with selection=products containing KOYBRUNV6.
    // Both same mode (dynamic decrease) to keep tiebreaker (a) inert.
    const wide: PricingProfile = {
      id: 'profile-all-everything-5pct',
      name: 'All customers, all products -5%',
      description: 'wider scope, should lose tiebreaker (b)',
      scope: { type: 'all' },
      selection: { type: 'all' },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 5 },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const narrow: PricingProfile = {
      id: 'profile-all-koyama-3pct',
      name: 'All customers, Koyama Methode only -3%',
      description: 'narrower scope, should win tiebreaker (b)',
      scope: { type: 'all' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 3 },
      createdAt: '2026-05-15T00:00:00.000Z', // older — proves narrower beats recency
      updatedAt: '2026-05-15T00:00:00.000Z',
    };
    store.addProfile(wide);
    store.addProfile(narrow);

    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    // 3% off $120 = $116.40 -> 11640 cents
    expect(result.priceCents).toBe(11640);
    expect(result.sourceProfileId).toBe('profile-all-koyama-3pct');
    expect(result.reason.tier).toBe('all');
    expect(result.reason.tiebreaker).toBe('narrower-selection');
  });

  it('(c) most recent updatedAt wins when (a) and (b) leave the pool unchanged', () => {
    // Two Tier-3 profiles, both with selection.type=products and same mode — only recency separates them.
    const older: PricingProfile = {
      id: 'profile-all-older',
      name: 'All customers, products list, 5% off, older',
      description: 'should lose to recency',
      scope: { type: 'all' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 5 },
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
    };
    const newer: PricingProfile = {
      id: 'profile-all-newer',
      name: 'All customers, products list, 7% off, newer',
      description: 'should win via updatedAt',
      scope: { type: 'all' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 7 },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(older);
    store.addProfile(newer);

    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    // 7% off $120 = $111.60 -> 11160 cents
    expect(result.priceCents).toBe(11160);
    expect(result.sourceProfileId).toBe('profile-all-newer');
    expect(result.reason.tiebreaker).toBe('updatedAt');
  });

  it('tier separation: a customer-tier profile beats group-tier profiles even when group offers a lower price', () => {
    // Add an explicit customer-tier profile for Green Grocer that gives a *worse* deal than profile-a (10% off).
    // The customer-tier profile must still win — most-specific-wins is not "best price for customer".
    const premium: PricingProfile = {
      id: 'profile-green-grocer-flat-115',
      name: 'Green Grocer flat $115 on Koyama Methode',
      description: 'customer-specific premium price — must win over Tier 2',
      scope: { type: 'customer', customerId: 'green-grocer' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'custom', fixedPricesCents: { KOYBRUNV6: 11500 } },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(premium);

    const result = resolvePrice('green-grocer', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(11500); // not $108 from profile-a
    expect(result.sourceProfileId).toBe('profile-green-grocer-flat-115');
    expect(result.reason.tier).toBe('customer');
  });

  it('0% dynamic adjustment returns base price unchanged', () => {
    const noop: PricingProfile = {
      id: 'profile-zero',
      name: '0% off — should be a no-op',
      description: 'staging-state profile',
      scope: { type: 'customer', customerId: 'corner-store' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'dynamic', direction: 'decrease', percent: 0 },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(noop);

    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(12000);
    expect(result.sourceProfileId).toBe('profile-zero');
  });

  it('$0 fixed adjustment returns base price unchanged', () => {
    const noop: PricingProfile = {
      id: 'profile-zero-fixed',
      name: '$0 off — should be a no-op',
      description: 'staging-state profile',
      scope: { type: 'customer', customerId: 'corner-store' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'fixed', direction: 'decrease', amountCents: 0 },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(noop);

    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(12000);
    expect(result.sourceProfileId).toBe('profile-zero-fixed');
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { createApp } from '../server.js';
import { createStore, type Store } from '../data/seed.js';
import { resolvePrice, isResolveError } from '../domain/resolver.js';
import { CreatePricingProfileSchema } from '../schemas/index.js';
import type { PricingProfile } from '../schemas/index.js';

/**
 * Regression coverage for the devil's-advocate findings:
 *   1. Empty custom-map profile silently winning custom-beats-adjustment
 *   2. JSON parse errors leaking Express's default HTML stack trace
 *   3. Selection.type=all with custom mode is incoherent
 */
describe('hardening — empty custom-map profile cannot poison resolution', () => {
  let store: Store;
  beforeEach(() => {
    store = createStore();
  });

  it('a custom-mode profile that does not price the productId does not match', () => {
    // Bypass the create schema by injecting directly into the store (simulates
    // a seed / migration / bad write that slips past validation).
    const poisoned: PricingProfile = {
      id: 'profile-poisoned',
      name: 'Custom but empty',
      description: 'should not match anything',
      scope: { type: 'all' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'custom', fixedPricesCents: {} },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    store.addProfile(poisoned);

    // Corner Store has no groups → only Tier 3 reachable. The poisoned profile
    // would have won the custom-beats-adjustment tiebreaker if `selectionContains`
    // didn't guard against it. With the guard it doesn't match at all.
    const result = resolvePrice('corner-store', 'KOYBRUNV6', store);
    if (isResolveError(result)) throw new Error('expected success');
    expect(result.priceCents).toBe(12000); // base price
    expect(result.sourceProfileId).toBeNull();
    expect(result.reason.tier).toBe('none');
  });

  it('CreatePricingProfileSchema rejects custom adjustment with empty fixedPricesCents for a selected product', () => {
    const bad = {
      name: 'Custom but empty',
      scope: { type: 'all' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'custom', fixedPricesCents: {} },
    };
    const parsed = CreatePricingProfileSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join('; ');
      expect(messages).toMatch(/missing prices/);
    }
  });

  it('CreatePricingProfileSchema rejects custom adjustment paired with selection.type=all', () => {
    const bad = {
      name: 'Custom on all',
      scope: { type: 'all' },
      selection: { type: 'all' },
      adjustment: { mode: 'custom', fixedPricesCents: { KOYBRUNV6: 9500 } },
    };
    const parsed = CreatePricingProfileSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join('; ');
      expect(messages).toMatch(/selection\.type=products/);
    }
  });

  it('CreatePricingProfileSchema accepts a properly-priced custom adjustment', () => {
    const ok = {
      name: 'Custom on Koyama Methode',
      scope: { type: 'customer', customerId: 'bondi-cellars' },
      selection: { type: 'products', productIds: ['KOYBRUNV6'] },
      adjustment: { mode: 'custom', fixedPricesCents: { KOYBRUNV6: 9500 } },
    };
    expect(CreatePricingProfileSchema.safeParse(ok).success).toBe(true);
  });
});

describe('hardening — malformed JSON returns a clean 400', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('POST with broken JSON returns 400 + JSON error, not an HTML stack trace', async () => {
    const res = await fetch(`${baseUrl}/api/pricing-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('application/json');
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('bad-json');
  });

  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import cors from 'cors';

import { createStore, type Store } from '../data/seed.js';
import { productsRouter } from '../routes/products.js';
import { customersRouter } from '../routes/customers.js';
import { customerGroupsRouter } from '../routes/customer-groups.js';
import { profilesRouter } from '../routes/profiles.js';
import { resolveRouter } from '../routes/resolve.js';

/**
 * Smoke tests for the HTTP layer. We build a per-suite express app wired
 * against a fresh in-memory Store so writes don't bleed across suites.
 * No new dev-deps — we use Node's global fetch against app.listen(0).
 */
function buildTestApp(store: Store) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/products', productsRouter(store));
  app.use('/api/customers', customersRouter(store));
  app.use('/api/customer-groups', customerGroupsRouter(store));
  app.use('/api/pricing-profiles', profilesRouter(store));
  app.use('/api/resolve', resolveRouter(store));
  return app;
}

describe('HTTP routes — smoke', () => {
  let server: Server;
  let baseUrl: string;
  let store: Store;

  beforeAll(async () => {
    store = createStore();
    const app = buildTestApp(store);
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

  // ---------- products ----------

  it('GET /api/products?q=koyama returns 3 Koyama products', async () => {
    const res = await fetch(`${baseUrl}/api/products?q=koyama`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(body).toHaveLength(3);
    expect(body.map((p) => p.id).sort()).toEqual(
      ['KOYBRUNV6', 'KOYNR1837', 'KOYRIE19'].sort(),
    );
  });

  it('GET /api/products?subCategory=Wine&segment=Sparkling returns 2 sparkling wines', async () => {
    const res = await fetch(
      `${baseUrl}/api/products?subCategory=Wine&segment=Sparkling`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(body).toHaveLength(2);
    expect(body.map((p) => p.id).sort()).toEqual(
      ['KOYBRUNV6', 'LACBNATNV6'].sort(),
    );
  });

  // ---------- customers / groups / profiles list ----------

  it('GET /api/customers returns the 4 seeded customers including Bondi', async () => {
    const res = await fetch(`${baseUrl}/api/customers`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string; name: string }>;
    expect(body).toHaveLength(4);
    expect(body.map((c) => c.id)).toContain('bondi-cellars');
  });

  it('GET /api/pricing-profiles returns the 3 seed profiles', async () => {
    const res = await fetch(`${baseUrl}/api/pricing-profiles`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    // Note: this suite shares one store across tests; the create test below
    // appends a 4th. Assert >= 3 + presence of the seed IDs.
    const ids = body.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['profile-a', 'profile-b', 'profile-c']));
  });

  // ---------- profile create / get / delete cycle ----------

  it('POST /api/pricing-profiles with invalid body -> 400 with Zod issues', async () => {
    const res = await fetch(`${baseUrl}/api/pricing-profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // missing name; selection has empty productIds; scope absent
        description: 'broken',
        selection: { type: 'products', productIds: [] },
        adjustment: { mode: 'fixed', direction: 'decrease', amountCents: 100 },
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe('validation-error');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it('POST /api/pricing-profiles with a valid body -> 201, then GET /:id returns it, then DELETE -> 204', async () => {
    const create = await fetch(`${baseUrl}/api/pricing-profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'route-test fixture',
        description: 'created by routes.test.ts',
        scope: { type: 'all' },
        selection: { type: 'products', productIds: ['KOYBRUNV6'] },
        adjustment: { mode: 'fixed', direction: 'decrease', amountCents: 250 },
      }),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    };
    expect(created.id).toMatch(/^profile-/);
    expect(created.name).toBe('route-test fixture');
    expect(typeof created.createdAt).toBe('string');

    const got = await fetch(`${baseUrl}/api/pricing-profiles/${created.id}`);
    expect(got.status).toBe(200);
    const gotBody = (await got.json()) as { id: string };
    expect(gotBody.id).toBe(created.id);

    const del = await fetch(`${baseUrl}/api/pricing-profiles/${created.id}`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(204);

    const after = await fetch(`${baseUrl}/api/pricing-profiles/${created.id}`);
    expect(after.status).toBe(404);
  });

  // ---------- resolve ----------

  it('GET /api/resolve for Bondi + KOYBRUNV6 -> price 95 via profile-c', async () => {
    const res = await fetch(
      `${baseUrl}/api/resolve?customerId=bondi-cellars&productId=KOYBRUNV6`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      price: number;
      sourceProfileId: string;
      reason: { tier: string };
    };
    expect(body.price).toBe(95);
    expect(body.sourceProfileId).toBe('profile-c');
    expect(body.reason.tier).toBe('customer');
  });

  it('GET /api/resolve for an unknown product -> 404 product-not-found', async () => {
    const res = await fetch(
      `${baseUrl}/api/resolve?customerId=bondi-cellars&productId=NOSUCH`,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('product-not-found');
  });

  it('GET /api/resolve missing query params -> 400 validation-error', async () => {
    const res = await fetch(`${baseUrl}/api/resolve`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('validation-error');

    const partial = await fetch(`${baseUrl}/api/resolve?customerId=bondi-cellars`);
    expect(partial.status).toBe(400);
  });
});

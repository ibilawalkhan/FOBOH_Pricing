'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  listProducts,
  listCustomers,
  resolvePrice,
  formatCents,
  type ProductDTO,
  type CustomerDTO,
  type ResolveResultDTO,
} from '@/lib/api';

function tierLabel(t: 'customer' | 'group' | 'all' | 'none'): string {
  switch (t) {
    case 'customer':
      return 'Customer-specific';
    case 'group':
      return 'Customer group';
    case 'all':
      return 'All customers';
    case 'none':
      return 'No profile matched';
  }
}

function tierColor(t: 'customer' | 'group' | 'all' | 'none'): string {
  switch (t) {
    case 'customer':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'group':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'all':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'none':
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export default function ResolvePage() {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [result, setResult] = useState<ResolveResultDTO | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cs, ps] = await Promise.all([listCustomers(), listProducts()]);
        if (cancelled) return;
        setCustomers(cs);
        setProducts(ps);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load data.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResolve() {
    setError(null);
    setResult(null);
    if (!customerId || !productId) {
      setError('Pick a customer and a product first.');
      return;
    }
    setResolving(true);
    try {
      const r = await resolvePrice(customerId, productId);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolver failed.');
    } finally {
      setResolving(false);
    }
  }

  const customerName = customers.find((c) => c.id === customerId)?.name ?? '';
  const product = products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-gray-500">
            <Link href="/pricing" className="hover:underline">
              Pricing Profile
            </Link>{' '}
            &gt; <span className="text-gray-900 font-medium">Resolver</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Resolve a price</h1>
          <p className="text-sm text-gray-500">
            Pick a customer and a product to see which profile wins under the precedence rule.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="card p-4 text-sm text-red-700 bg-red-50 border-red-200">
          Could not load data: {loadError}
        </div>
      )}

      <section className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Customer</label>
            <select
              className="input-base w-full"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Product</label>
            <select
              className="input-base w-full"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select a product…</option>
              {products
                .filter((p) => !p.isDeleted)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.sku})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={resolving || !customerId || !productId}
            onClick={handleResolve}
          >
            {resolving ? 'Resolving…' : 'Resolve Price'}
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      {result && 'error' in result && (
        <section className="card p-6">
          <div className="text-lg font-semibold text-gray-900">
            {result.error === 'product-not-found' ? 'Product not available' : 'Customer not found'}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {result.error === 'product-not-found'
              ? 'This product is unavailable or has been deleted.'
              : 'This customer ID is not on file.'}
          </p>
        </section>
      )}

      {result && !('error' in result) && (
        <section className="card p-6 space-y-5">
          <div className="flex items-baseline gap-4 flex-wrap">
            <div className="text-5xl font-bold text-gray-900">{formatCents(result.priceCents)}</div>
            <div className="text-sm text-gray-500">
              {customerName} buying {product?.title ?? productId}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={[
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
                tierColor(result.reason.tier),
              ].join(' ')}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              Tier: {tierLabel(result.reason.tier)}
            </span>
            {result.sourceProfileId && (
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                Source profile: <code className="font-mono">{result.sourceProfileId}</code>
              </span>
            )}
            {result.reason.tiebreaker && (
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                Tiebreaker: {result.reason.tiebreaker}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-700">
            <span className="font-medium">Why: </span>
            {result.reason.message}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-2 border-t border-gray-100">
            <div>
              <dt className="text-xs text-gray-500">Base price</dt>
              <dd className="font-medium text-gray-900">
                {formatCents(result.basePriceCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Final price</dt>
              <dd className="font-medium text-gray-900">{formatCents(result.priceCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Difference</dt>
              <dd
                className={[
                  'font-medium',
                  result.priceCents < result.basePriceCents
                    ? 'text-emerald-700'
                    : result.priceCents > result.basePriceCents
                      ? 'text-amber-700'
                      : 'text-gray-700',
                ].join(' ')}
              >
                {formatCents(result.priceCents - result.basePriceCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Clamped to $0?</dt>
              <dd className="font-medium text-gray-900">
                {result.clampedToZero ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>

          {result.clampedToZero && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              ⚠️ The adjustment would have produced a negative price. It has been clamped to $0.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

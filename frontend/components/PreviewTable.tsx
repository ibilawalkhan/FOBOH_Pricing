'use client';

import { useMemo } from 'react';
import type { ProductDTO } from '@/lib/api';
import { formatCents } from '@/lib/api';
import type { AdjustmentFormState } from './AdjustmentForm';

type Props = {
  products: ProductDTO[];
  adjustment: AdjustmentFormState;
};

type Row = {
  product: ProductDTO;
  newPriceCents: number;
  clamped: boolean;
};

/**
 * Replicates the backend's adjustment formulas. Integer-cent arithmetic.
 *   fixed/decrease:   base - amountCents
 *   fixed/increase:   base + amountCents
 *   dynamic/decrease: base - Math.round(base * percent / 100)
 *   dynamic/increase: base + Math.round(base * percent / 100)
 * Negative results clamp to 0 and are flagged.
 */
export function computeNewPriceCents(
  base: number,
  adjustment: AdjustmentFormState,
): { newPriceCents: number; clamped: boolean } {
  const numeric = Number(adjustment.value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { newPriceCents: base, clamped: false };
  }
  let raw: number;
  if (adjustment.mode === 'fixed') {
    const cents = Math.round(numeric * 100);
    raw = adjustment.direction === 'increase' ? base + cents : base - cents;
  } else {
    const delta = Math.round((base * numeric) / 100);
    raw = adjustment.direction === 'increase' ? base + delta : base - delta;
  }
  if (raw < 0) return { newPriceCents: 0, clamped: true };
  return { newPriceCents: raw, clamped: false };
}

function describeAdjustment(a: AdjustmentFormState): string {
  const sign = a.direction === 'increase' ? '+' : '−';
  if (!a.value) return '—';
  if (a.mode === 'fixed') return `${sign} $${a.value}`;
  return `${sign} ${a.value}%`;
}

export function PreviewTable({ products, adjustment }: Props) {
  const rows: Row[] = useMemo(
    () =>
      products.map((p) => {
        const { newPriceCents, clamped } = computeNewPriceCents(p.basePriceCents, adjustment);
        return { product: p, newPriceCents, clamped };
      }),
    [products, adjustment],
  );

  const hasClamp = rows.some((r) => r.clamped);

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 text-center">
        Select at least one product to preview the new price.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" disabled className="accent-teal" />
              </th>
              <th className="px-4 py-3">Product Title</th>
              <th className="px-4 py-3">SKU Code</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Global Wholesale Price</th>
              <th className="px-4 py-3">Adjustment</th>
              <th className="px-4 py-3 text-right">New Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ product, newPriceCents, clamped }) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" defaultChecked className="accent-teal" />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{product.title}</td>
                <td className="px-4 py-3 text-gray-600">{product.sku}</td>
                <td className="px-4 py-3 text-gray-600">{product.subCategory}</td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {formatCents(product.basePriceCents)}
                </td>
                <td className="px-4 py-3 text-gray-700">{describeAdjustment(adjustment)}</td>
                <td
                  className={[
                    'px-4 py-3 text-right font-semibold',
                    clamped ? 'text-red-600' : 'text-gray-900',
                  ].join(' ')}
                >
                  {formatCents(newPriceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasClamp && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span aria-hidden>⚠️</span>
          <span>Price clamps to $0 — review adjustment.</span>
        </div>
      )}
    </div>
  );
}

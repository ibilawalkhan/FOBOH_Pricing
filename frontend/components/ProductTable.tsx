'use client';

import { useMemo } from 'react';
import type { ProductDTO } from '@/lib/api';
import { formatCents } from '@/lib/api';

export type ProductScopeRadio = 'one' | 'multiple' | 'all';

export type ProductFilterState = {
  q: string;
  skuQuery: string;
  category: string;
  segment: string;
  brand: string;
};

type Props = {
  products: ProductDTO[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  scopeRadio: ProductScopeRadio;
  onScopeRadioChange: (v: ProductScopeRadio) => void;
  filters: ProductFilterState;
  onFiltersChange: (next: ProductFilterState) => void;
  profileName: string;
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  scopeRadio,
  onScopeRadioChange,
  filters,
  onFiltersChange,
  profileName,
}: Props) {
  const categories = useMemo(() => unique(products.map((p) => p.subCategory)), [products]);
  const segments = useMemo(() => unique(products.map((p) => p.segment)), [products]);
  const brands = useMemo(() => unique(products.map((p) => p.brand)), [products]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const sku = filters.skuQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (p.isDeleted) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
        return false;
      }
      if (sku && !p.sku.toLowerCase().includes(sku) && !p.title.toLowerCase().includes(sku)) {
        return false;
      }
      if (filters.category && p.subCategory !== filters.category) return false;
      if (filters.segment && p.segment !== filters.segment) return false;
      if (filters.brand && p.brand !== filters.brand) return false;
      return true;
    });
  }, [products, filters]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  function toggleOne(id: string, checked: boolean) {
    if (scopeRadio === 'one') {
      onSelectionChange(checked ? [id] : []);
      return;
    }
    if (checked) {
      onSelectionChange(Array.from(new Set([...selectedIds, id])));
    } else {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    }
  }

  function selectAllFiltered() {
    onSelectionChange(Array.from(new Set([...selectedIds, ...filtered.map((p) => p.id)])));
  }
  function deselectAllFiltered() {
    const filteredIds = new Set(filtered.map((p) => p.id));
    onSelectionChange(selectedIds.filter((id) => !filteredIds.has(id)));
  }

  const activePillFilters: string[] = [filters.brand, filters.segment, filters.category].filter(
    (x): x is string => x.length > 0,
  );

  function clearPill(value: string) {
    const next: ProductFilterState = { ...filters };
    if (next.brand === value) next.brand = '';
    if (next.segment === value) next.segment = '';
    if (next.category === value) next.category = '';
    onFiltersChange(next);
  }

  // When user picks "all", we hide the per-product grid because the backend
  // selection becomes `{ type: 'all' }` (see step 2 page).
  const showGrid = scopeRadio !== 'all';

  return (
    <div className="space-y-4">
      {/* Radio: scope of products */}
      <fieldset className="text-sm">
        <legend className="text-gray-700 mb-2">
          You are creating a Pricing Profile for
        </legend>
        <div className="flex flex-wrap gap-4">
          {(['one', 'multiple', 'all'] as ProductScopeRadio[]).map((opt) => (
            <label
              key={opt}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="product-scope"
                value={opt}
                checked={scopeRadio === opt}
                onChange={() => onScopeRadioChange(opt)}
                className="accent-teal"
              />
              <span className="capitalize">
                {opt === 'one' ? 'One Product' : opt === 'multiple' ? 'Multiple Products' : 'All Products'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {showGrid && (
        <>
          {/* Search row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Search"
              className="input-base"
              value={filters.q}
              onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            />
            <input
              type="text"
              placeholder="Product / SKU"
              className="input-base"
              value={filters.skuQuery}
              onChange={(e) => onFiltersChange({ ...filters, skuQuery: e.target.value })}
            />
            <select
              className="input-base"
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
            >
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              value={filters.segment}
              onChange={(e) => onFiltersChange({ ...filters, segment: e.target.value })}
            >
              <option value="">Segment</option>
              {segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              value={filters.brand}
              onChange={(e) => onFiltersChange({ ...filters, brand: e.target.value })}
            >
              <option value="">Brand</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Result summary */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
            <div className="text-gray-600">
              Showing{' '}
              <span className="font-semibold text-gray-900">{filtered.length} Result{filtered.length === 1 ? '' : 's'}</span>{' '}
              for {filters.q || filters.skuQuery || 'Product Name or SKU Code'}
              {activePillFilters.length > 0 && (
                <span className="ml-2 inline-flex gap-1 align-middle">
                  {activePillFilters.map((p) => (
                    <button
                      key={p}
                      onClick={() => clearPill(p)}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                      type="button"
                    >
                      {p} <span aria-hidden>×</span>
                    </button>
                  ))}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {scopeRadio === 'multiple' && (
                <>
                  <button
                    type="button"
                    onClick={deselectAllFiltered}
                    className="text-teal hover:underline"
                  >
                    Deselect All
                  </button>
                  <span className="text-gray-300">/</span>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-teal hover:underline"
                    disabled={allFilteredSelected}
                  >
                    Select all
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Product list */}
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">
                No products match these filters.
              </li>
            )}
            {filtered.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                  <input
                    type={scopeRadio === 'one' ? 'radio' : 'checkbox'}
                    name={scopeRadio === 'one' ? 'product-one' : undefined}
                    checked={checked}
                    onChange={(e) => toggleOne(p.id, e.target.checked)}
                    className="accent-teal"
                  />
                  <div
                    aria-hidden="true"
                    className="h-10 w-10 rounded bg-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      SKU {p.sku} · {p.brand} · {p.subCategory}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 hidden sm:block">
                    {formatCents(p.basePriceCents)}
                  </div>
                </li>
              );
            })}
          </ul>

          {selectedIds.length > 0 && (
            <p className="text-sm text-gray-700">
              You&apos;ve selected{' '}
              <span className="font-semibold">{selectedIds.length} Product{selectedIds.length === 1 ? '' : 's'}</span>,
              these will be added to{' '}
              <span className="font-medium">{profileName || '{Profile Name}'}</span>
            </p>
          )}
        </>
      )}

      {scopeRadio === 'all' && (
        <p className="text-sm text-gray-700 rounded-lg border border-dashed border-gray-300 p-4">
          This profile will apply to <span className="font-semibold">all products</span>.
          Snapshot of the current catalogue ({products.filter((p) => !p.isDeleted).length} products) will be
          saved with the profile.
        </p>
      )}
    </div>
  );
}

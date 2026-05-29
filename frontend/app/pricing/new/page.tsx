'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listProducts,
  listCustomers,
  listCustomerGroups,
  createProfile,
  type ProductDTO,
  type CustomerDTO,
  type CustomerGroupDTO,
  type AdjustmentDTO,
  type SelectionDTO,
  type CreatePricingProfileInput,
} from '@/lib/api';
import {
  ProductTable,
  type ProductScopeRadio,
  type ProductFilterState,
} from '@/components/ProductTable';
import { AdjustmentForm, type AdjustmentFormState } from '@/components/AdjustmentForm';
import { PreviewTable, computeNewPriceCents } from '@/components/PreviewTable';
import {
  CustomerAssign,
  toScopeDTO,
  type CustomerAssignState,
} from '@/components/CustomerAssign';
import { StatusPill, type Status } from '@/components/StatusPill';

type Step = 1 | 2 | 3;

type BasicState = {
  name: string;
  description: string;
};

const EMPTY_FILTERS: ProductFilterState = {
  q: '',
  skuQuery: '',
  category: '',
  segment: '',
  brand: '',
};

export default function NewPricingProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // step 1
  const [basic, setBasic] = useState<BasicState>({ name: '', description: '' });

  // step 2
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [productScope, setProductScope] = useState<ProductScopeRadio>('multiple');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_FILTERS);
  const [adjustment, setAdjustment] = useState<AdjustmentFormState>({
    mode: 'dynamic',
    direction: 'decrease',
    value: '10',
  });

  // step 3
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [groups, setGroups] = useState<CustomerGroupDTO[]>([]);
  const [assign, setAssign] = useState<CustomerAssignState>({
    mode: 'customer',
    customerId: '',
    groupId: '',
  });

  // shared
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Bootstrap data once. Five products from the seed; no need to refetch on filter change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ps, cs, gs] = await Promise.all([
          listProducts(),
          listCustomers(),
          listCustomerGroups(),
        ]);
        if (cancelled) return;
        setProducts(ps);
        setCustomers(cs);
        setGroups(gs);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load data.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived state.
  const selectedProducts = useMemo(
    () =>
      productScope === 'all'
        ? products.filter((p) => !p.isDeleted)
        : products.filter((p) => selectedIds.includes(p.id)),
    [products, selectedIds, productScope],
  );

  const basicComplete = basic.name.trim().length > 0;
  const productsComplete =
    (productScope === 'all' && products.some((p) => !p.isDeleted)) ||
    (productScope !== 'all' && selectedIds.length > 0);
  const adjustmentValueOk =
    adjustment.value === '' || (Number.isFinite(Number(adjustment.value)) && Number(adjustment.value) >= 0);
  const step2Complete = productsComplete && adjustmentValueOk;
  const assignComplete =
    assign.mode === 'all' ||
    (assign.mode === 'customer' && assign.customerId.length > 0) ||
    (assign.mode === 'group' && assign.groupId.length > 0);

  function statusFor(s: Step): Status {
    if (s === step) return 'in-progress';
    if (s === 1) return basicComplete ? 'completed' : 'not-started';
    if (s === 2) return step2Complete ? 'completed' : 'not-started';
    return assignComplete ? 'completed' : 'not-started';
  }

  function buildAdjustmentDTO(): AdjustmentDTO {
    const numeric = Number(adjustment.value || '0');
    if (adjustment.mode === 'fixed') {
      return {
        mode: 'fixed',
        direction: adjustment.direction,
        amountCents: Math.round(numeric * 100),
      };
    }
    return {
      mode: 'dynamic',
      direction: adjustment.direction,
      percent: numeric,
    };
  }

  function buildSelectionDTO(): SelectionDTO {
    if (productScope === 'all') {
      // Snapshot at save: materialize the current (non-deleted) catalogue.
      return {
        type: 'products',
        productIds: products.filter((p) => !p.isDeleted).map((p) => p.id),
      };
    }
    return { type: 'products', productIds: selectedIds };
  }

  async function handleSave() {
    setSaveError(null);
    const scope = toScopeDTO(assign);
    if (!scope) {
      setSaveError('Please pick a customer or group, or choose "All customers".');
      return;
    }
    if (!basicComplete) {
      setSaveError('Profile name is required.');
      setStep(1);
      return;
    }
    const selection = buildSelectionDTO();
    if (selection.type === 'products' && selection.productIds.length === 0) {
      setSaveError('Pick at least one product.');
      setStep(2);
      return;
    }

    const payload: CreatePricingProfileInput = {
      name: basic.name.trim(),
      description: basic.description.trim(),
      scope,
      selection,
      adjustment: buildAdjustmentDTO(),
    };

    setSaving(true);
    try {
      await createProfile(payload);
      router.push('/pricing');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-gray-500">
            <Link href="/pricing" className="hover:underline">
              Pricing Profile
            </Link>{' '}
            &gt; <span className="text-gray-900 font-medium">Setup a Profile</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Setup a Profile</h1>
          <p className="text-sm text-gray-500">
            Setup your pricing profile, select products and assign customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
          <button
            type="button"
            className="btn-secondary"
            disabled
            title="Profile lifecycle (Draft / Published) is deferred — see README"
          >
            Save as Draft
          </button>
        </div>
      </div>

      {loadError && (
        <div className="card p-4 text-sm text-red-700 bg-red-50 border-red-200">
          Could not load data: {loadError}
        </div>
      )}

      {/* Step 1 */}
      <SectionCard
        index={1}
        title="Basic Pricing Profile"
        description="Give your profile a name and short description."
        status={statusFor(1)}
        expanded={step === 1}
        onExpand={() => setStep(1)}
        summary={
          basicComplete ? (
            <span>
              <span className="font-medium text-gray-900">{basic.name}</span>
              {basic.description ? ` — ${basic.description}` : ''}
            </span>
          ) : null
        }
      >
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Profile name *</label>
            <input
              type="text"
              className="input-base w-full"
              value={basic.name}
              onChange={(e) => setBasic({ ...basic, name: e.target.value })}
              placeholder="e.g. Bondi Cellars — Koyama deal"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea
              className="input-base w-full min-h-[80px]"
              value={basic.description}
              onChange={(e) => setBasic({ ...basic, description: e.target.value })}
              placeholder="What's this profile for?"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              disabled={!basicComplete}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Step 2 */}
      <SectionCard
        index={2}
        title="Set Product Pricing"
        description="Pick products and how the new price is calculated."
        status={statusFor(2)}
        expanded={step === 2}
        onExpand={() => setStep(2)}
        summary={
          step2Complete ? (
            <span>
              {productScope === 'all'
                ? `All products (${products.filter((p) => !p.isDeleted).length})`
                : `${selectedIds.length} product${selectedIds.length === 1 ? '' : 's'}`}{' '}
              · {adjustment.mode === 'fixed' ? 'Fixed $' : 'Dynamic %'}{' '}
              {adjustment.direction === 'increase' ? '+' : '−'}
              {adjustment.value}
            </span>
          ) : null
        }
      >
        <div className="space-y-6">
          <ProductTable
            products={products}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            scopeRadio={productScope}
            onScopeRadioChange={(v) => {
              setProductScope(v);
              if (v === 'one' && selectedIds.length > 1) {
                setSelectedIds(selectedIds.slice(0, 1));
              }
            }}
            filters={filters}
            onFiltersChange={setFilters}
            profileName={basic.name}
          />

          <hr className="border-gray-200" />

          <AdjustmentForm
            state={adjustment}
            onChange={setAdjustment}
            onRefresh={() => {
              // No-op: preview is reactive. Button exists for design parity.
            }}
          />

          <hr className="border-gray-200" />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
            <PreviewTable products={selectedProducts} adjustment={adjustment} />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs italic text-gray-500">
              Your entries are saved automatically
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!step2Complete}
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Step 3 */}
      <SectionCard
        index={3}
        title="Assign Customers to Pricing Profile"
        description="Choose who this profile applies to."
        status={statusFor(3)}
        expanded={step === 3}
        onExpand={() => setStep(3)}
        summary={
          assignComplete ? (
            <span>
              {assign.mode === 'all'
                ? 'All customers'
                : assign.mode === 'customer'
                  ? `Customer: ${customers.find((c) => c.id === assign.customerId)?.name ?? assign.customerId}`
                  : `Group: ${groups.find((g) => g.id === assign.groupId)?.name ?? assign.groupId}`}
            </span>
          ) : null
        }
      >
        <div className="space-y-4">
          <CustomerAssign
            customers={customers}
            groups={groups}
            state={assign}
            onChange={setAssign}
          />

          {saveError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          {/* Pre-save sanity preview using the same formulas as the backend. */}
          {selectedProducts.length > 0 && (
            <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
              Preview at save:{' '}
              {selectedProducts.slice(0, 3).map((p, i) => {
                const r = computeNewPriceCents(p.basePriceCents, adjustment);
                return (
                  <span key={p.id}>
                    {i > 0 ? ', ' : ''}
                    {p.title}: ${(r.newPriceCents / 100).toFixed(2)}
                    {r.clamped ? ' (clamped)' : ''}
                  </span>
                );
              })}
              {selectedProducts.length > 3 ? ` … +${selectedProducts.length - 3} more` : ''}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs italic text-gray-500">
              Your entries are saved automatically
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving || !basicComplete || !step2Complete || !assignComplete}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save & Publish Profile'}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ---------- Section card ----------

type SectionCardProps = {
  index: number;
  title: string;
  description: string;
  status: Status;
  expanded: boolean;
  onExpand: () => void;
  summary: React.ReactNode;
  children: React.ReactNode;
};

function SectionCard({
  index,
  title,
  description,
  status,
  expanded,
  onExpand,
  summary,
  children,
}: SectionCardProps) {
  return (
    <section className="card">
      <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={[
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
              expanded ? 'bg-teal text-white' : 'bg-gray-100 text-gray-600',
            ].join(' ')}
          >
            {index}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            {!expanded && summary && (
              <div className="mt-2 text-sm text-gray-700">{summary}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusPill status={status} />
          {!expanded && (
            <button
              type="button"
              onClick={onExpand}
              className="text-sm text-teal hover:underline"
            >
              Make Changes
            </button>
          )}
        </div>
      </header>
      {expanded && <div className="px-6 py-5">{children}</div>}
    </section>
  );
}

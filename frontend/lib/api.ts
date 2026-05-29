// Typed API client for the FOBOH pricing backend.
// Frontend declares its own DTOs (per the plan, FE/BE are independently buildable).

export type ProductDTO = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  subCategory: string;
  segment: string;
  basePriceCents: number;
  isDeleted?: boolean;
};

export type CustomerDTO = {
  id: string;
  name: string;
  groupIds: string[];
};

export type CustomerGroupDTO = {
  id: string;
  name: string;
};

export type ScopeDTO =
  | { type: 'customer'; customerId: string }
  | { type: 'group'; groupId: string }
  | { type: 'all' };

export type SelectionDTO =
  | { type: 'products'; productIds: string[] }
  | { type: 'all' };

export type AdjustmentDTO =
  | { mode: 'fixed'; direction: 'increase' | 'decrease'; amountCents: number }
  | { mode: 'dynamic'; direction: 'increase' | 'decrease'; percent: number }
  | { mode: 'custom'; fixedPricesCents: Record<string, number> };

export type PricingProfileDTO = {
  id: string;
  name: string;
  description: string;
  scope: ScopeDTO;
  selection: SelectionDTO;
  adjustment: AdjustmentDTO;
  createdAt: string;
  updatedAt: string;
};

export type CreatePricingProfileInput = {
  name: string;
  description?: string;
  scope: ScopeDTO;
  selection: SelectionDTO;
  adjustment: AdjustmentDTO;
};

export type ResolveReasonDTO = {
  tier: 'customer' | 'group' | 'all' | 'none';
  tiebreaker?: 'custom-beats-adjustment' | 'narrower-selection' | 'updatedAt';
  message: string;
};

export type ResolveSuccessDTO = {
  productId: string;
  customerId: string;
  priceCents: number;
  price: number;
  basePriceCents: number;
  sourceProfileId: string | null;
  reason: ResolveReasonDTO;
  clampedToZero?: boolean;
};

export type ResolveResultDTO =
  | ResolveSuccessDTO
  | { error: 'product-not-found' | 'customer-not-found' };

export type ProductFilters = {
  q?: string;
  subCategory?: string;
  segment?: string;
  brand?: string;
};

// ---------- internal helpers ----------

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
  );
  if (entries.length === 0) return '';
  const sp = new URLSearchParams(entries);
  return `?${sp.toString()}`;
}

// ---------- endpoints ----------

export async function listProducts(filters?: ProductFilters): Promise<ProductDTO[]> {
  const url = `/api/products${qs({
    q: filters?.q,
    subCategory: filters?.subCategory,
    segment: filters?.segment,
    brand: filters?.brand,
  })}`;
  const res = await fetch(url, { cache: 'no-store' });
  return jsonOrThrow<ProductDTO[]>(res);
}

export async function listCustomers(): Promise<CustomerDTO[]> {
  const res = await fetch('/api/customers', { cache: 'no-store' });
  return jsonOrThrow<CustomerDTO[]>(res);
}

export async function listCustomerGroups(): Promise<CustomerGroupDTO[]> {
  const res = await fetch('/api/customer-groups', { cache: 'no-store' });
  return jsonOrThrow<CustomerGroupDTO[]>(res);
}

export async function listProfiles(): Promise<PricingProfileDTO[]> {
  const res = await fetch('/api/pricing-profiles', { cache: 'no-store' });
  return jsonOrThrow<PricingProfileDTO[]>(res);
}

export async function createProfile(
  body: CreatePricingProfileInput,
): Promise<PricingProfileDTO> {
  const res = await fetch('/api/pricing-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<PricingProfileDTO>(res);
}

export async function resolvePrice(
  customerId: string,
  productId: string,
): Promise<ResolveResultDTO> {
  const res = await fetch(
    `/api/resolve${qs({ customerId, productId })}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (body.error === 'product-not-found' || body.error === 'customer-not-found') {
      return { error: body.error };
    }
    throw new Error(`HTTP 404: ${JSON.stringify(body)}`);
  }
  return jsonOrThrow<ResolveSuccessDTO>(res);
}

// ---------- display helpers ----------

const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return aud.format(cents / 100);
}

export function formatScope(
  scope: ScopeDTO,
  customers: CustomerDTO[],
  groups: CustomerGroupDTO[],
): string {
  if (scope.type === 'all') return 'All customers';
  if (scope.type === 'customer') {
    const c = customers.find((x) => x.id === scope.customerId);
    return `Customer: ${c?.name ?? scope.customerId}`;
  }
  const g = groups.find((x) => x.id === scope.groupId);
  return `Group: ${g?.name ?? scope.groupId}`;
}

export function selectionCount(selection: SelectionDTO): string {
  if (selection.type === 'all') return 'All products';
  return `${selection.productIds.length} product${selection.productIds.length === 1 ? '' : 's'}`;
}

import type { Store } from '../data/seed.js';
import type {
  PricingProfile,
  ResolveResponse,
  ResolveReason,
} from '../schemas/index.js';
import { applyAdjustment, clampToZero, centsToDollars } from './pricing.js';

export type ResolveError = { error: 'product-not-found' | 'customer-not-found' };
export type ResolveResult = ResolveResponse | ResolveError;

export function isResolveError(r: ResolveResult): r is ResolveError {
  return (r as ResolveError).error !== undefined;
}

/**
 * Most-specific-wins, no stacking. See PLAN.md for the rationale.
 *
 * Order: tier filter (customer > group > all) -> tiebreak (custom > narrower selection > updatedAt).
 */
export function resolvePrice(
  customerId: string,
  productId: string,
  store: Store,
): ResolveResult {
  const product = store.getProductById(productId);
  if (!product || product.isDeleted) {
    return { error: 'product-not-found' };
  }

  const customer = store.getCustomerById(customerId);
  if (!customer) {
    return { error: 'customer-not-found' };
  }

  // (3) profiles whose selection contains this product
  const matching = store.listProfiles().filter((p) => selectionContains(p, productId));

  // (4) Tier 1: customer-scoped
  const tier1 = matching.filter(
    (p) => p.scope.type === 'customer' && p.scope.customerId === customerId,
  );
  // (5) Tier 2: group-scoped
  const tier2 = matching.filter(
    (p) => p.scope.type === 'group' && customer.groupIds.includes(p.scope.groupId),
  );
  // (6) Tier 3: all-customers
  const tier3 = matching.filter((p) => p.scope.type === 'all');

  let tier: 'customer' | 'group' | 'all';
  let candidates: PricingProfile[];

  if (tier1.length > 0) {
    tier = 'customer';
    candidates = tier1;
  } else if (tier2.length > 0) {
    tier = 'group';
    candidates = tier2;
  } else if (tier3.length > 0) {
    tier = 'all';
    candidates = tier3;
  } else {
    // (7) nothing matched — base price
    return buildResponse(customer.id, product.id, product.basePriceCents, product.basePriceCents, null, {
      tier: 'none',
      message: 'no profile matched; base price',
    });
  }

  // (8) Tiebreak within winning tier
  const { winner, tiebreaker } = pickWinner(candidates);

  // (9) apply + clamp
  const raw = applyAdjustment(productId, product.basePriceCents, winner.adjustment);
  const { cents: priceCents, clamped } = clampToZero(raw);

  const reason: ResolveReason = {
    tier,
    ...(tiebreaker ? { tiebreaker } : {}),
    message: describeReason(tier, winner, tiebreaker),
  };

  return buildResponse(
    customer.id,
    product.id,
    priceCents,
    product.basePriceCents,
    winner.id,
    reason,
    clamped,
  );
}

function selectionContains(profile: PricingProfile, productId: string): boolean {
  const inSelection =
    profile.selection.type === 'all' ||
    profile.selection.productIds.includes(productId);
  if (!inSelection) return false;
  // Defence-in-depth: a custom-mode profile that doesn't actually price this
  // productId is not a match. The Zod refinement should prevent this at create
  // time, but if seed data or a direct mutation slips through, we don't want a
  // priceless "custom" profile to silently win the custom-beats-adjustment
  // tiebreaker and mis-attribute the source.
  if (profile.adjustment.mode === 'custom') {
    return Object.prototype.hasOwnProperty.call(
      profile.adjustment.fixedPricesCents,
      productId,
    );
  }
  return true;
}

/**
 * Tiebreak within the same tier:
 *   (a) custom-mode beats fixed/dynamic
 *   (b) products-selection beats all-selection
 *   (c) most recent updatedAt wins
 *
 * The flag we return on the response is the *deciding* tiebreaker — the one
 * that picked the final winner out of the previous step's remaining set.
 */
function pickWinner(
  candidates: PricingProfile[],
): { winner: PricingProfile; tiebreaker?: ResolveReason['tiebreaker'] } {
  if (candidates.length === 1) {
    return { winner: candidates[0]! };
  }

  let pool = candidates;
  let appliedTiebreaker: ResolveReason['tiebreaker'] | undefined;

  // (a) custom beats other modes
  const customs = pool.filter((p) => p.adjustment.mode === 'custom');
  if (customs.length > 0 && customs.length < pool.length) {
    pool = customs;
    appliedTiebreaker = 'custom-beats-adjustment';
  } else if (customs.length === pool.length) {
    // everyone is custom — no narrowing
  }

  if (pool.length === 1) return { winner: pool[0]!, tiebreaker: appliedTiebreaker };

  // (b) products beats all-selection
  const narrow = pool.filter((p) => p.selection.type === 'products');
  if (narrow.length > 0 && narrow.length < pool.length) {
    pool = narrow;
    appliedTiebreaker = 'narrower-selection';
  }

  if (pool.length === 1) return { winner: pool[0]!, tiebreaker: appliedTiebreaker };

  // (c) most recent updatedAt
  pool = [...pool].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  appliedTiebreaker = 'updatedAt';
  return { winner: pool[0]!, tiebreaker: appliedTiebreaker };
}

function describeReason(
  tier: 'customer' | 'group' | 'all',
  winner: PricingProfile,
  tiebreaker?: ResolveReason['tiebreaker'],
): string {
  const tierMsg =
    tier === 'customer'
      ? 'customer-specific assignment beats group-level and all-customers'
      : tier === 'group'
        ? 'group-level assignment beats all-customers'
        : 'all-customers fallback';
  const tieMsg = tiebreaker ? ` (tiebreaker: ${tiebreaker})` : '';
  return `${tierMsg}; matched profile ${winner.id}${tieMsg}`;
}

function buildResponse(
  customerId: string,
  productId: string,
  priceCents: number,
  basePriceCents: number,
  sourceProfileId: string | null,
  reason: ResolveReason,
  clampedToZero?: boolean,
): ResolveResponse {
  return {
    customerId,
    productId,
    priceCents,
    price: centsToDollars(priceCents),
    basePriceCents,
    sourceProfileId,
    reason,
    ...(clampedToZero ? { clampedToZero: true } : {}),
  };
}

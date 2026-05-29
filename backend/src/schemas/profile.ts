import { z } from 'zod';

// ---------- scope ----------
export const ScopeCustomerSchema = z.object({
  type: z.literal('customer'),
  customerId: z.string().min(1),
});
export const ScopeGroupSchema = z.object({
  type: z.literal('group'),
  groupId: z.string().min(1),
});
export const ScopeAllSchema = z.object({
  type: z.literal('all'),
});
export const ProfileScopeSchema = z.discriminatedUnion('type', [
  ScopeCustomerSchema,
  ScopeGroupSchema,
  ScopeAllSchema,
]);
export type ProfileScope = z.infer<typeof ProfileScopeSchema>;

// ---------- selection ----------
export const SelectionProductsSchema = z.object({
  type: z.literal('products'),
  productIds: z.array(z.string().min(1)).min(1, 'selection.productIds must be non-empty'),
});
export const SelectionAllSchema = z.object({
  type: z.literal('all'),
});
export const ProfileSelectionSchema = z.discriminatedUnion('type', [
  SelectionProductsSchema,
  SelectionAllSchema,
]);
export type ProfileSelection = z.infer<typeof ProfileSelectionSchema>;

// ---------- adjustment ----------
export const AdjustmentFixedSchema = z.object({
  mode: z.literal('fixed'),
  direction: z.enum(['increase', 'decrease']),
  amountCents: z.number().int().nonnegative(),
});
export const AdjustmentDynamicSchema = z.object({
  mode: z.literal('dynamic'),
  direction: z.enum(['increase', 'decrease']),
  percent: z.number().min(0).max(100),
});
export const AdjustmentCustomSchema = z.object({
  mode: z.literal('custom'),
  fixedPricesCents: z.record(z.string().min(1), z.number().int().nonnegative()),
});
export const ProfileAdjustmentSchema = z.discriminatedUnion('mode', [
  AdjustmentFixedSchema,
  AdjustmentDynamicSchema,
  AdjustmentCustomSchema,
]);
export type ProfileAdjustment = z.infer<typeof ProfileAdjustmentSchema>;

// ---------- profile ----------
export const PricingProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  scope: ProfileScopeSchema,
  selection: ProfileSelectionSchema,
  adjustment: ProfileAdjustmentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PricingProfile = z.infer<typeof PricingProfileSchema>;

/**
 * Cross-field invariant: a `custom` adjustment must (a) target a specific products
 * selection (not "all products" — pricing an unbounded list one-by-one is incoherent)
 * and (b) provide a `fixedPricesCents` entry for every productId in that selection.
 *
 * Without this, an empty `fixedPricesCents` would silently win the
 * `custom-beats-adjustment` tiebreaker and then fall through to base price,
 * mis-attributing the source profile.
 */
function refineCustomAdjustment(
  data: {
    adjustment: ProfileAdjustment;
    selection: ProfileSelection;
  },
  ctx: z.RefinementCtx,
) {
  if (data.adjustment.mode !== 'custom') return;
  if (data.selection.type !== 'products') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selection', 'type'],
      message: 'custom adjustment requires selection.type=products',
    });
    return;
  }
  const priced = data.adjustment.fixedPricesCents;
  const missing = data.selection.productIds.filter((id) => !(id in priced));
  if (missing.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['adjustment', 'fixedPricesCents'],
      message: `custom adjustment missing prices for: ${missing.join(', ')}`,
    });
  }
}

// Body of POST /api/pricing-profiles — server assigns id + timestamps.
export const CreatePricingProfileSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().default(''),
    scope: ProfileScopeSchema,
    selection: ProfileSelectionSchema,
    adjustment: ProfileAdjustmentSchema,
  })
  .superRefine(refineCustomAdjustment);
export type CreatePricingProfileInput = z.infer<typeof CreatePricingProfileSchema>;

// Body of PUT /api/pricing-profiles/:id — partial-ish but we require full re-statement
// of scope/selection/adjustment if provided. Name/description optional.
//
// We only enforce the custom-adjustment invariant when BOTH `adjustment` and
// `selection` are present in the patch — otherwise we'd need the prior state to check.
// The route handler can re-validate the merged profile on its own if needed.
export const UpdatePricingProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    scope: ProfileScopeSchema.optional(),
    selection: ProfileSelectionSchema.optional(),
    adjustment: ProfileAdjustmentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.adjustment || !data.selection) return;
    refineCustomAdjustment(
      { adjustment: data.adjustment, selection: data.selection },
      ctx,
    );
  });
export type UpdatePricingProfileInput = z.infer<typeof UpdatePricingProfileSchema>;

// ---------- resolve response ----------
export const ResolveReasonSchema = z.object({
  tier: z.enum(['customer', 'group', 'all', 'none']),
  tiebreaker: z.enum(['custom-beats-adjustment', 'narrower-selection', 'updatedAt']).optional(),
  message: z.string(),
});
export type ResolveReason = z.infer<typeof ResolveReasonSchema>;

export const ResolveResponseSchema = z.object({
  productId: z.string(),
  customerId: z.string(),
  priceCents: z.number().int().nonnegative(),
  price: z.number(),
  basePriceCents: z.number().int().nonnegative(),
  sourceProfileId: z.string().nullable(),
  reason: ResolveReasonSchema,
  clampedToZero: z.boolean().optional(),
});
export type ResolveResponse = z.infer<typeof ResolveResponseSchema>;

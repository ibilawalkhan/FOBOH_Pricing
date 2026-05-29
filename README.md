# FOBOH Pricing Challenge

A fullstack take on customer-specific pricing for F&B wholesale: suppliers create *pricing profiles* (a selection of products + a fixed or dynamic adjustment + a customer-or-group assignment), and a backend resolver tells you what any given customer pays for any given product, plus *which profile* won and *why*.

The headline work is the **precedence rule** for overlapping profiles — explained in detail below. The full design plan (architecture, data model, mermaid diagrams, industry research) is in [`docs/PLAN.md`](docs/PLAN.md). AI conversation transcripts are in [`transcripts/`](transcripts/).

---

## Setup

```bash
# backend (Express + TS + Zod + Swagger UI)
cd backend
npm install
npm test        # 17+ resolver/pricing/route tests, all green
npm run dev     # listens on http://localhost:3001
                #   API:     http://localhost:3001/api/...
                #   Swagger: http://localhost:3001/api-docs

# frontend (Next.js 15 App Router + Tailwind)
cd ../frontend
npm install
npm run dev     # http://localhost:3000  (rewrites /api/* → :3001)
```

Open `http://localhost:3000/pricing` for the profile list, `/pricing/new` for the wizard, and `/pricing/resolve` to see the resolver in action.

---

## The precedence rule

**Rule: most-specific-wins, no stacking.** A customer ordering a product gets exactly one price from exactly one profile. Profiles rank by:

1. **Customer specificity** — Tier 1 (customer-specific) beats Tier 2 (customer-group) beats Tier 3 (all-customers).
2. **Price-set specificity** within a tier — a `custom` fixed price beats a `%`/`$` adjustment; a narrower product selection beats a wider one.
3. **Recency** — most recent `updatedAt` wins. Re-saving a profile is the deliberate way to break a remaining tie.

### Bondi Cellars + Koyama Methode Brut Nature NV

Bondi Cellars is in **both** customer groups (Independent Retailers *and* VIP — groups are tags, not exclusive buckets). When they order Koyama Methode Brut Nature NV, three profiles match:

| Profile | Targets | Would charge |
|---|---|---|
| A — 10% off all Wine | Independent Retailers group | $108.00 |
| B — $15 off all Sparkling Wine | VIP group | $105.00 |
| C — Custom $95 on this exact SKU | Bondi Cellars (customer) | **$95.00** |

Profile C wins on Tier 1 (customer-specific). A and B never get evaluated.

```bash
# Bondi (in both IR + VIP) — customer-tier Profile C wins
curl 'http://localhost:3001/api/resolve?customerId=bondi-cellars&productId=KOYBRUNV6'
# → priceCents: 9500, sourceProfileId: profile-c, reason.tier: customer

# Green Grocer (IR-only) — Profile A wins via group tier, 10% off $120
curl 'http://localhost:3001/api/resolve?customerId=green-grocer&productId=KOYBRUNV6'
# → priceCents: 10800, sourceProfileId: profile-a, reason.tier: group

# Harbour Hotel (VIP-only) — Profile B wins via group tier, $15 off $120
curl 'http://localhost:3001/api/resolve?customerId=harbour-hotel&productId=KOYBRUNV6'
# → priceCents: 10500, sourceProfileId: profile-b, reason.tier: group

# Corner Store (no groups) — no profile matches, base price
curl 'http://localhost:3001/api/resolve?customerId=corner-store&productId=KOYBRUNV6'
# → priceCents: 12000, sourceProfileId: null, reason.tier: none
```

These four cases together prove the tier separation. The same scenarios are covered as unit tests in `backend/src/__tests__/resolver.test.ts` and as a visual demo at [http://localhost:3000/pricing/resolve](http://localhost:3000/pricing/resolve).

### Why this rule (and not "lowest price wins" or "stack everything")

I researched how real B2B pricing engines resolve overlapping rules — there's a clean industry split. ERPs and account-managed B2B (SAP, NetSuite, Odoo, the wine/spirits specialists Wine Hub / inecta / 365WineTrade / Acctivate) use **most-specific-wins**. Self-service B2B ecommerce (Shopify B2B, Adobe Commerce / Magento) defaults to **lowest-price-wins**. Salesforce CPQ uses an explicit numeric priority field and concedes in its own docs that it doesn't really resolve collisions, it just renames them.

FOBOH is supplier-facing — the design reference is a *supplier* wizard, not a buyer storefront. The platform's job is supplier control and margin protection, which is the ERP camp's posture. McKinsey's pocket-price waterfall research adds the financial argument: off-invoice leakage averages 16.3% of list, on-invoice another 33% — stacking overlapping discounts is a primary leakage vector. A 1% list-price gain yields ~8% operating profit gain (and vice versa). Defaulting to stacking or lowest-wins is structurally a margin-erosion engine for a supplier-facing platform.

Full reasoning, the alternative-rules trade-off table, and the McKinsey/industry citations are in [`docs/PLAN.md`](docs/PLAN.md).

---

## Trade-offs and known limitations

**Deliberately deferred** (because the brief asks for a 3–4hr build, not a production product, and the Figma design shows surface area beyond the brief's business logic):

- **Profile lifecycle.** The design has *Save as Draft* and *Save & Publish Profile* — a `status: 'draft' | 'published'` field. Not implemented; the wizard's *Save & Publish* button just creates the profile directly. *Save as Draft* renders disabled to preserve the visual layout.
- **Expiry.** The design says "expires in 16 Days." Profiles never expire in this implementation; the resolver doesn't check time bounds.
- **`isDefault` flag.** The "Marked as Default" badge implies a fallback list-pricing concept. Equivalent to a Tier-3 (all-customers) scope in the precedence model, so structurally already representable — just not exposed as a separate flag.
- **`basedOn` chained references.** The dropdown is locked to "Global Wholesale Price." A production model would let adjustments derive from RRP, list, or another profile's output.
- **Real persistence.** In-memory store. State resets every restart.

**Resolver judgement calls** (explicit decisions documented in [`docs/PLAN.md`](docs/PLAN.md#judgement-calls--handled-deliberately)):

- All money handled as integer cents internally; rounding only at the API response boundary. No FP drift compounding.
- Negative new prices clamp to 0 and flag `clampedToZero: true` in the response so the UI can warn. Selling at $0 is suspicious but valid; selling at -$5 is a bug.
- "All Products" is materialized at save time, not evaluated dynamically. A profile authored last quarter shouldn't auto-apply to a SKU launched this week without a human deciding.
- Deleted products return 404 from the resolver; profiles keep them as tombstones so historical orders still price.
- Empty `productIds` rejected at validation (400).
- 0% / $0 adjustments allowed — supplier might be staging a profile — and return base price unchanged.

**Architecture trade-off**: frontend and backend are intentionally decoupled. No shared types package, no monorepo tooling. Types are duplicated. Trade-off is explicit — independent build/deploy in exchange for accepted manual drift. Listed below as the first "what next" item.

---

## What I'd do next

- **Shared types package** (or OpenAPI-generated client) — once we have a second consumer (mobile, partner SDK) or feel manual-drift bite. The backend already exposes the OpenAPI doc at `/api-docs.json`.
- **Persistence** — Postgres + Drizzle/Prisma. Migration of the in-memory shapes is one-to-one.
- **Profile lifecycle and expiry** — implement the design's deferred fields. The resolver gets a pre-filter step; the wizard gets a real *Save as Draft* path; the list gets a status column.
- **Audit log** — wholesale teams need to answer "who changed what discount when." Append-only event log keyed by profile id.
- **Effective-date windows / campaigns** — the design's expiry concept generalized to a `[validFrom, validTo)` range. Resolver picks among in-window profiles.
- **Multi-line cart pricing** — the resolver is per `(customer, product)`. Real orders amortize freight, volume breaks, and promo budgets across line items; that's a separate layer.
- **Bulk import via CSV** — pricing-ops teams live in spreadsheets.

---

## Repo layout

```
challenge/
├── backend/                Express + TS + Zod + Swagger
│   ├── src/
│   │   ├── data/seed.ts            in-memory store
│   │   ├── domain/
│   │   │   ├── pricing.ts          pure calc + clamp
│   │   │   └── resolver.ts         precedence resolver
│   │   ├── routes/                 products, customers, customer-groups, profiles, resolve
│   │   ├── schemas/                Zod schemas — single source of types + validation
│   │   ├── openapi.ts              registers schemas/paths for swagger-ui
│   │   └── server.ts
│   └── src/__tests__/              vitest — resolver, pricing, tiebreakers, routes
├── frontend/               Next.js 15 App Router + Tailwind
│   ├── app/
│   │   ├── layout.tsx              sidebar + topbar shell
│   │   ├── pricing/page.tsx        profile list
│   │   ├── pricing/new/page.tsx    3-step wizard
│   │   └── pricing/resolve/page.tsx  resolver demo
│   ├── components/                 Sidebar, TopBar, ProductTable, AdjustmentForm,
│   │                               PreviewTable, CustomerAssign, StatusPill
│   └── lib/api.ts                  typed fetch wrappers (types declared locally)
├── docs/PLAN.md            full design plan with mermaid diagrams + industry research
├── transcripts/            AI conversation transcripts
└── README.md
```

---

## AI use

The brief asks for full AI conversation transcripts. They live in [`transcripts/`](transcripts/). The whole build — plan, research, scaffolding, backend, frontend, tests — was directed via Claude Code (Opus 4.7) operating as a team lead with specialised subagents (backend, frontend, QA, devil's advocate). Where I pushed back on the model: dropped four data-model fields (`status`, `expiresAt`, `isDefault`, `basedOn` chaining) that the Figma implied but the brief didn't require — scope creep test passed; deferred each to "what next" with rationale.

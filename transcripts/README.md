## AI Interaction Transcript

> The challenge explicitly scores the precedence rationale and asks for AI transcripts
> showing deliberate direction rather than generic AI output. This is the full session log.

---

### Session 1 — Challenge Analysis & Precedence Research

**Me:** Hey Claude, I got this challenge, can you analyze this please.

**Claude:** I've read the PDF. Here's my read of what's actually being asked.

#### What this challenge really is

On the surface it's a CRUD app — search products, pick some, apply an adjustment, save a
profile. That part is the floor, not the test. Two things stand out:

**The precedence rule is the actual scored work.** They say it explicitly:
*"AI will hand you a generic one. Your rationale is what we're scoring."*

The Bondi Cellars scenario has three valid answers depending on which philosophy you pick:

| Approach | Result | Rationale |
|---|---|---|
| Most-specific-wins | $95 (Profile C) | Customer-level beats group-level |
| Best-for-customer | Cheapest of the three | Favours buyer |
| Best-for-supplier | Highest of the three | Protects margin |
| Stacking | All three applied in order | Probably wrong commercially |

**The AI-direction signal.** They want transcripts and explicitly call out "whether the code
reads coherent or stitched together." That means: don't accept generic AI output unchanged,
and the precedence rationale needs to be yours, not the model's first suggestion.

#### Judgement calls to make deliberately

- Rounding (banker's vs half-up, where you round — per-line or final)
- Negative-price clamp (brief says never negative — clamp to 0 or to a minimum?)
- "All Products" — snapshot of products-at-save-time, or dynamic membership?
- Deleted products — keep in profile as tombstones, or drop?
- Empty selection / 0% adjustment edge cases

---

**Me:** Let's research the precedence decision later. Stack: TS + Next.js + Express.
UI: close to design reference.

---

### Session 2 — Precedence Deep Research

**Me:** Can you do a deep market research and figure out what precedence real businesses
use in these scenarios and why.

**Claude:** Here's the synthesis after researching SAP, NetSuite, Salesforce CPQ, Shopify B2B,
Adobe Commerce, Wine Hub, inecta, Acctivate, 365WineTrade, and FOBOH's own public positioning.

#### What the industry actually does

| Pattern | Who uses it | Why |
|---|---|---|
| Most-specific-wins (no stacking) | SAP S/4HANA, NetSuite, Odoo, Wine Hub, inecta, Acctivate, 365WineTrade | ERPs and account-managed B2B. Negotiated prices are explicit commitments. |
| Lowest-price-wins | Shopify B2B, Adobe Commerce/Magento | Self-service ecommerce. Customer-facing, expects "best price I qualify for." |
| Explicit numeric priority | Salesforce CPQ, WooCommerce B2B | CPQ. Refuses to opinionate, pushes the conflict onto the data model. |
| Configurable / multi-mode | Shopware (3 toggles) | Platforms serving many verticals. |
| Stacking with deterministic order | Stripe, Chargebee | Subscription billing — different commercial model entirely. |

#### Why most-specific-wins is the right call for FOBOH

- Every F&B and wine specialist platform (Wine Hub, inecta, Acctivate, 365WineTrade)
  treats contract and customer-specific prices as overrides, not competitors in a min/max race.
- FOBOH is an AI-agent platform for F&B wholesalers — the paying customer is the supplier.
  That places it squarely in the ERP/account-managed camp.
- **McKinsey pocket-price waterfall research (2003, still cited):** off-invoice leakages
  average 16.3% of list; stacking is a primary leakage vector by design. A 1% list-price
  increase = ~8% operating-profit gain.
- Salesforce CPQ concedes the problem: their docs say "there's no way to dictate which
  contracted price is used — best practice is to design so it can't happen."
- Lowest-price-wins (Magento/Shopify) would only become right if FOBOH launched a
  buyer-facing venue ordering portal — not today's scope.

---

### Session 3 — Known Limitations (Prompted)

**Me:** Are there any cons to the precedence that you set, please list them.

**Claude:** Yes — and it's worth being honest about these because they're exactly the kind
of thing a reviewer will probe.

#### Cons of most-specific-wins, no-stacking

| # | Limitation | Severity |
|---|---|---|
| 1 | Customer doesn't always get the best price | Medium |
| 2 | Profile C becomes a long-term footgun — stale customer-level deals silently override future group campaigns | **High** |
| 3 | No time-bounded / campaign concept — profiles are forever-until-deleted | **High** |
| 4 | `updatedAt` tiebreaker is unstable — editing a description shifts which profile wins overnight | **High** |
| 5 | "Narrower product scope wins" ordering (SKU > sub-category > brand > all) is opinionated and not self-evident | Medium |
| 6 | Same-tier collisions are silently auto-resolved with no UI warning | Medium |
| 7 | Cannot stack a campaign on top of a customer deal even when intended | Medium |
| 8 | No exclusion / carve-out semantics | Low |
| 9 | "All products" snapshot has the opposite footgun — new SKUs fall back to base price until profiles are manually updated | Medium |
| 10 | No volume / quantity tier concept — wholesale commonly has per-case pricing | **High** |
| 11 | No historical re-pricing — past orders should price against memberships-as-of-order-date | Medium |
| 12 | Tier-skipping intent (floor/ceiling contracts) isn't expressible | Low |

The ones that would bite first in production: **#2, #3, #4, #10.**
The ones that are modeling gaps to defer: #7, #8, #11, #12.

---

### Session 4 — Design Review

**Me:** Did you review this design?
`https://www.figma.com/design/FIw2HbYDP7vxPiPkB857Bo/...`

**Claude:** Honest answer: no. I only worked from the screenshot embedded on page 4 of the PDF.
The Figma requires authentication and renders everything client-side — I can't access it
without you exporting the frames or sharing them directly.

Things I'd specifically want to confirm against the real design (assumptions I made):

- Profile list / index page — does it exist? What columns?
- Customer-assignment step — single customer vs group radio? Multi-select? Search?
- Resolver demo / preview — is there a "test this profile" screen at all?
- Basic info step — name and description only, or more fields (start/end date, currency)?
- Empty state / save success / draft state
- Overlap warning UX
- The "Based on" dropdown — are there other base prices a profile can derive from?

The last two are the ones that could materially change the data model.

---

### Session 5 — Implementation

**Me:** Accept and implement the plan. Deploy Agents Team — you are the Team Lead.
Specialized: Frontend engineer, Backend engineer, Database specialist, QA, Devil's advocate.
Add the plan in docs folder so we can push it with the repo.

**Claude (Team Lead):** Plan:
1. Move `PLAN.md` → `docs/PLAN.md`
2. Scaffold `backend/` and `frontend/` skeletons
3. Spawn agents in parallel — Backend+DB, Frontend, QA
4. Integrate, run end-to-end, brief Devil's advocate
5. README + verification pass

#### Team output

| Role | Delivered | Notes |
|---|---|---|
| Backend engineer | 11 source files, 17 baseline tests, Swagger, clean boot | Flagged a scaffold-side dep conflict — fixed by Team Lead |
| Frontend engineer | 13 files, sidebar + topbar + wizard + resolver demo, zero TS errors | Documented 8 deliberate UX deviations |
| QA | 9 HTTP route smoke tests | Skipped tiebreaker tests — Team Lead wrote those (6 tests) |
| Devil's advocate | Brutal review identifying 3 real defects | All three patched before shipping (6 hardening tests added) |

#### What the Devil's advocate caught and I fixed

1. **Empty-custom-map silently winning** — `mode:'custom'` with `fixedPricesCents:{}` would
   beat a legit profile via the custom-beats-adjustment tiebreaker and mis-attribute the source.
   Fix: Zod refinement rejects at create time + `selectionContains` rejects at resolve time
   (defence in depth).
2. **Express default HTML stack trace on malformed JSON** — Added error-handler middleware
   returning clean `{error:'bad-json'}` 400.
3. **Dead ternary** — `result.error === 'product-not-found' ? 404 : 404` in `resolve.ts`.
   Removed.

Plus: `/api/health` endpoint and a title tooltip on the disabled "Save as Draft" button.

---

### Session 6 — Bug Fix: profiles.map is not a function

**Me:** When loading the page after running the frontend server, getting this error:
`TypeError: profiles.map is not a function`

**Claude:** Root cause: the backend wrapped every list response in `{ items: [...] }` while
the frontend assumed bare arrays. All four list endpoints were affected —
`/api/pricing-profiles`, `/api/products`, `/api/customers`, `/api/customer-groups`.

**Fix:**
- `backend/src/routes/{products,customers,customer-groups,profiles}.ts` — return bare arrays
- `backend/src/openapi.ts` — Swagger response schemas updated to match
- `backend/src/__tests__/routes.test.ts` — assertions updated (bare-array contract now
  encoded as a regression test)
- Removed stray `console.log` debug lines in `routes/profiles.ts` and `lib/api.ts`

**Verification:**
- `npm test` in `backend/` — 38/38 passing
- Live HTTP — all four list endpoints return `[...]`, not `{items: [...]}`
- Live HTTP — `/api/resolve` for Bondi + KOYBRUNV6 still returns $95 from profile-c,
  tier=customer

**Lesson worth noting in the walkthrough:**
This bug is a real-world tell on the "no shared types" trade-off. Bring it up before the
reviewer does: *"the deliberate FE/BE type duplication caught me out on response envelopes —
fixed by aligning to bare arrays and locking the contract into the route smoke tests;
production fix is the OpenAPI-generated client listed in what's next."* That turns a bug
into evidence you understand the trade-off rather than a gap they noticed first.

---

## Live Verification (Final State)

```bash
# Bondi Cellars — customer-level profile wins
curl "http://localhost:3001/api/resolve?customerId=bondi-cellars&productId=KOYBRUNV6"
# → $95 from profile-c, tier=customer ✓

# Green-Grocer — group-level (Independent Retailers) wins
curl "http://localhost:3001/api/resolve?customerId=green-grocer&productId=KOYBRUNV6"
# → $108 from profile-a, tier=group ✓

# Harbour-Hotel — group-level (VIP) wins
curl "http://localhost:3001/api/resolve?customerId=harbour-hotel&productId=KOYBRUNV6"
# → $105 from profile-b, tier=group ✓

# Corner-Store — no groups, base price
curl "http://localhost:3001/api/resolve?customerId=corner-store&productId=KOYBRUNV6"
# → $120 base, tier=none ✓
```
\```

---

# P4.4 — Evidence Drawer Closeout

P4.4 is a frontend/read-only product-system engineering milestone under issue #206 / PR #207.

## Canonical implementation

- `artifacts/seo-engine/src/lib/evidence-drawer-model.ts`
- `artifacts/seo-engine/src/components/evidence-drawer.tsx`
- proposal integration in `artifacts/seo-engine/src/components/proposal-table.tsx`
- opportunity integration in `artifacts/seo-engine/src/pages/opportunities.tsx`
- evidence-drawer styles in `artifacts/seo-engine/src/index.css`

## Evidence honesty contract

The drawer renders only data exposed by the current frontend row contract.

Proposal evidence may show:
- evidence IDs and declared count;
- confidence and evidence sufficiency;
- quality status/score/approval eligibility/checks;
- quality evidence IDs;
- blocking reasons and warnings;
- semantic provenance;
- rationale and expected benefit;
- bounded-pilot / whole-site coverage fields exactly as exposed by the row.

Opportunity evidence may show:
- evidence count;
- confidence;
- rationale;
- qualification explanation;
- query/URL metadata.

Opportunity rows do not expose evidence IDs, so the drawer marks those references unavailable rather than inventing IDs.

The following P3 read-model dimensions remain explicit unavailable states because they are not bound into the current frontend API contract:
- freshness;
- support tier;
- retention/history;
- conflict state;
- corroboration.

An evidence count is never treated as proof that detailed references are available. Count/ID mismatch is partial. Missing IDs are never synthesized. Bounded-pilot evidence is not whole-site evidence.

## Interaction contract

The product-level drawer uses the existing Radix-backed `Sheet` primitive:
- actual button trigger;
- dialog title and description;
- right-side scrollable inspection surface;
- focus/close behavior provided by the underlying accessible dialog primitive;
- wrap-safe evidence ID display;
- reusable P4.2 StatusBadge semantics.

The drawer is presentation-only and contains no query hook, mutation hook, provider/network request, DB access, approval action, execution action or deployment dispatch.

## Validation

Implementation head:
- SHA `95b2524cc3b29d3cb16d7417387ad19408b8a012`
- tree `21997d2c4c2a3ac38a951240d62b9e735ce699c8`

Replit validation on that exact head:
- SEO Engine tests: 38 passed
- recursive workspace tests: passed
- SEO Engine/full typecheck: passed
- SEO Engine/full build: passed
- `git diff --check`: passed

Exact-head GitHub CI run `35325409172`: success.

Final merge still requires green CI on the exact docs-complete PR head.

## Safety boundary

P4.4 does not authorize or perform publication/deployment, provider/public-site requests or mutation, Production DDL/DML, observation/evidence Production persistence/reads, scheduler/worker activation, Task #53/#54 execution, secret/config changes, or autonomous capability activation.

Default next safe milestone after certified P4.4 closeout: **P4.5 — Command Center v2**. Real P1 live-provider activation remains a separately authorized alternative.

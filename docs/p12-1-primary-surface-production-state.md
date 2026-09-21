# P12.1 — primary-surface production-state audit and remediation

## Scope

P12.1 is the first bounded engineering task in final production certification.

Its purpose is narrow:

> Every **primary navigation** destination must be a deliberate v1 operational surface. Placeholder-only, planned-only, and synthetic-fixture-only engineering screens must not be presented as primary production product surfaces.

This milestone does not delete engineering work and does not activate any provider or production runtime.

## Audit result

The primary navigation previously exposed eight routes that are not production-bound.

### Informational/placeholder-only

- `/rankings`
- `/internal-links`
- `/experiments`
- `/learning`

The first three render `InformationalPage` with explicit unavailable state. Learning renders `InformationalPage` with `coming_soon`, and its navigation entry was additionally marked `status: "planned"`.

### Synthetic/read-only engineering fixtures

- `/search-intelligence`
- `/ai-visibility`
- `/impact`
- `/reports`

These workspaces are valuable engineering/certification surfaces and are already visibly labeled as synthetic/read-only. However, they do not have production-bound loaders and therefore are not primary production surfaces yet.

## Remediation

All eight routes remain mounted in `App.tsx`.

They continue to receive:
- P11.5 WCAG/accessibility route certification;
- P11.6 route-wide responsive/product-polish certification;
- focused engineering browser tests where applicable.

They are removed only from `navigation.json`, so they are no longer exposed through desktop/mobile primary navigation.

Primary navigation now contains only:

### Command Center
- Overview

### Discover
- Opportunities

### Audit
- Technical SEO

### Execute
- Governance
- Actions
- Approvals
- Deployments

### Measure
- Performance

### System
- Connections
- Settings

## Why routes remain mounted

P12.1 is a product-surface certification, not a deletion milestone.

Keeping the routes mounted preserves:
- engineering evidence;
- deterministic synthetic workspaces;
- accessibility/responsive regression coverage;
- future production binding work;
- direct/internal testing.

A future milestone may return one of these routes to primary navigation only after its production-state contract is deliberately upgraded.

## Production-surface contract

`src/production-surface-contract.test.mjs` locks:

- no `status: "planned"` primary nav item;
- no engineering-only route in primary navigation;
- all engineering-only routes still mounted;
- informational pages explicitly refuse fake generated metrics;
- synthetic workspaces remain visibly disclosed;
- primary routes remain a strict subset of mounted routes.

The navigation contract separately distinguishes:
- primary operational routes;
- engineering-only mounted routes.

## Browser proof

The critical-path suite verifies:

1. the desktop primary nav exposes the operational route set;
2. engineering-only links are absent;
3. direct navigation to `/search-intelligence` still succeeds;
4. the workspace still visibly says `SYNTHETIC READ-ONLY`;
5. no new provider/external request is made.

## Safety boundary

P12.1 performs no:

- provider/OAuth activity;
- production crawl;
- Production DB/storage mutation;
- evidence persistence activation;
- provider/public-site mutation;
- scheduler/worker activation;
- autonomous mutation;
- credential/secret change;
- retention/deletion execution;
- deployment or publication.

## Completion meaning

P12.1 completion means:

> the engineering source has no placeholder-only or fixture-only **primary navigation** screen, and engineering-only surfaces cannot masquerade as normal primary product navigation.

It does **not** mean those hidden engineering routes are production-ready, and it does not complete P12.2–P12.10.

## Next boundary

After P12.1 certification, the next roadmap work is constrained by live-proof dependencies:

- P12.2 requires authorized real full-site crawl proof;
- P12.3 requires live first-party provider activation;
- P12.4 requires live external-intelligence activation.

No live step is authorized by P12.1.

## Final implementation certification

Certified lineage:

- implementation base SHA/tree: `6f4dd2a11f0f347e2ac6ba9823d90f299fa00dd6` / `af57d67916ff62354e49f643428aca5833a217c5`;
- final exact tested head/tree: `be143b4084823786ecc42440dbcd722af2fac39b` / `a47387c152b25b63a4256b33f6390fe24d13f20b`;
- exact-head PR CI #668 / run `35645253660`: success;
- implementation merge/tree: `4bc2bfcead3f7eaece1e0143e4546110580984f1` / `a47387c152b25b63a4256b33f6390fe24d13f20b`;
- post-merge main CI #669 / run `35645749969`: success;
- workspace packages: **1,264 PASS / 0 failures**;
- P11.10 synthetic scale profile: PASS;
- canonical Chromium: **111/111 PASS**;
- typecheck: PASS;
- build/P11.1 asset budget: PASS;
- JS: 610,807 raw / 175,245 gzip;
- CSS: 186,332 raw / 31,020 gzip.

The first implementation CI (#666) correctly exposed two historical assumptions that Impact and Reports must remain primary-nav items. P12.1 did not weaken those workspaces: the contracts were updated to preserve their routes and existing accessibility/responsive/reporting/impact certification while recognizing them as engineering-only until production-bound.

Replit was Git-only fast-forwarded to the exact implementation merge/tree with `0/0` ahead/behind, zero tracked/untracked changes, clean worktree, zero Git locks and zero active repository writers. A follow-up non-browser validation request was not queued because the Replit Agent channel became busy; no separate Replit test-run result is claimed.

## P12.1 closeout decision

P12.1 is complete for the engineering source tree:

- no primary navigation item is planned;
- no placeholder-only route is primary;
- no synthetic fixture-only workspace is primary;
- engineering-only routes remain available for direct/internal certification and are still visibly honest about their data state.

This does not complete any live-proof criterion.

P12.2, P12.3 and P12.4 remain separately authorized live-proof/provider-activation lanes. Generic continuation may inspect prerequisites and prepare runbooks but must not execute those live steps without fresh explicit authorization.

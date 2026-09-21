# P12.1 — primary-surface production-state closeout

## Milestone

P12.1 — no primary placeholder screens.

- issue: #379
- implementation PR: #380
- implementation base SHA/tree: `6f4dd2a11f0f347e2ac6ba9823d90f299fa00dd6` / `af57d67916ff62354e49f643428aca5833a217c5`
- final exact tested head/tree: `be143b4084823786ecc42440dbcd722af2fac39b` / `a47387c152b25b63a4256b33f6390fe24d13f20b`
- exact-head PR CI: #668 / run `35645253660` — success
- implementation merge/tree: `4bc2bfcead3f7eaece1e0143e4546110580984f1` / `a47387c152b25b63a4256b33f6390fe24d13f20b`
- post-merge main CI: #669 / run `35645749969` — success
- workspace tests: **1,264 PASS / 0 failures**
- P11.10 synthetic scale: PASS
- canonical Chromium: **111/111 PASS**
- typecheck/build/P11.1 budgets: PASS
- JS: 610,807 raw / 175,245 gzip
- CSS: 186,332 raw / 31,020 gzip

## Audit result

The P12 entry review identified one explicitly planned primary route and required classification of all primary surfaces.

The P12.1 audit found eight mounted routes that were not production-bound:

### Informational / placeholder-only
- `/rankings`
- `/internal-links`
- `/experiments`
- `/learning`

### Synthetic / read-only engineering fixtures
- `/search-intelligence`
- `/ai-visibility`
- `/impact`
- `/reports`

## Remediation

Those eight routes remain mounted in `App.tsx` and continue deterministic browser/accessibility/responsive certification.

They were removed from primary navigation.

Primary product navigation now contains only:
- Overview
- Opportunities
- Technical SEO
- Governance
- Actions
- Approvals
- Deployments
- Performance
- Connections
- Settings

No primary item is marked planned.

## Regression contracts

P12.1 adds:
- explicit primary-vs-engineering-only navigation contracts;
- `production-surface-contract.test.mjs`;
- a critical-path Chromium proof that engineering-only links are absent from primary nav while direct `/search-intelligence` access remains visible as `SYNTHETIC READ-ONLY` and network-closed.

P11.5/P11.6 still exercise all mounted routes, including engineering-only routes.

## Stabilization

Initial CI #666 failed only because historical P10.7/P11.7 tests asserted Impact/Reports were primary navigation entries.

The new P12.1 contracts themselves passed.

Those historical tests were updated to preserve the important guarantees:
- Impact remains routed and certified;
- Reports remains routed and certified;
- neither is required to be a primary product surface until production-bound.

Exact-head CI #668 then passed the full gate.

## Replit

Replit was Git-only reconciled to the implementation merge:
- branch `main`;
- HEAD/tree `4bc2bfcead3f7eaece1e0143e4546110580984f1` / `a47387c152b25b63a4256b33f6390fe24d13f20b`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked/untracked zero;
- clean;
- Git locks zero;
- active repository writers zero.

The subsequent non-browser validation request was not queued because the Replit Agent channel became busy. No separate Replit test-run result is claimed.

## Boundaries preserved

P12.1 is unpublished.

It performed no:
- provider/OAuth call;
- production crawl;
- Production DB/storage read/write/DDL/DML;
- observation/evidence persistence activation;
- provider/public-site write;
- scheduler/worker activation;
- autonomous mutation;
- credential/secret change;
- destructive retention execution;
- Task #51/#53/#54 execution;
- deployment or publication.

## Next dependency boundary

P12.2–P12.4 require explicit live authorization.

- P12.2: production full-site + repeat/reconciliation + incremental crawl proof.
- P12.3: live GSC + required first-party analytics/catalog proof.
- P12.4: live selected external-intelligence provider proof.

Generic continuation may perform read-only preflight/runbook/dependency review only. It must not execute those live proofs without fresh authorization.

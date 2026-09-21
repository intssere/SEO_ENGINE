# P11.1 — performance budgets and offline profiling closeout

## Status

P11.1 is complete and certified as deterministic/offline enterprise hardening.

It does not authorize or perform production load generation, production RUM, provider contact, Production DB access/mutation, secret/config/runtime mutation, autonomous execution, deployment or publication.

## Canonical implementation record

- Issue: #341 — `P11.1 — production performance budgets and offline profiling`
- Implementation PR: #342 — `P11.1 — production performance budgets and offline profiling`
- Base SHA/tree: `accea205784a1ba5a99d4627f807e52742d3fb84` / `b7e1782f9a2fe4e20ea4e60ce0ed9ab9b52d7d46`
- Exact tested implementation head/tree: `a3e6eb9ec03f090ac8c18da4d0ff3f8823fff635` / `47346f32708af927b8b9394b82c892b3caa00318`
- Exact-head CI: #588 / run `35572373801` — success
- Implementation merge/tree: `b43d10f5662862cb6467edd056b1e8adf96c2aa5` / `47346f32708af927b8b9394b82c892b3caa00318`
- Post-merge main CI: #589 / run `35572567203` — success

## What P11.1 changed

P11.1 adds:

- `artifacts/seo-engine/performance-budgets.json`
- `artifacts/seo-engine/performance/performance-budget.mjs`
- `artifacts/seo-engine/scripts/check-performance-budgets.mjs`
- `artifacts/seo-engine/src/performance-budget-contract.test.mjs`
- `artifacts/seo-engine/e2e/performance-profile.spec.mjs`
- `docs/p11-1-performance-budgets-and-profiling.md`
- frontend package-script registration for tests and post-build budget enforcement.

No dependency or lockfile change was required.

## Build budgets

Version `p11.1.v1` defines:

- JavaScript: max per-asset and total raw `620,000` bytes; gzip `180,000` bytes; at least one JS asset required.
- CSS: max per-asset and total raw `190,000` bytes; gzip `33,000` bytes; at least one CSS asset required.

The checker recursively scans emitted `.js`/`.css` artifacts, stable-sorts paths, records raw/gzip bytes and exits non-zero on a violation.

The existing Vite >500 kB advisory was deliberately not raised or suppressed. The P11.1 hard budget gate is additive.

Canonical GitHub post-merge measurements:

- JS `assets/index-BqUJW5qn.js`: `589,405` raw / `170,018` gzip.
- CSS `assets/index-1_GVD82U.css`: `179,974` raw / `29,944` gzip.
- `P11_1_BUDGET_PASS`.

Replit's local compression runtime produced `169,557` gzip for the same JS bytes and `29,929` gzip for the same CSS bytes. This small cross-environment compression variance does not change the source artifact identity or budget result.

## Synthetic profile semantics

A P11.1 profile is explicitly `synthetic_local`, not production measurement.

Profile fields:

- `domContentLoadedMs`
- `loadEventMs`
- `firstContentfulPaintMs`
- `mainContentReadyMs`
- `resourceCount`

Unavailable timing values remain `null`.

For configured timing metrics, supplied baseline/candidate comparison marks a regression only when candidate timing exceeds the larger of:

- baseline × `1.25`; or
- baseline + `100 ms`.

Metrics remain independent. P11.1 creates no aggregate performance grade, confidence score, Core Web Vitals claim, production-user verdict or deployment decision.

The local Playwright profile routes are:

- `/`
- `/technical-seo`
- `/search-intelligence`
- `/ai-visibility`
- `/governance`
- `/impact`
- `/connections`

They use the existing synthetic network fixture. External origins remain blocked and unmocked API requests fail the browser suite.

## Certification

Exact-head PR CI #588 and post-merge main CI #589 both passed:

- schema/bootstrap gates;
- all workspace tests;
- canonical Ubuntu/Chromium Playwright suite;
- full typecheck;
- full build including P11.1 budget enforcement.

Replit was Git-only fast-forwarded to the exact implementation merge/tree:

- branch: `main`
- HEAD: `b43d10f5662862cb6467edd056b1e8adf96c2aa5`
- tree: `47346f32708af927b8b9394b82c892b3caa00318`
- origin/main: exact same SHA/tree
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- index/worktree: clean.

On that exact Replit tree, using existing dependencies only:

- recursive workspace tests: PASS;
- full typecheck: PASS;
- full build + P11.1 budget gate: PASS;
- `git diff --check`: PASS;
- local Chromium launch: unavailable because the workspace image lacks `libglib-2.0.so.0`; no system package installation was performed.

GitHub Ubuntu/Chromium remains the canonical browser runner, and both exact-head CI #588 and post-merge CI #589 passed the complete browser suite.

## Safety and publication

P11.1 performed no:

- production traffic/load generation;
- production RUM;
- live provider or public-site request;
- Production DB read/write/DDL/DML;
- credential/secret rotation;
- runtime/deployment configuration change;
- scheduler/worker/retry activation;
- P9.8 implementation/activation;
- Task #51/#53/#54 execution;
- provider/public-site mutation;
- deployment;
- publication.

Published production remains the separately certified Task #73 application source.

## Next safe boundary

The next safe engineering boundary is:

**P11.2 — security review: auth, CSRF, SSRF, CSP/headers, secret handling and supply chain**

Generic continuation may begin with deterministic source/static/dependency inspection and network-free tests/remediation over the engineering tree.

Generic continuation does not authorize secret or credential rotation, live OAuth/provider activity, Production DB mutation, runtime/deployment configuration changes, P9.8 implementation/activation, Task #51/#53/#54 execution, provider/public-site mutation, deployment or publication.

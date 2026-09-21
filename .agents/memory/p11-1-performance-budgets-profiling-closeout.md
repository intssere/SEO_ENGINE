# P11.1 — Performance budgets and offline profiling closeout

## Status

P11.1 is complete and certified as deterministic/offline enterprise-hardening engineering.

It does not authorize or perform production load generation, live-provider contact, Production database access, credential changes, runtime/deployment mutation, autonomous execution, provider/public-site mutation, deployment or publication.

## Canonical record

- Issue: #341 — `P11.1 — production performance budgets and offline profiling`
- Implementation PR: #342 — `P11.1 — production performance budgets and offline profiling`
- Base SHA/tree: `accea205784a1ba5a99d4627f807e52742d3fb84` / `b7e1782f9a2fe4e20ea4e60ce0ed9ab9b52d7d46`
- Exact tested PR head/tree: `a3e6eb9ec03f090ac8c18da4d0ff3f8823fff635` / `47346f32708af927b8b9394b82c892b3caa00318`
- Exact-head CI: #588 / run `35572373801` — success
- Implementation merge/tree: `b43d10f5662862cb6467edd056b1e8adf96c2aa5` / `47346f32708af927b8b9394b82c892b3caa00318`
- Post-merge main CI: #589 / run `35572567203` — success

## Build budgets

Version `p11.1.v1` defines:

- JavaScript: max asset raw `620000`, max asset gzip `180000`, max total raw `620000`, max total gzip `180000`;
- CSS: max asset raw `190000`, max asset gzip `33000`, max total raw `190000`, max total gzip `33000`;
- at least one asset is required for each class.

The checker recursively scans emitted JS/CSS, sorts paths deterministically, measures raw bytes, computes gzip bytes with Node zlib and fails the build on any violation.

The existing Vite >500 kB advisory remains unchanged. P11.1 does not raise `chunkSizeWarningLimit` to hide the current bundle shape.

Canonical post-merge GitHub build evidence:

- CSS `assets/index-1_GVD82U.css`: raw `179974`, gzip `29944`;
- JS `assets/index-BqUJW5qn.js`: raw `589405`, gzip `170018`;
- `P11_1_BUDGET_PASS`.

Gzip bytes may vary slightly across zlib/runtime environments, so reviewed ceilings are the enforcement contract rather than an assumption that every platform emits byte-identical gzip output.

## Synthetic-local browser profiling

The Playwright suite profiles:

- `/`
- `/technical-seo`
- `/search-intelligence`
- `/ai-visibility`
- `/governance`
- `/impact`
- `/connections`

Profile fields:

- `domContentLoadedMs`
- `loadEventMs`
- `firstContentfulPaintMs`
- `mainContentReadyMs`
- `resourceCount`

Unavailable timing values remain `null`.

The browser fixture blocks external origins and treats unmocked API requests as failures. No production URL or provider is contacted by this path.

## Regression semantics

Supplied baseline/candidate timing profiles are compared independently per configured metric.

A timing is a regression only when candidate exceeds the larger of:

- baseline × `1.25`;
- baseline + `100 ms`.

Missing baseline/candidate metrics remain `unavailable`.

This is deterministic supplied-evidence logic. It is not:

- production RUM;
- Core Web Vitals certification;
- load/scale testing;
- a performance score or grade;
- a percentile/confidence estimate;
- a search-ranking signal;
- causal evidence.

## Validation

Exact-head PR CI #588 and post-merge main CI #589 both passed:

- legacy schema checks;
- Task #55 database bootstrap tests;
- P3.6 schema tests;
- all workspace tests;
- Playwright Chromium critical-path/axe/visual/profile suite;
- typecheck;
- build including P11.1 budget enforcement.

Replit final state on the implementation merge:

- branch: `main`;
- HEAD/tree: `b43d10f5662862cb6467edd056b1e8adf96c2aa5` / `47346f32708af927b8b9394b82c892b3caa00318`;
- origin/main exact;
- ahead/behind: `0/0`;
- tracked differences: 0;
- untracked files: 0;
- clean index/worktree.

Replit validation using existing dependencies only:

- recursive workspace tests: PASS;
- full typecheck: PASS;
- full build: PASS;
- P11.1 budget gate: PASS;
- `git diff --check`: PASS.

Replit-local Playwright was not rerun because the installed Chromium lacked required shared libraries. No system packages were installed. GitHub Ubuntu/Chromium is the canonical browser runner and passed both required CI gates.

## Publication state

P11.1 is unpublished.

Published production remains the separately certified Task #73 source.

## Next safe boundary

**P11.2 — security review: auth, CSRF, SSRF, CSP, headers, secret handling and supply chain.**

Generic continuation may perform deterministic/offline source/config/dependency review and bounded test-based hardening only.

It does not authorize intrusive production scanning, exploitation, secret retrieval or rotation, provider credential/scope changes, Production DB mutation/DDL, deployment/runtime mutation, P9.8 activation, Task #51/#53/#54 execution, deployment or publication.

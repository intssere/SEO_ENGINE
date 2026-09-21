# P11.6 — responsive/product polish certification

## Scope

P11.6 is a route-wide engineering product-polish pass over the current SEO ENGINE frontend.

It builds on:

- P4.7 responsive professional polish;
- P4.8 accessibility remediation;
- P4.10 deterministic Chromium/visual regression;
- P11.5 WCAG 2.2 AA engineering certification.

P11.6 does not replace or weaken those milestones. It broadens responsive/product-quality validation from selected shared primitives and selected visual baselines to every routed application surface.

## Engineering boundary

The P11.6 browser suite is local and synthetic:

- local Vite test server;
- existing deterministic synthetic API fixtures;
- external origins blocked;
- unmocked local API requests treated as failures;
- Chromium in canonical GitHub CI;
- no Production DB/storage access;
- no provider request;
- no public-site crawl or mutation;
- no worker/scheduler activation;
- no runtime/deployment mutation;
- no publication.

## Routed surface inventory

P11.6 covers all explicit app routes plus the not-found fallback:

- `/`
- `/opportunities`
- `/governance`
- `/actions`
- `/approvals`
- `/performance`
- `/deployments`
- `/technical-seo`
- `/rankings`
- `/internal-links`
- `/ai-visibility`
- `/experiments`
- `/search-intelligence`
- `/learning`
- `/impact`
- `/connections`
- `/settings`
- not-found fallback.

## Responsive certification matrix

Each routed surface is exercised at four representative viewports:

- wide desktop: 1440×1000;
- compact desktop: 1024×900;
- tablet: 768×1024;
- phone: 390×844.

The suite verifies:

- no document/body horizontal overflow;
- shell/workspace/content/mobile-navigation geometry stays inside the viewport;
- `.content` retains at least a 12px horizontal product gutter;
- desktop sidebar/mobile-navigation mode changes at the established 820px breakpoint;
- visible operational copy is not accidentally clipped when CSS overflow hides content;
- intentionally title-backed truncation and internal table/DataGrid scrolling remain allowed;
- visible interactive controls do not overlap;
- wide tables remain contained in explicit internal horizontal-scroll regions;
- phone primary controls outside dense DataGrid headers preserve the established 44px product touch target;
- the opened mobile navigation panel stays viewport-safe and keeps 44px navigation links.

## P11.5 preservation

P11.6 explicitly retains the P11.5 browser gate:

- WCAG 2.0/2.1/2.2 A/AA axe tags;
- every returned WCAG-tagged violation blocks;
- 320px reflow;
- WCAG 2.2 SC 2.5.8 target-size/spacing;
- skip-link and route-focus transfer;
- focus visibility/focus-not-obscured;
- reduced-motion rendering;
- network isolation and browser-error cleanliness.

A P11.6 remediation must not relax those checks to make product-polish tests pass.

## Audit-first workflow

The initial P11.6 branch adds the certification gate before broad UI remediation.

The first canonical Chromium run is allowed to fail. Any failure should be treated as browser evidence for a bounded presentation correction. Changes should be limited to the smallest responsive/layout/state treatment necessary and should retain P11.5 accessibility and P11.1 performance budgets.

## Acceptance

P11.6 completes only after:

1. P11.6 static contract passes;
2. route-wide P11.6 Chromium checks pass;
3. all P11.5 accessibility checks remain green;
4. all existing critical-path/performance/visual browser tests remain green;
5. all workspace tests pass;
6. typecheck passes;
7. build and P11.1 budgets pass;
8. `git diff --check` passes;
9. exact-head PR CI is green;
10. exact tested head is merged;
11. post-merge main CI is green;
12. Replit is Git-only exact-synced and non-browser validated;
13. documentation/memory closeout is merged;
14. no deployment/publication occurs.

## Limitations

P11.6 is an engineering responsive/product-quality certification for the exact source tree and deterministic fixtures. It does not certify the separately published Task #73 release, every physical device/browser combination, live provider content, future dynamic content, or commercial design acceptance outside the tested scope.

## Final implementation certification

Certified implementation lineage:

- base SHA/tree: `75294652c5ddcf8f4b16873e78678b5c991dece6` / `d8fe375deff44bcc6fdaca8b37123d9ebe689f40`;
- final exact tested head/tree: `d3695e9467f26c4a1501acc27715f1b2c85fc2f3` / `6e55d861c171a3e412ef93d37318677285f6cb9e`;
- exact-head PR CI #631 / run `35605218166`: success;
- implementation merge/tree: `93ccd007c9fb152f60e88daefe6c727afed3fb71` / `6e55d861c171a3e412ef93d37318677285f6cb9e`;
- post-merge main CI #632 / run `35605748067`: success;
- canonical GitHub Chromium: **100/100 PASS**, consisting of the retained 81-test P11.5/P4.10/performance/visual suite plus 19 P11.6 route/mobile-navigation product-polish tests; each of the 18 route tests internally certifies all four viewport classes;
- workspace packages: **1,225 PASS / 0 failures**;
- exact-head GitHub build budgets: JS 589,405 raw / 170,018 gzip; CSS 180,099 raw / 29,963 gzip; `P11_1_BUDGET_PASS`;
- Replit exact Git sync: implementation merge SHA/tree above, origin/main exact, `0/0`, clean, zero tracked/untracked changes;
- Replit non-browser validation: 1,225 workspace tests PASS / 0 failures, typecheck PASS, build/P11.1 budget PASS and `git diff --check` PASS;
- Replit build budgets: JS 589,405 raw / 169,557 gzip; CSS 180,099 raw / 29,948 gzip.

## Audit-driven stabilization record

P11.6 was deliberately implemented audit-first.

- CI #626 / run `35603994772` failed 11 new P11.6 route checks. Ten failures were test-assumption defects caused by standard 1×1 visually-hidden labels being interpreted as visible clipped copy; the root phone surface simultaneously revealed real shared `.linkButton` targets at 36px.
- The clipping audit was corrected semantically by recognizing visually-hidden geometry/computed-style behavior rather than hard-coding individual class names, and mobile shared action links were raised to the established 44px product target.
- CI #629 / run `35604590286` then passed 99/100 browser tests and exposed only the Performance phone filters: Reporting window, Country and Device selects were 28px high.
- Those compact Performance selects were raised to 44px minimum height and locked by the static P11.6 contract.
- CI #631 then passed the complete 100-test browser matrix, followed by post-merge CI #632.

This history is retained to distinguish real product defects from audit-harness defects and to show that no certification rule was relaxed merely to obtain a green build.

## Next boundary

P11.6 is complete for the engineering tree and remains unpublished.

The next safe engineering boundary is **P11.7 — reporting/export/shareable executive views**. Generic continuation is limited to deterministic/read-only source and local/synthetic presentation/export/share UX over bounded existing evidence. Real production-data export, external delivery, public sharing/publication, provider/runtime mutation, Production DB/storage mutation, workers/schedulers, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment and publication remain separately gated.

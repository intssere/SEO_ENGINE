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

# P11.5 — WCAG 2.2 AA accessibility certification

## Scope

P11.5 is the final engineering-side accessibility certification pass for the current SEO ENGINE frontend.

It builds on:

- P4.8 source/unit accessibility remediation;
- P4.10 deterministic Chromium, axe and browser-regression coverage.

P11.5 does not replace those foundations. It tightens the certification boundary from a six-route serious/critical axe screen into a complete routed-surface WCAG 2.2 A/AA gate.

## Certified engineering boundary

The P11.5 suite is local and synthetic:

- Chromium only;
- local Vite test server;
- existing deterministic synthetic API fixtures;
- all external browser origins blocked;
- all unmocked local API requests recorded and treated as failures;
- no Production DB/storage access;
- no provider request;
- no crawl execution;
- no public-site mutation;
- no worker/scheduler activation;
- no deployment or publication.

A successful P11.5 result certifies only the engineering tree and the deterministic browser conditions exercised by the suite.

It does not prove accessibility of a separately published production release, every browser/OS/assistive-technology combination, third-party/provider pages, or future runtime content that has not passed the same gate.

## Routed surface inventory

The browser certification covers all explicit app routes plus the not-found fallback:

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

The `/learning` route remains explicitly planned product content, but because it is still rendered by the current router/navigation it remains inside the accessibility gate.

## Automated WCAG gate

Each routed surface is scanned with the existing pinned `@axe-core/playwright` dependency using:

- `wcag2a`;
- `wcag2aa`;
- `wcag21a`;
- `wcag21aa`;
- `wcag22a`;
- `wcag22aa`.

P11.5 fails on every violation returned for those WCAG tags.

Unlike the prior P4.10 baseline, no axe impact category is ignored. A `minor` or `moderate` WCAG-tagged violation blocks certification in the same way as a `serious` or `critical` violation.

## WCAG 2.2 browser assertions outside axe

Axe does not prove every interaction-level criterion, so P11.5 adds deterministic checks around areas that are material to the current UI.

### Reflow

Every routed surface is rendered at a 320 CSS-pixel viewport.

The document and body must not create page-level horizontal scrolling.

Complex two-dimensional DataGrid content remains allowed to use its own independently focusable horizontal-scroll region, as established in P4.8. The exception does not permit the outer document itself to overflow.

### Target size

Visible interactive targets are certified against WCAG 2.2 SC 2.5.8. A target passes when it is at least 24 by 24 CSS pixels or when the criterion's spacing exception is satisfied by a centered 24 CSS-pixel circle that does not intersect another target (or another undersized target's equivalent circle).

The test also applies the inline-target exception only to actual inline anchors contained in text/list contexts. It does not broadly exempt navigation or button-like links.

### Focus visibility and focus not obscured

The browser suite checks that:

- the skip link is the first keyboard escape to main content;
- the focused skip link is visible;
- the focused skip link has a visible outline or box-shadow focus treatment;
- the focused skip link has viewport intersection;
- hit testing shows that it is not covered by another app element;
- activating the skip link focuses `#main-content`;
- SPA route changes focus `#main-content`.

The existing P4.10 tests continue to certify mobile-navigation Escape/focus restoration and Ask-dialog focus trapping/restoration.

### Reduced motion

The canonical Playwright configuration requests `prefers-reduced-motion: reduce`.

P11.5 verifies the preference is active and that rendered CSS animation/transition durations are collapsed to the shared reduced-motion ceiling.

## Existing source guarantees retained

P4.8 source contracts continue to require:

- one focusable main landmark;
- route-change focus handoff;
- labeled/focusable DataGrid scroll regions;
- programmatic form labels;
- live status/error semantics;
- AA-safe audited text palette;
- global focus-visible treatment;
- reduced-motion fallback;
- forced-colors focus treatment.

P11.5 adds a separate static contract to prevent the browser certification from silently losing routes, WCAG tags, all-impact blocking, 320px reflow, 24px target-size, focus, reduced-motion or network-isolation guarantees.

## Acceptance

P11.5 is complete only after:

1. focused P11.5 source/browser tests pass;
2. all workspace tests pass;
3. Chromium Playwright passes;
4. typecheck passes;
5. build and P11.1 asset budgets pass;
6. `git diff --check` passes;
7. exact-head GitHub PR CI is green;
8. the exact tested head is merged;
9. post-merge main CI is green;
10. Replit is Git-only aligned and validated;
11. final closeout documentation is merged;
12. no deployment/publication occurs.

## Certification limitations

P11.5 is an engineering certification, not a legal or universal conformance claim.

Manual testing with representative screen readers, magnification, speech input, switch access and a broader browser/OS matrix remains useful before a commercial accessibility statement. Production accessibility must also be re-certified after the engineering tree is separately authorized and published.

## Final implementation certification

Certified implementation lineage:

- base SHA/tree: `82e6ef687b1de176a02070baea10acc464748bf3` / `981f7889825ea40e334221a6c3b9df85781f6df8`;
- final exact tested head/tree: `8698aea5b0cf9124156364a40d05c8d084a2b05c` / `7263db76f570cfe03722ec43437be6b3361a579a`;
- exact-head PR CI #622 / run `35594233934`: success;
- implementation merge/tree: `11d4d0d363bac9e1d6da8d5f4ee21c49eb1c0ed0` / `7263db76f570cfe03722ec43437be6b3361a579a`;
- post-merge main CI #623 / run `35594621574`: success;
- canonical GitHub Chromium: 81/81 PASS, comprising 57 P11.5 accessibility tests, 13 critical-path tests, 7 performance-profile tests and 4 visual-regression tests;
- workspace package tests: 1,218 PASS / 0 failures;
- GitHub build budgets: JS 589,405 raw / 170,018 gzip; CSS 180,021 raw / 29,945 gzip; `P11_1_BUDGET_PASS`;
- Replit exact Git sync: merge SHA/tree above, origin/main exact, `0/0`, clean;
- Replit non-browser validation: 1,218 workspace tests PASS / 0 failures, typecheck PASS, build/P11.1 budget PASS and `git diff --check` PASS;
- Replit discovered 81 Chromium tests but could not launch Chromium because required shared libraries are unavailable in that environment, so no Replit browser assertion result is claimed.

The initial stricter CI #611 was intentionally informative: it exposed real target-size and contrast problems plus an incomplete synthetic proposal fixture. Those findings were repaired on the same implementation branch before final exact-head certification. The closeout preserves that stabilization history rather than treating the first audit failure as a production incident.

## Next boundary

P11.5 is complete for the engineering tree and remains unpublished.

The next safe engineering boundary is **P11.6 — responsive/product polish**. Generic continuation is limited to bounded source/local-synthetic browser work that preserves the P11.5 accessibility gates. Production provider/runtime activation, Production DB/storage mutation, secrets/config changes, workers/schedulers, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment and publication remain separately gated.

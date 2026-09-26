# UGP-2.5 — Contextual Onboarding

Status: implementation candidate on `ugp-025-contextual-onboarding`.

## Goal

Add customer-facing, route-aware guidance without coupling SEO ENGINE to one tour library or creating hidden product state.

## Dependency evaluation

Reviewed 2026-09-24.

### Driver.js

- current npm package reviewed: 1.8.0;
- MIT license;
- zero runtime dependencies;
- package documentation describes the library as roughly 5 kB gzipped;
- keyboard-controllable product-tour/highlight API;
- technically the preferred external candidate.

Sources:

- https://www.npmjs.com/package/driver.js
- https://github.com/nilbuild/driver.js

### Intro.js

Current package is AGPL-3.0 for open-source use and offers a separate commercial license for commercial applications.

### Shepherd.js

Current package is dual-licensed AGPL-3.0/commercial and has runtime dependencies.

## Decision

Do not add a third-party tour dependency in UGP-2.5.

UGP-2.4 already consumed nearly all of the then-reviewed JavaScript budget headroom. The initial onboarding behavior is small enough to implement natively while preserving a strict replacement boundary.

The preferred future external adapter remains Driver.js if product needs outgrow the native implementation.

## Replaceable boundary

Tour definitions live in `contextual-onboarding-model.ts` and contain only route-independent customer copy plus CSS selectors.

DOM behavior lives only in `contextual-onboarding-adapter.ts`.

The current adapter:

- finds the first visible matching target;
- adds/removes a single highlight marker;
- scrolls the target into view;
- respects reduced-motion preference;
- falls back to the main workspace when a target is not currently rendered.

A future Driver.js adapter can replace this behavior without changing tour definitions or customer-facing pages.

## Customer behavior

The shell exposes **Guide this page** on desktop and mobile.

The guide:

- is user-invoked only;
- changes guidance by route;
- highlights one existing UI target at a time;
- provides Back, Next and Done;
- closes with Escape;
- returns focus to the invoking control;
- does not block the rest of the page;
- does not store completion state;
- performs no analytics or telemetry.

## Truth and authority boundary

Onboarding explains existing product state only.

It does not:

- grant approval;
- grant execution authorization;
- start a crawl;
- connect a provider;
- persist credentials;
- mutate a public site;
- activate automation;
- fabricate source data.

## External dependency posture

No Driver.js, Intro.js or Shepherd.js package is added by this milestone.

Any later external-engine adoption must update this record with exact version, license, measured bundle effect, accessibility certification and replacement/fallback behavior.


## Measured bundle effect

Exact GitHub CI on the pre-rebase UGP-2.5 candidate emitted:

- entry JS: **621,879 raw / 178,225 gzip**;
- contextual-onboarding chunk: **6,018 raw / 2,491 gzip**;
- website-connection-wizard chunk: **9,609 raw / 3,224 gzip**;
- total JS: **637,506 raw / 183,940 gzip**;
- CSS: **190,206 raw / 31,717 gzip**.

Compared with certified UGP-2.4, the contextual-onboarding milestone adds **6,788 raw / 2,727 gzip JS** and **1,302 raw / 247 gzip CSS**.

The hard P11.1 checker still counts all emitted chunks. The reviewed ceilings are rebased only to **640,000 total JS raw / 185,000 total JS gzip** and **191,000 CSS raw**, while the existing JS per-asset ceilings and CSS gzip ceiling remain unchanged.

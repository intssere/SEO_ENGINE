# P4.10 — Playwright / Axe / Visual Regression Critical-Path Closeout

P4.10 is a browser-regression engineering milestone under issue #216 / PR #217.

## Canonical harness

- `artifacts/seo-engine/playwright.config.mjs`
- `artifacts/seo-engine/e2e/fixtures.mjs`
- `artifacts/seo-engine/e2e/critical-path.spec.mjs`
- `artifacts/seo-engine/e2e/visual-regression.spec.mjs`
- `artifacts/seo-engine/e2e/visual-baselines.mjs`
- `artifacts/seo-engine/e2e/visual-hash.mjs`
- `artifacts/seo-engine/src/browser-regression-contract.test.mjs`
- CI browser step in `.github/workflows/ci.yml`

## Isolation contract

The browser suite runs only the SEO Engine Vite frontend at `127.0.0.1:4174`.

Every browser request is intercepted:
- local non-API frontend assets may continue to the Vite server;
- known `/api/**` requests receive synthetic non-PII fixtures;
- unknown API requests are recorded and fail closed with a synthetic error;
- any non-local/external origin is recorded and aborted.

No API server, Production database, provider, OAuth client/token, public site, crawler, sitemap fetcher, scheduler or worker is used by P4.10.

## Critical browser paths

Covered interaction paths:
1. desktop Command Center renders from synthetic dashboard data, navigation works, and SPA route focus moves to `main#main-content`;
2. compact/mobile navigation opens, closes with Escape, and restores focus to the toggle;
3. Technical SEO DataGrid is keyboard-focusable, search filters fixture findings, and sort updates `aria-sort`;
4. Ask dialog opens through the global keyboard shortcut, focuses the labeled textbox, returns a synthetic answer, traps focus, closes with Escape, and restores the pre-dialog focus target.

Every covered path also enforces:
- zero unknown API requests;
- zero external-origin requests;
- zero page errors;
- zero browser console errors.

## Axe baseline

Axe scans run on:
- Command Center `/`;
- Technical SEO `/technical-seo`;
- Connections `/connections`.

WCAG 2.x/2.2 AA tags are applied and serious/critical violations must be zero.

The first browser capture exposed a real Command Center color-contrast violation. P4.10 corrected the affected muted metric/engine colors to the certified accessible palette; subsequent scans pass.

## Visual regression

Committed text-only visual baselines:
- Command Center 1440×1000;
- Command Center 768×1024;
- Command Center 390×844;
- Audit 1440×1000.

Each screenshot is converted to a 512-bit directional perceptual hash using horizontal + vertical luminance differences. Normal CI compares fresh screenshots to committed hashes with maximum Hamming distance **32/512 bits (6.25%)**.

Binary screenshots are not committed as baselines. Playwright traces/screenshots/reports are retained/uploaded only on failure.

## Focus hardening

Browser execution exposed that opening Ask through the global Ctrl/Cmd+K shortcut did not have a Radix trigger to restore focus to. P4.10 records the pre-open active element and restores it when the dialog closes.

## Dependency integrity

Pinned browser-test dependencies:
- `@playwright/test 1.63.0`
- `@axe-core/playwright 4.13.0`
- `pngjs 7.0.0`

They are present in both `artifacts/seo-engine/package.json` and `pnpm-lock.yaml`, and the ordinary unit suite asserts those lock entries.

During closeout, a missing P4.10 lockfile update was detected even though CI passed under `pnpm install --no-frozen-lockfile`. The browser dependency lock entries were added before certification.

A repository-wide frozen-lock probe still fails on a pre-existing unrelated issue: `artifacts/api-server/package.json` declares `tsx@^4.23.4` but that importer entry is absent from the inherited lockfile. This was not introduced by P4.10 and was not normalized here.

## Validation

Corrected implementation head:
- SHA `187f17e8e816bc97dc9e987f2e8dfd1ba7e38ef7`
- tree `a577a6e6a66c9596baaaa8f8c63999cd65cd71af`

GitHub exact-head CI run `35355521841`: success, including:
- legacy PostgreSQL core schema validation;
- Task #55 bootstrap/auth tests;
- P3.6 migration tests;
- all current workspace package tests;
- Playwright Chromium install;
- P4.10 browser critical paths + axe + visual regression;
- typecheck;
- build.

Replit exact-head non-browser validation:
- SEO Engine tests: passed;
- recursive workspace tests: passed;
- SEO Engine/full typecheck: passed;
- SEO Engine/full build: passed;
- `git diff --check`: passed;
- browser run intentionally not used for certification because this Replit host cannot launch Chromium due missing `libglib-2.0.so.0`.

## Safety result

P4.10 does not authorize or perform publication/deployment, real API-server startup, provider/public-site requests, OAuth/credential use, live crawl/sitemap execution, Production observation/evidence reads or persistence, Production DDL/DML, scheduler/worker activation, Task #53/#54 execution, secret/config changes or autonomous capability activation.

Default next safe milestone: **P5.1 — provider selection/cost/reliability review for SERP + keyword data**, research/planning only with no live provider calls.

**P4.9 — Storybook/component documentation** remains optional and unselected. Real P1 live-provider activation remains separately authorized.

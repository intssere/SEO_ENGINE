# UGP-3.5 — Lighthouse Evidence Adapter

## Scope

UGP-3.5 adds a pure deterministic normalization boundary for caller-supplied Lighthouse results. It does not execute Lighthouse.

The adapter binds a supplied report to an already normalized UGP-3.3 site-analysis page, validates provenance and bounds, normalizes supported category scores/audits/lab metrics, preserves missing metrics as unavailable, creates deterministic report/evidence fingerprints, and emits bounded review opportunity codes.

## Semantics

The normalized evidence is explicitly `lighthouse_lab`.

It never represents or infers:

- CrUX or other field Core Web Vitals;
- actual-user experience measurements;
- UGP-3.3 transport response timing;
- whole-site crawl completeness;
- live Lighthouse execution authority.

Supported normalized lab metric identities are FCP, LCP, CLS, TBT, Speed Index, and Interactive only when that audit is actually supplied. Missing metrics remain `unavailable` with `null` value.

## Hard boundary

The adapter contains no Lighthouse process invocation, Chrome/Chromium launch, Playwright/Puppeteer/Crawlee import, DNS/HTTP/fetch transport, database/persistence binding, runtime API route, scheduler/worker activation, provider/public-site mutation, configuration/credential change, deployment or publication.

All execution/authorization flags remain false.

## Opportunity projection

Category scores below 0.90 may produce deterministic **review** codes for performance, SEO, accessibility or best practices. These are review/evidence classifications only. They are not causal impact claims, remediation authorization, execution authority or publication authority.

## Continuation

After UGP-3.5 exact-head certification and authorized merge, certify the UGP-3 exit language precisely as contract/supplied-evidence support where applicable. Do not claim runtime/browser execution that has not been activated.

Then continue to UGP-4 — Universal Connector Plane under `docs/universal-growth-platform/ROADMAP.md` and `00-AGENT-CONTINUATION-HANDOFF.md`.

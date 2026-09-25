# UGP-3.4 — JS-Rendered Execution Backend Evaluation

**Status:** implementation candidate on `ugp-034-js-rendered-backend-evaluation`  
**Issue:** #525  
**Target:** `initiative-universal-growth-platform`

## Goal

UGP-3.4 evaluates whether SEO ENGINE should use a JavaScript-rendered browser path when the existing secure static fetch cannot observe SEO-relevant rendered state.

This milestone is an evaluation and policy contract. It does **not** add or activate a browser crawler.

## Current architecture facts

SEO ENGINE already has:

- a first-party crawl controller and execution policy;
- bounded page fuses, retry policy, rate limits and checkpoint ownership;
- a secure Node HTTP transport that resolves target hosts itself, rejects non-public addresses, pins the connection to a validated IP, preserves TLS hostname verification and requires fresh validation per request;
- a pure UGP-3.3 universal read-only analysis layer;
- Playwright test tooling in the UI workspace for local synthetic browser tests.

SEO ENGINE does not currently have:

- Playwright as an API-server runtime dependency;
- Crawlee installed as a runtime or development dependency for the crawl plane;
- a certified browser-egress equivalent of the pinned secure HTTP transport;
- live JS-rendered public-site crawling authorization.

## Render-need policy

The static secure fetch path remains the default.

UGP-3.4 only marks a page as a `render_candidate` when all of the following are true:

1. the page already exists in a valid UGP-3.3 analysis artifact;
2. the page was successfully fetched statically;
3. a specific SEO dimension is actually missing from the static observation;
4. supplied evidence specifically points to client rendering for that same dimension;
5. that specific evidence is strong.

Generic framework or hydration markers never qualify by themselves, even when marked strong.

Supported render-gap dimensions are:

- metadata;
- canonical;
- structured data;
- internal links;
- content;
- images.

Weak and moderate evidence remains advisory and cannot escalate execution.

## Backend evaluation

### Existing secure static fetch

Disposition: **default**.

It remains authoritative because it already preserves the repository's SSRF/DNS-rebinding boundary and existing crawl-plane ownership.

### Direct Playwright

Disposition: **conditional future candidate only** when a strong render gap exists.

Why it remains a candidate:

- it is lower-level than Crawlee;
- browser-context request interception is available;
- it can be integrated without intentionally adopting a second request queue/checkpoint/retry system.

Why it is not production-eligible:

- Playwright request interception does not by itself reproduce SEO ENGINE's connection-address pinning;
- browser DNS/network resolution does not automatically flow through the existing secure Node transport;
- service workers can bypass normal route interception unless service workers are blocked;
- the runtime browser request policy and egress isolation are not yet certified;
- no renderer runtime exists in the API/crawl plane;
- no execution authorization exists.

Official Playwright references used by this evaluation:

- BrowserContext routing: https://playwright.dev/docs/api/class-browsercontext#browser-context-route
- Network interception and service-worker caveat: https://playwright.dev/docs/network#missing-network-events-and-service-workers

### Crawlee + Playwright

Disposition: **not selected as SEO ENGINE's execution plane**.

Crawlee is useful as a general crawling framework, but direct adoption here would overlap controls already owned by SEO ENGINE:

- request queue ownership;
- dynamic request scheduling;
- crawl storage;
- retry/session state;
- browser pool management;
- adaptive/autoscaled concurrency.

That would create a second crawl-control/state plane instead of extending the existing one.

Official Crawlee references used by this evaluation:

- Request storage: https://crawlee.dev/js/docs/guides/request-storage
- RequestQueue: https://crawlee.dev/js/api/core/class/RequestQueue
- PlaywrightCrawler: https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler

## Mandatory controls before any future rendered execution

A future browser renderer must be separately implemented and certified with all of these controls.

### Browser context

- service workers blocked;
- request interception installed before navigation;
- no persistent browser profile;
- downloads denied;
- permissions denied;
- HAR disabled;
- video disabled.

### Network and SSRF boundary

- HTTPS only;
- credential-bearing URLs denied;
- public-address validation for every browser request;
- DNS rebinding mitigation equivalent to the existing secure transport;
- connection-address pinning or an independently certified equivalent network isolation mechanism;
- top-level navigation restricted to the approved same origin;
- non-GET/HEAD requests aborted;
- cross-origin subresources denied until browser-egress safety is certified;
- redirects revalidated on every hop.

Request interception alone is **not** sufficient evidence of SSRF safety because interception happens above Chromium's actual network connection path.

## Existing crawl plane remains authoritative

A future renderer must not own:

- a new request queue;
- a Crawlee storage plane;
- adaptive autoscaling;
- independent retry state;
- independent checkpoint state;
- independent page fuses;
- independent rate limits.

The browser, if ever certified, is a page-observation backend underneath the existing crawl plane—not a new crawler.

## Data boundary

A future rendered observation path must keep:

- response body persistence disabled;
- screenshot persistence disabled;
- browser storage persistence disabled;
- rendered output normalized into bounded observation data only.

## Activation state

UGP-3.4 never authorizes runtime execution.

Even when a render candidate is identified, activation is:

`blocked_pending_renderer_safety_certification`

Required blockers include:

- browser egress SSRF equivalence not certified;
- browser DNS-rebinding equivalence not certified;
- browser request policy not runtime-certified;
- renderer runtime not implemented;
- explicit renderer execution authorization absent.

All authority flags remain false:

- browser execution;
- network read;
- crawl execution;
- persistence;
- renderer runtime binding;
- new request queue;
- scheduler;
- autonomous worker;
- provider writes;
- public-site writes.

## Deterministic evaluation contract

`js-rendered-backend-evaluation.ts` binds to a valid UGP-3.3 analysis fingerprint and accepts only bounded supplied render-gap evidence.

It:

- validates exact first-party page identity;
- validates signal-to-dimension consistency;
- deduplicates and sorts evidence;
- rejects generic framework evidence as an execution trigger;
- requires strong evidence plus an actually missing static dimension;
- returns deterministic render-need state;
- records direct Playwright as at most a conditional future candidate;
- records Crawlee as not selected as an execution plane;
- emits required future safety controls;
- emits closed activation authority;
- fingerprints each evidence record and the whole evaluation.

## Hard boundary

UGP-3.4 adds no:

- Playwright API-server runtime import;
- Crawlee dependency;
- Chromium launch;
- page navigation;
- public-site network execution;
- new crawler;
- new queue/storage plane;
- DB/schema/persistence change;
- API route;
- scheduler/worker activation;
- provider/public-site write;
- deployment/publication;
- Lighthouse execution.

UGP-3.5 remains responsible for Lighthouse evidence normalization.

## Certification tests

Tests cover:

- static-fetch default when no gap exists;
- strong specific render-gap qualification;
- generic framework evidence anti-escalation;
- weak/moderate evidence anti-escalation;
- already-observed dimension anti-escalation;
- deterministic ordering/deduplication/fingerprints;
- page and signal/dimension scope validation;
- Crawlee non-selection;
- mandatory browser safety controls;
- completely closed authority;
- mutation/integrity rejection;
- static absence of renderer/network/database/runtime binding;
- static absence of non-test API runtime imports.
# UGP-3.3 — Universal Read-Only Site Analysis

**Status:** implementation candidate on `ugp-033-universal-read-analysis`  
**Issue:** #519  
**Target:** `initiative-universal-growth-platform`

## Goal

UGP-3.3 adds a provider-neutral analysis contract that can turn safely acquired first-party crawl observations into a deterministic SEO site-analysis artifact without requiring CMS credentials.

The implementation deliberately reuses the existing crawl safety model. It does **not** add another crawler, a network client, a database path, an API route, or a runtime execution grant.

Pipeline:

```text
UGP-3.1 validated site identity
        +
existing-crawl safety envelope
        +
caller-supplied page observations
        ↓
bounded normalization + fail-closed validation
        ↓
universal page/site read analysis
        ↓
existing CrawlPageSignal projection
```

## Existing-crawl boundary

The supplied crawl envelope must declare the existing crawl architecture and preserve these exact safety invariants:

- GET only;
- HTTPS first-party page scope;
- same-origin page and internal-link scope;
- robots enforcement;
- redirect target revalidation;
- query rejection;
- fragment rejection;
- bounded page fuse;
- no response-body persistence;
- closed network/crawl/persistence/scheduler/worker/write authority.

The analyzer validates those invariants but does not execute them. Live acquisition remains a separately authorized runtime concern.

## UGP-3.1 lineage

Analysis requires a valid UGP-3.1 plan and supplied-only resolution with:

- exact plan fingerprint binding;
- HTTPS canonical origin and final URL;
- matching first-party hostname;
- `readAnalysisEligibility.eligible = true`;
- a syntactically valid resolution fingerprint;
- the original UGP-3.1 closed authorization object.

An ineligible public-web resolution fails closed before page observations are accepted.

## Page observation contract

Each page observation is bounded and identifies exactly one canonical first-party crawl URL. Outcomes are explicit:

- `success`;
- `redirect`;
- `http_error`;
- `failure`;
- `robots_excluded`.

Only successful observations may carry page-level SEO payload. Redirect/error/failure/robots-excluded observations cannot smuggle metadata, content, links, images, structured data, or performance payload.

Successful observations may contain:

- noindex state;
- canonical target;
- title;
- meta description;
- H1 and headings;
- normalized visible text;
- structured-data types/validity/issues;
- same-origin internal links;
- image source/alt observations;
- bounded transport performance observations;
- source fingerprint.

Raw HTML is not accepted. Raw response-body persistence remains false.

## Analysis dimensions

UGP-3.3 produces deterministic page and site evidence for the roadmap dimensions:

### Crawlability

Represents fetched, redirected, HTTP-error, transport-failure and robots-excluded states without conflating them.

### Indexability

Successful pages are classified as indexable or noindex. HTTP errors are explicitly not indexable. Other unavailable states remain unavailable.

### Metadata

Normalizes title, meta description, H1 and headings and emits only evidence-backed missing-field findings.

### Canonical

Classifies observed canonicals as self, same-origin-other, external, missing or unavailable. External canonicals are retained as observed metadata; they are not fetched.

### Structured data

Retains supplied schema types, validity and bounded issue labels. UGP-3.3 does not independently execute a schema validator.

### Internal links

Normalizes and deduplicates same-origin internal links and derives observed inbound counts across the supplied inventory.

An orphan result is named `orphanCandidate`, not an orphan proof. It is emitted only when the supplied observed inventory is internally complete and still does not create a whole-site certification claim.

### Content

Retains bounded normalized visible text, word count and a deterministic content fingerprint. Raw page bodies are not accepted or persisted.

### Images

Retains bounded image source/alt observations and counts missing alternative text.

### Performance

UGP-3.3 accepts only descriptive supplied transport observations such as response time and transfer bytes.

Core Web Vitals/Lighthouse evidence is explicitly marked `not_collected_in_ugp_3_3`. Lighthouse normalization remains UGP-3.5.

## Coverage semantics

Coverage is descriptive:

- `observed_inventory_complete` means the caller-supplied existing-crawl envelope reports no truncation and observed count equals discovered count;
- `partial` means it does not.

UGP-3.3 always returns:

`wholeSiteCertified = false`

with reason:

`not_independently_certified_by_ugp_3_3`

This prevents a supplied count match from being upgraded into independent whole-site proof. The existing full-site certification system remains authoritative for real whole-site certification.

## Downstream reuse

Successful normalized pages can be projected into the existing `CrawlPageSignal` shape used by the opportunity engine:

- page identity;
- URL;
- indexability;
- title/description/H1;
- content text;
- internal links;
- evidence identity;
- headings;
- normalized structured-data observation.

This is an adapter into the existing analysis/opportunity plane, not a replacement for it.

Technical-issue evidence projection is deliberately not performed in this work package. The existing technical evidence model remains authoritative and can consume a later explicitly designed projection.

## Determinism and integrity

The implementation:

- sorts/deduplicates bounded list evidence;
- sorts pages by canonical observed URL;
- rejects duplicate page identities;
- fingerprints normalized observations;
- fingerprints each page analysis;
- fingerprints the complete site analysis;
- provides an integrity assertion before downstream projection.

Input order therefore does not change the resulting analysis fingerprint.

## Authority boundary

Every UGP-3.3 result keeps:

- network read authorized = false;
- crawl execution authorized = false;
- persistence authorized = false;
- connector capability granted = false;
- scheduler enabled = false;
- autonomous worker enabled = false;
- provider writes = false;
- public-site writes = false.

The module is deliberately not imported by non-test API runtime source.

UGP-3.3 adds no:

- DNS/HTTP client;
- fetch call;
- sitemap/page acquisition;
- second crawler;
- database/schema change;
- persistence;
- API route;
- credentials/configuration;
- scheduler/worker activation;
- provider/public-site mutation;
- deployment/publication.

## Relationship to UGP-3.2

Platform detection remains advisory and orthogonal. The universal analyzer does not require a detected platform and does not infer connector capability from platform evidence.

## Relationship to UGP-3.4 and UGP-3.5

- UGP-3.4 evaluates a JS-rendered execution backend only where the existing fetch strategy cannot observe required rendered state.
- UGP-3.5 normalizes Lighthouse evidence.

Neither future capability is silently implemented or authorized here.

## Runtime integration boundary

The repository's current live first-party P12.2 bridge is intentionally site-specific and its page transport returns crawl outcome/noindex information rather than a universal rich page observation. UGP-3.3 therefore does not pretend that arbitrary public-site live acquisition is already enabled.

A future separately reviewed runtime adapter may translate the existing safe crawler's richer observed page state into this contract. That adapter must preserve SSRF/DNS, robots, redirect, same-origin, query-trap, fuse/rate, checkpoint and authorization controls and must not create a competing crawler.

## Certification

Tests cover:

- all roadmap analysis dimensions;
- deterministic normalization/order;
- existing `CrawlPageSignal` projection;
- partial coverage anti-overclaim;
- explicit noindex/error/failure/robots states;
- cross-origin/query rejection;
- unsafe crawl-control rejection;
- open-authority rejection;
- UGP-3.1 ineligibility rejection;
- non-success payload contradiction rejection;
- result-integrity mutation rejection;
- explicit Lighthouse deferral;
- static absence of direct network/database/runtime binding;
- static absence of non-test API runtime imports.
# UGP-3.1 — URL Onboarding

Status: implementation candidate on `ugp-031-url-onboarding`.

## Goal

Create the provider-neutral public-web admission layer that sits between customer URL entry and later read-only site analysis.

UGP-3.1 does **not** create a second crawler. It reuses the safety posture of the existing P2/P12 first-party crawl architecture and produces deterministic onboarding artifacts that later read-analysis work can consume.

## Customer flow

A customer may enter a public HTTP or HTTPS website URL.

The URL-onboarding model:

1. validates the submitted URL;
2. preserves the normalized submitted URL for traceability;
3. reduces website identity to a candidate origin;
4. creates a bounded bootstrap-resolution plan;
5. requires public-address verification before every request;
6. requires manual redirect observation and target revalidation;
7. requires the final resolved site origin to be HTTPS;
8. requires robots observation after origin resolution;
9. derives same-origin sitemap candidates from robots hints plus conventional paths;
10. keeps platform detection explicitly not performed until UGP-3.2.

## Admission rules

The deterministic admission layer rejects:

- malformed or unsupported schemes;
- embedded credentials;
- nonstandard ports;
- control characters;
- local, private and reserved IPv4 ranges;
- loopback/link-local/private/reserved IPv6 patterns covered by the v1 lexical guard;
- local/reserved hostname suffixes such as `.localhost`, `.local`, `.internal`, `.test`, `.invalid` and `.onion`;
- dotless hostnames.

The lexical guard is not a substitute for DNS/SSRF verification. Every later network request and every redirect hop still requires address verification by a separately authorized secure transport.

## Supplied evidence normalization

UGP-3.1 intentionally contains no DNS or HTTP implementation.

The core accepts only **caller-supplied** resolution evidence:

- request URL;
- status code;
- resolved public addresses;
- redirect location;
- robots response evidence.

The normalizer validates redirect continuity, public-address evidence, HTTPS downgrade protection, final HTTPS identity, robots scope and bounded robots content.

This supplied evidence path is deterministic test scaffolding and a future adapter contract. It does not itself prove that a live request occurred.

## Redirect model

- method: GET;
- redirect mode: manual;
- maximum redirects: 5;
- each hop is independently revalidated;
- HTTPS → HTTP downgrade is rejected;
- cross-origin redirect is allowed only as supplied evidence whose destination is independently public-address verified;
- the final site identity is the origin of the validated final HTTPS response.

This supports common `www → apex` and `HTTP → HTTPS` canonicalization without weakening SSRF boundaries.

## Robots and sitemap hints

After final-origin resolution, robots is scoped to:

`<canonical-origin>/robots.txt`

Robots states:

- `observed`: HTTP 200 with bounded supplied body;
- `absent`: HTTP 404 or 410;
- `unavailable`: all other valid HTTP status evidence.

Read analysis is not eligible while robots is unavailable.

`Sitemap:` directives are parsed deterministically. Only same-origin HTTP/HTTPS hints with standard ports are admitted to the crawl candidate set. Cross-origin or unsafe hints are retained as rejected evidence, not silently followed.

Conventional candidates are always added:

- `/sitemap.xml`
- `/sitemap_index.xml`

## Authority boundary

Every UGP-3.1 plan and resolution hard-codes:

- network read authorized: false;
- crawl execution authorized: false;
- persistence authorized: false;
- scheduler enabled: false;
- autonomous worker enabled: false;
- provider writes: false;
- public-site writes: false.

UGP-3.1 adds no API route and is not imported by runtime source.

## Relationship to existing crawl safety

Existing first-party crawl semantics remain authoritative for actual analysis execution:

- HTTPS identity;
- GET-only;
- robots enforcement;
- bounded redirects;
- same-origin crawl scope after canonical-origin resolution;
- bounded page/query/trap controls;
- default-off execution/persistence.

UGP-3.1 only establishes the public-web onboarding boundary before those controls.

## Deferred to later UGP milestones

UGP-3.2:
- evidence-based platform/framework detection.

UGP-3.3:
- universal read-only site analysis and its separately authorized network/runtime adapter.

UGP-3.4:
- JS-rendered execution evaluation.

UGP-3.5:
- Lighthouse evidence normalization.

## Explicit exclusions

No live DNS lookup, HTTP request, crawl, database/storage write, provider call, credential use, scheduler/worker activation, Stage 0 activation, Production mutation, deployment or publication is performed by UGP-3.1.

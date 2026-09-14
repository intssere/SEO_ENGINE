# Task #71 — Google Search Console Read-Only Runner Foundation v1

## Purpose

Task #71 introduces the first source-specific runner foundation that can satisfy the Task #70 `SignalCollectionSourceRunner` contract without configuring or contacting a real provider during engineering.

The selected source is **Google Search Console Search Analytics** because Task #67 already models Google Search Console query/page evidence as a first-party source and Task #68 already provides the bounded supplied-result normalization boundary required for safe evidence handling.

Task #71 is an engineering foundation only. It does not enroll a Google account/property, bind OAuth credentials, make a live Search Console request, execute a production Task #70 job, persist observations/evidence, enable automation, change schema, or publish/redeploy.

Version:

`task71-gsc-search-analytics-runner-v1`

## Position in the intelligence pipeline

The controlled chain is now:

`Task #66 market/category identity`
→ `Task #67 reviewed source + refresh plan`
→ `Task #68 adapter request + observation normalization`
→ `Task #69 exact job authorization packet`
→ `Task #70 single durable replay-locked execution boundary`
→ `Task #71 GSC source-specific runner foundation`

Task #70 remains the authority for exact authorization consumption and durable replay prevention. Task #71 does not create another execution path.

## Source identity

The v1 runner accepts only an exact reviewed Task #67 source descriptor with:

- key: `google-search-console-search-analytics`
- source class: `first_party`
- trust class: `first_party_authoritative`
- collection mode: `provider_api`
- provenance complete: `true`
- manually reviewed: `true`
- supported signal: `keyword`

The supplied Task #68 request and Task #69 packet must match the same source fingerprint, request fingerprint, market fingerprint, category fingerprint and signal type.

A different source key, class, trust class, collection mode, signal type, or lineage fails closed.

## OAuth boundary

The only future provider scope represented by this foundation is:

`https://www.googleapis.com/auth/webmasters.readonly`

Task #71 does not:

- create an OAuth client
- store a client secret
- store an access token
- store a refresh token
- refresh a token
- authorize a Google account
- authorize a Search Console property
- reuse application login/OIDC as Search Console API authorization

No credential lookup exists in the runner module.

## No built-in network client

Task #71 intentionally contains no Google SDK, generic HTTP client, `fetch`, URL executor, arbitrary method selector, or provider endpoint string.

The runner accepts a narrow injected `GscSearchAnalyticsTransport` interface with one modeled operation:

`query(request)`

CI/tests supply an in-memory fake implementation. The default runner foundation has no transport and therefore cannot be Task #70 runner-ready.

A future live transport implementation requires separate authorization and review.

## Search Analytics request model

The v1 request model is intentionally narrower than the full provider API.

Supported property identity:

- Search Console domain property only: `sc-domain:<domain>`

Supported dimensions:

- `query`
- `page`

Supported filter operators:

- `equals`
- `contains`

Hard system bounds:

- date span: maximum 31 days
- filters: maximum 5
- rows per page: maximum 5,000
- pages per job: maximum 2
- modeled rows per job: maximum 10,000
- timeout descriptor: maximum 10,000 ms
- aggregate/no-dimension requests: exactly one page

These are SEO ENGINE safety bounds, not claims about the provider's maximum capacities.

Request construction canonicalizes dimension/filter ordering and fingerprints each modeled page deterministically.

The runner exposes no arbitrary URL, arbitrary Google API method, raw request body, generic headers, or transport escape hatch.

## Evidence normalization

The modeled transport boundary accepts only:

- optional bounded `rows`
- row keys only when dimensions were requested
- numeric `clicks`
- numeric `impressions`
- numeric `ctr`
- numeric `position`

Unknown response or row fields fail closed.

Dimension strings are validated but are **not retained** in the Task #68 result. The runner emits only the bounded numeric metrics:

- `clicks`
- `impressions`
- `ctr`
- `position`

Multiple modeled rows are aggregated deterministically. CTR is derived from total clicks / total impressions. Position is impression-weighted when impressions are available.

No raw Google payload, query text, page URL, headers, cookies, OAuth token, arbitrary provider text, or undocumented field crosses the Task #68 boundary.

## Completeness semantics

Task #68 status semantics remain authoritative.

### `success`

Used only for a non-empty aggregate/no-dimension modeled response that has no bounded incompleteness marker.

Completeness: `1`.

### `empty`

Used for a valid provider response containing zero modeled rows.

Completeness: `1` and positive evidence remains false through Task #68.

### `partial`

Dimensional Search Analytics output is conservatively treated as partial because provider top-row reporting must not be interpreted as exhaustive query/page coverage.

Diagnostic:

`gsc_top_rows_non_exhaustive`

Default completeness for this condition: `0.9`.

If the configured page cap is reached while a full page is still returned, the additional diagnostic is:

`gsc_page_cap_reached`

Completeness is reduced to `0.75`.

No autonomous retry/backoff loop is created.

### `error`

Expected transport failures can be represented through sanitized codes such as:

- `gsc_quota_exceeded`
- `gsc_rate_limited`
- `gsc_timeout`
- `gsc_access_denied`
- `gsc_property_not_found`
- `gsc_provider_error`

Invalid or unknown modeled provider output becomes:

`gsc_invalid_modeled_response`

No raw exception/provider payload is returned.

## Readiness model

Task #71 exposes source-specific readiness:

- runner supported
- configured
- credential ready
- network ready
- exact read-only scope
- live execution authorized

Default state remains fail-closed:

- configured: `false`
- credential ready: `false`
- network ready: `false`
- live execution authorized: `false`

Even when a valid binding and typed transport are supplied, the Task #70 runner capability stays unavailable unless all four readiness/authorization conditions are true.

Task #71 engineering does not supply those production conditions.

## Task #70 relationship

Task #71 implements the source-runner interface only. It does not modify the Task #70 route or durable job store.

Task #70 still controls:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`
- exact Task #69 authorization validation
- packet expiry/preflight
- deterministic execution UUID
- durable reservation
- pending → active claim
- one runner invocation
- completed/failed terminal state
- replay rejection on later reuse of the same authorization identity

Tests inject the Task #71 fake runner into Task #70 and verify the second identical execution is rejected before another transport call.

## Persistence boundary

Task #71 performs no observation or evidence persistence.

Task #70 receipts remain scalar-only and retain:

- observation persisted: `false`
- evidence persisted: `false`
- raw payload retained: `false`
- provider writes: `false`
- public-site writes: `false`
- automatic transition: `false`

No database migration or DDL is required.

## Automation boundary

Task #71 does not add or enable:

- scheduler
- batch executor
- autonomous worker
- retry worker/loop
- recurring collection
- target activation
- provider enrollment
- Task #64 execution
- Task #53/#54 execution
- observation-to-mutation transition

## Test boundary

All Task #71 tests use fake in-memory transport only.

The deterministic suite covers:

1. default readiness is closed
2. exact read-only scope representation
3. Task #70 runner capability remains unavailable without separate live authorization
4. deterministic request canonicalization/fingerprinting
5. property/date/row/page/timeout/dimension/filter bounds
6. aggregate success normalization
7. explicit empty normalization
8. dimensional/top-row partial normalization
9. page-cap partial behavior without retry automation
10. quota/rate-limit sanitized error mapping
11. raw/unknown response rejection
12. non-GSC source rejection
13. exact Task #67/#68/#69 lineage enforcement through Task #70 preflight plus runner checks
14. Task #70 durable replay lock remains authoritative
15. zero observation/evidence persistence
16. zero provider/public-site writes

CI must not make a real Google/API/network request.

## Explicit non-goals

Task #71 does not authorize or implement production credential binding, live provider transport, production Search Console reads, signal persistence, scheduler activation, production DDL, publication, or autonomous optimization.

Those are later, separately authorized boundaries.

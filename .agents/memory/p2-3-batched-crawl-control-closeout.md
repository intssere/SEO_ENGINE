# P2.3 — Batched Crawler, Rate Limits, Trap Guards, Checkpoints/Resume Foundation closeout

## Status
Engineering-complete, exact-head CI-certified, merged to canonical GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit. Not published. No live sitemap request, crawl request, provider request, persistence action, scheduler/worker execution, or provider/public-site write occurred.

Authoritative issue: #154  
Implementation PR: #155

## Certified lineage
- starting `main`: `bfaf03bbe1b53f962c9df95d2d5a8438b2c713f0`
- starting tree: `4ec50df91494efa6ea7e0a643bec13da7abc6ac0`
- exact tested PR head: `7e04011871d6eaad8a4c54894fe0523344b992a1`
- PR CI #263 / run `34993680595`: success
- implementation merge: `60cd0b60ce20fffac5d33ddb19aae50d6514deab`
- implementation tree: `1b4aa21ecb58aadebcccb75a130ed90e02afa921`
- post-merge main CI #264 / run `34993940693`: success

PR CI #263 and post-merge CI #264 both passed the task gate, full workspace tests, typecheck, and build.

## Replit reconciliation
After post-merge CI #264, Replit was Git-only synchronized and read-only verified at the exact implementation merge:
- branch: `main`
- HEAD: `60cd0b60ce20fffac5d33ddb19aae50d6514deab`
- tree: `1b4aa21ecb58aadebcccb75a130ed90e02afa921`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false.

No publication/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider/safety-gate action, live crawl/sitemap/provider/public-site/competitor action, scheduler/worker/batch/retry activation, persistence action, provider/public-site write, or other non-Git mutation occurred.

## Implementation
P2.3 adds exactly three API-server library files:
- `full-site-crawl-control.ts`
- `full-site-crawl-control.test.ts`
- `full-site-crawl-control-hardening.test.ts`

It is a pure deterministic execution-control layer. It contains no built-in HTTP/fetch/socket/DNS/provider transport, no API route, no persistence path, and no autonomous execution path.

### P2.1 + P2.2 lineage binding
A P2.3 plan accepts only:
- a valid P2.1 `first_party_crawl_controller_v1` plan in `full_site` mode;
- a matching P2.2 `first_party_sitemap_inventory_v1` result;
- exact first-party `siteId` and canonical HTTPS origin identity;
- complete P2.2 inventory with no hard-limit condition;
- P2.1 and P2.2 authorization boundaries still closed.

It revalidates required P2.1 controls rather than trusting object shape or fingerprint alone:
- same-origin only;
- GET only;
- robots enforcement required;
- canonical dedupe required before execution;
- query/trap control required before execution;
- bounded batching required before execution;
- concurrency control required before execution;
- per-origin rate limiting required before execution;
- checkpoint/resume required before execution.

Baseline, external/competitor, incomplete inventory, identity mismatch, open authorization, malformed lineage, or inventory beyond the P2.1 page fuse fails closed.

### Finite execution-planning controls
Every plan requires finite integer policy values. Independent code absolute ceilings are:
- batch size: 250 URLs
- concurrency: 8
- per-origin requests: 120/minute
- request timeout: 30,000 ms
- redirects/request: 5
- attempts/URL: 3
- retry base delay: 60,000 ms
- retry max delay: 120,000 ms
- URL length: 2,048
- path segments: 64
- repeated identical path-segment run: 4.

Additional relationships fail closed:
- batch size cannot exceed the P2.1 page hard fuse;
- concurrency cannot exceed batch size;
- retry max delay cannot be lower than retry base delay;
- nonfinite, fractional, negative, zero-where-disallowed, and above-absolute values are rejected.

The plan derives a deterministic minimum request-start interval from the configured requests/minute. This models a rate budget only; it does not execute a timer or request.

### Deterministic batching
P2.3 consumes only canonical URLs already present in the certified P2.2 inventory. It does not accept arbitrary caller URL injection.

Before batching, every URL is revalidated for execution safety and must already equal its normalized canonical identity. The inventory is sorted deterministically and partitioned into finite batches. Every batch receives:
- sequential batch index;
- deterministic batch ID;
- ordered canonical URL list;
- SHA-256 batch fingerprint bound to the P2.2 inventory fingerprint.

The overall plan fingerprint binds normalized site/origin identity, P2.1 limits, P2.2 inventory fingerprint/count, execution policy, exact batches, request controls, and closed authorization state.

Plan-integrity checks independently revalidate semantic invariants before checking the overall fingerprint, so a reconstructed object cannot become trusted merely by recomputing a hash.

### Execution-time URL and redirect guards
Request and redirect candidates are revalidated against:
- valid URL syntax;
- maximum URL length;
- no control characters;
- HTTPS only;
- no embedded credentials;
- exact canonical origin;
- no query string;
- no fragment;
- no backslash;
- no encoded `/` or `\\` path separator;
- excluded utility/trap paths including `/cart`, `/checkout`, `/account`, `/apps`, `/search`;
- finite path-segment depth;
- valid path decoding;
- maximum repeated identical path-segment run.

Redirect outcomes additionally require a positive redirect count within the configured finite ceiling and a redirect target that is already canonical. Cross-origin, query-bearing, noncanonical, over-limit, or otherwise unsafe redirect targets fail closed.

### Retry model
P2.3 models retries only from supplied outcomes; it does not implement an autonomous retry loop.

Retryable transport categories are limited to:
- network timeout;
- connection reset;
- transport unavailable.

Retryable HTTP statuses are limited to:
- 408
- 425
- 429
- 500
- 502
- 503
- 504.

Policy rejection, auth/permission/permanent HTTP failures, and other permanent client errors are not retryable. Retry attempts are finite and bounded by `maxAttemptsPerUrl`; delay growth is deterministic and capped by the configured maximum. Once attempts are exhausted, the URL becomes a terminal failure and progress can continue.

### Deterministic checkpoint/resume
P2.3 checkpoints bind:
- plan fingerprint;
- inventory fingerprint;
- site/origin;
- checkpoint sequence;
- active batch index/ID;
- next attempt;
- exact pending canonical URLs;
- completed batch IDs;
- sanitized aggregate counters;
- progress state;
- closed authorization boundary;
- checkpoint fingerprint.

Checkpoint integrity requires:
- completed batches form the exact prefix of plan batches;
- pending URLs are unique, sorted, safe, canonical, and members of the active batch;
- attempt state remains within configured finite bounds;
- progress matches counters and inventory size;
- no finalized count can exceed inventory;
- noindex count cannot exceed successful fetch count;
- represented outcome counters exactly match recorded attempt count;
- completed checkpoints contain no active or pending work.

Resume returns only the exact pending work plus bounded request-control metadata and always sets `executionEnabled=false`.

### Supplied outcome / replay boundary
Checkpoint advancement accepts supplied batch-attempt outcomes only when they exactly match the current checkpoint fingerprint, active batch, attempt number, and pending URL set.

The following fail closed:
- stale checkpoint fingerprint;
- replay of old work;
- out-of-order batch;
- skipped attempt;
- missing URL outcome;
- duplicate URL outcome;
- foreign URL outcome;
- malformed/unsafe redirect;
- semantic checkpoint tampering.

Supplied response-like extras are ignored and are never copied into plan/checkpoint state. P2.3 stores no response body, raw HTML, credential, token, or secret field.

### P2.4 handoff
Checkpoint progress records bounded crawl-control counters required for the later completion-ledger layer. P2.3 intentionally hard-codes `wholeSiteCertified=false`; it cannot claim full-site completion certification itself.

## Authorization state
Every P2.3 plan and checkpoint hard-codes false for:
- network execution;
- crawl execution authorization;
- persistence authorization;
- scheduler;
- batch executor;
- autonomous worker;
- retry loop;
- competitor collection;
- competitor persistence;
- provider writes;
- public-site writes.

These fields are integrity-checked and cannot be reopened by supplied plan/checkpoint state.

## CI #262 hardening-test incident
PR CI #262 / run `34993072863` passed the dedicated task gate but failed one full-workspace hardening assertion. The implementation was not merged.

The failure came from an overbroad test-only source scanner: `/\bUPDATE\b/i` matched ordinary source text rather than an SQL mutation statement. Production crawl-control code did not contain a persistence path and was not changed to resolve this failure.

The hardening test was narrowed to actual SQL mutation syntax:
- `INSERT INTO`
- `UPDATE <table> SET`
- `DELETE FROM`.

That test-only correction produced exact head `7e04011871d6eaad8a4c54894fe0523344b992a1`, which passed PR CI #263 fully. The exact head was merged, and post-merge CI #264 was fully green.

## What P2.3 did not do
P2.3 did not:
- fetch a sitemap;
- issue a live crawl request;
- add a built-in HTTP/fetch/socket/DNS transport;
- add a crawler execution API route;
- persist crawl state, inventory, observations, evidence, or checkpoints;
- modify database schema/data;
- add DDL;
- enable runtime/environment gates;
- activate a scheduler, worker, batch executor, or retry loop;
- widen competitor acquisition permissions;
- perform provider/public-site writes;
- create/use real OAuth credentials;
- publish or redeploy the application.

## Next safe boundary
Roadmap **P2.4 — Crawl Completion Ledger and Whole-Site Certification**.

Initial P2.4 should remain pure/default-off and network-free. It should consume the certified P2.1/P2.2/P2.3 lineage and model deterministic full-site completion accounting without executing a crawl. It should reconcile at minimum discovered, eligible, successful fetches, redirects, canonicalized/deduplicated URLs, robots exclusions, noindex, failures, pending work, coverage percentage, hard-limit state, and an explicit whole-site-certified boolean/reason.

P2.4 must fail closed when inventory is incomplete, checkpoint lineage is stale/tampered, pending work remains, hard limits/fuses prevent complete coverage, accounting does not reconcile, or authorization boundaries are open. It must not activate live crawling, sitemap fetching, persistence, DDL, scheduler/autonomous workers, competitor collection, provider/public-site writes, or publication.

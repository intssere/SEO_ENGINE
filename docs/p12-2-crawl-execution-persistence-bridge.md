# P12.2 — default-off first-party crawl execution and persistence bridge

## Purpose

P12.2 requires production evidence that a complete first-party crawl can be executed, resumed, repeated/reconciled and followed by an incremental recrawl.

The existing P2.1–P2.6 engineering foundations deliberately stop before live network and Production persistence.

This bridge closes the **engineering/runtime-adapter gap** without executing the live proof.

## Target

This v1 bridge is intentionally limited to the existing Diamond Shelf single-site architecture.

- canonical origin: `https://diamondshelf.us`
- site identity: caller-supplied existing site ID
- method: GET only
- first-party only
- same-origin only
- HTTPS only
- query/fragment-free crawl URLs
- no raw response-body persistence
- no raw sitemap-XML persistence

A different origin fails closed.

## Existing P2 contracts preserved

The bridge consumes, rather than replaces, the existing contracts:

1. P2.1 — `planFirstPartyCrawl`
2. P2.2 — `buildSitemapInventory`
3. P2.3 — `planFullSiteCrawlExecution`, checkpoints, retry classification and resume work
4. P2.4 — `buildFullSiteCrawlCertification`
5. P2.5 — `compareFullSiteCrawlHistory`
6. P2.6 — `IncrementalRecrawlPlan` integrity and bounded incremental handoff

No P2 authorization field is opened or changed.

## Explicit injected capabilities

The bridge has no bundled network client and no bundled database client.

Future live execution must inject:

- `FirstPartySitemapAcquirer`
- `FirstPartyRobotsEvaluator`
- `FirstPartyPageTransport`
- `FirstPartyCrawlClock`
- `FirstPartyCrawlPersistence`

All are interfaces only.

The engineering implementation does not import Node HTTP/HTTPS/TCP/TLS clients, `fetch`, PostgreSQL, Drizzle, scheduler or timer primitives.

## Runtime authorization gates

The bridge cannot execute unless all of the following are explicitly true at the call boundary:

- adapters configured;
- `networkReady`;
- `liveExecutionAuthorized`;
- `persistenceReady`;
- `persistenceAuthorized`.

Defaults are false.

The bridge additionally reports:

- scheduler disabled;
- autonomous worker disabled;
- provider writes false;
- public-site writes false;
- deployment authorization false;
- publication authorization false.

This task does not set those gates in any runtime or environment.

## Full-site flow

When a later caller is explicitly authorized, the bridge is designed to:

1. validate the Diamond Shelf binding;
2. build the exact P2.1 full-site plan;
3. ask the injected sitemap adapter for bounded supplied documents;
4. pass those documents through P2.2 normalization/dedupe/completeness;
5. build the P2.3 bounded execution plan;
6. load or create an exact checkpoint;
7. persist the checkpoint through the injected store;
8. evaluate robots before each page GET;
9. serialize page starts no faster than the P2 minimum interval;
10. normalize only success/noindex/redirect/failure outcomes;
11. advance only through the P2.3 checkpoint transition function;
12. persist every new checkpoint;
13. build P2.4 certification from exact lineage;
14. optionally compare the completed run with the previous certified snapshot through P2.5;
15. persist a completed evidence snapshot containing lineage/accounting only.

Raw page response bodies and raw sitemap XML are not part of the persistence record.

## Retry/resume behavior

Retryability and attempt ceilings remain owned by P2.3.

The bridge:

- converts thrown page-transport errors to `transport_unavailable`;
- uses P2.3 retry classification;
- applies the configured bounded exponential retry delay through the injected clock;
- persists checkpoints after each transition;
- rejects stale or lineage-mismatched checkpoints.

A robots-evaluation error fails closed as a policy rejection and does not permit a page fetch.

## Redirect behavior

The transport must not automatically follow redirects.

Redirects are returned to the bridge as explicit outcomes and are revalidated through the P2.3 URL policy before checkpoint advancement.

Cross-origin, query-bearing, fragment-bearing, malformed or otherwise disallowed redirect targets fail closed.

## Repeat/reconciliation

A completed run may load the previously persisted completed snapshot.

The bridge:

- integrity-checks that snapshot;
- requires the previous snapshot itself to be whole-site certified;
- rebuilds the current P2.4 certification;
- creates the P2.5 comparison from exact before/after inventory + certification lineage.

This produces the engineering path required for a later repeat/reconciliation production proof.

## Incremental handoff

The P2.6 planner remains authoritative for candidate selection.

The bridge accepts only an integrity-valid P2.6 plan whose:

- site/origin matches Diamond Shelf;
- `afterExecutionPlanFingerprint` matches the supplied current P2.3 execution plan;
- hard limits match the current execution lineage.

Selected URLs then reuse the same robots/page transport controls and P2.3 retry policy.

The incremental receipt stores only URL-level terminal outcomes, attempt counts, aggregate accounting and lineage fingerprints. It does not claim whole-site certification or causal/SEO impact.

## Persistence boundary

`FirstPartyCrawlPersistence` is an adapter contract, not a Production DB implementation.

This engineering task adds no:

- SQL;
- migration;
- Production connection;
- Production SELECT/INSERT/UPDATE/DELETE;
- storage bucket operation;
- observation/evidence persistence activation.

A future live P12.2 authorization must identify the concrete Production persistence adapter and target before any storage read/write occurs.

## Production P12.2 runbook — not executed by this task

P12.2 is not complete after this PR.

A later explicitly authorized live proof must separately bind and verify:

1. exact release/source SHA and tree;
2. exact Diamond Shelf site ID and canonical origin;
3. approved root sitemap source(s);
4. approved page hard limit and 25k absolute ceiling;
5. robots user agent and behavior;
6. concrete sitemap/robots/page transports;
7. concrete Production persistence adapter and target;
8. crawl concurrency/rate/timeout/retry values within P2 ceilings;
9. safety fuses and abort procedure;
10. first full crawl with 100% terminal accounting and P2.4 certification;
11. intentional interruption/resume evidence;
12. second full reconciliation crawl and P2.5 comparison;
13. P2.6 incremental plan;
14. one bounded incremental execution;
15. persisted/inspectable lineage and receipts;
16. absence of unexpected writes, scheduler/worker activity or public-site mutation.

Only that live sequence can satisfy P12.2 production certification.

## Explicit non-authorization

Issue #382 engineering does **not** authorize:

- any request to `diamondshelf.us`;
- sitemap or robots network access;
- Production DB/storage reads or writes;
- scheduler/worker activation;
- provider/public-site mutation;
- credential/secret change;
- destructive retention;
- Task #51/#53/#54 execution;
- deployment or publication.


## Engineering certification

Certified implementation lineage:

- base SHA/tree: `2b17be98c750dcba30eeedb657587bb49748867f` / `8af93afa0c3c7fc6bdbaab7adb55fe77e865e869`;
- final exact tested head/tree: `dbeadef4b18dabeac37e82535e791b8e7eb733c2` / `782f65af18516791421f20bcc9b198a7b8fc515a`;
- exact-head PR CI #674 / run `35652034114`: success;
- implementation merge/tree: `0981daad1da5737ac4a4ec04d97ad6cf6659057d` / `782f65af18516791421f20bcc9b198a7b8fc515a`;
- post-merge main CI #675 / run `35652518058`: success;
- workspace tests: **1,264 PASS / 0 failures**;
- DB bootstrap: **7/7 PASS**;
- P3.6 migration checks: **2/2 PASS**;
- API tests: **1,072/1,072 PASS**;
- P11.10 synthetic scale: PASS at 25,000 URLs / 100,000 query signals / 25,000 opportunity candidates / 100 schedules;
- Chromium: **111/111 PASS**;
- typecheck/build/P11.1 budget: PASS;
- JS: 610,807 raw / 175,245 gzip;
- CSS: 186,332 raw / 31,020 gzip;
- Replit Git-only sync and independent Git-state verification: exact merge/tree, origin/main exact, `0/0`, clean, zero tracked/untracked files, zero locks and zero active repository writers.

This certification is engineering-only and unpublished. It does not authorize or claim a request to Diamond Shelf, Production persistence, scheduler/worker activation, provider/public-site mutation, deployment or publication.

The next P12.2 step is the separately authorized live full-crawl/resume/reconciliation/incremental/persistence proof described above.

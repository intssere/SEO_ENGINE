# P12.2 — crawl execution/persistence bridge closeout

## Milestone

P12.2 engineering prerequisite — default-off first-party full-site crawl execution and persistence bridge.

- issue: #382
- implementation PR: #383
- implementation base SHA/tree: `2b17be98c750dcba30eeedb657587bb49748867f` / `8af93afa0c3c7fc6bdbaab7adb55fe77e865e869`
- final exact tested head/tree: `dbeadef4b18dabeac37e82535e791b8e7eb733c2` / `782f65af18516791421f20bcc9b198a7b8fc515a`
- exact-head CI: #674 / run `35652034114` — success
- implementation merge/tree: `0981daad1da5737ac4a4ec04d97ad6cf6659057d` / `782f65af18516791421f20bcc9b198a7b8fc515a`
- post-merge main CI: #675 / run `35652518058` — success
- workspace tests: **1,264 PASS / 0 failures**
- DB bootstrap: **7/7 PASS**
- P3.6 migration checks: **2/2 PASS**
- API tests: **1,072/1,072 PASS**
- P11.10 synthetic scale: PASS
- canonical Chromium: **111/111 PASS**
- typecheck/build/P11.1 budgets: PASS
- JS: 610,807 raw / 175,245 gzip
- CSS: 186,332 raw / 31,020 gzip

## Engineering result

The repository now has an explicit bridge between P2.1–P2.6 deterministic crawl artifacts and a future separately authorized first-party live crawl.

The bridge is intentionally bound to the current single-site Diamond Shelf architecture:

- canonical origin: `https://diamondshelf.us`;
- first-party GET only;
- same-origin/HTTPS/query/fragment/trap controls remain owned by the existing P2 contracts.

Runtime capabilities are injected interfaces:

- sitemap acquisition;
- robots evaluation;
- page transport;
- clock/delay;
- persistence.

No direct network client, database client, timer, scheduler or worker implementation is bundled in the bridge.

Execution remains fail-closed unless all concrete adapters are configured and all four call-boundary gates are true:

- `networkReady`;
- `liveExecutionAuthorized`;
- `persistenceReady`;
- `persistenceAuthorized`.

No environment or production runtime was changed to set those gates.

## P2 lineage preserved

The bridge reuses rather than replaces:

- P2.1 `planFirstPartyCrawl`;
- P2.2 `buildSitemapInventory`;
- P2.3 execution planning, URL validation, retry classification, checkpoints and resume work;
- P2.4 `buildFullSiteCrawlCertification`;
- P2.5 `compareFullSiteCrawlHistory`;
- P2.6 incremental plan integrity and exact current-execution lineage.

No P2 authorization object was opened.

## Persistence boundary

The adapter contract permits durable checkpoint, completed-run and incremental-receipt projection, but this engineering task provides no Production DB/storage implementation.

Persistable artifacts deliberately exclude:

- raw page response bodies;
- page content;
- raw sitemap XML.

A later live authorization must identify the exact Production persistence target and allowed evidence writes.

## Regression proof

Deterministic/in-memory tests cover:

- default-off readiness;
- no direct network/database/timer implementation;
- sitemap acquisition contract;
- robots/noindex/redirect accounting;
- request pacing;
- bounded transient retry;
- checkpoint persistence and resume;
- stale checkpoint rejection;
- Diamond Shelf-only identity;
- cross-origin sitemap/redirect rejection;
- repeat full crawl to P2.5 comparison;
- P2.6 incremental handoff and bounded execution;
- no raw-content persistence.

CI #673 first exposed TypeScript adapter-narrowing errors only after workspace tests, P11.10 scale and Chromium 111/111 had already passed. The narrowing was corrected without changing behavior or policy. Final exact-head CI #674 and post-merge CI #675 passed the complete gate.

## Replit

Replit was Git-only reconciled to the implementation merge:

- branch `main`;
- HEAD/tree `0981daad1da5737ac4a4ec04d97ad6cf6659057d` / `782f65af18516791421f20bcc9b198a7b8fc515a`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked/untracked zero;
- clean;
- Git locks zero;
- active repository writers zero.

Replit Git state was independently re-verified after the sync at the exact merge/tree. No separate Replit non-browser test run was performed; GitHub CI remains canonical for full test/browser certification.

## Boundaries preserved

No:

- request to `diamondshelf.us`, its sitemap or robots endpoint;
- Production DB/storage read/write/DDL/DML;
- observation/evidence persistence activation;
- provider/OAuth request;
- public-site/provider mutation;
- scheduler/worker activation;
- autonomous mutation;
- credential/secret change;
- destructive retention;
- Task #51/#53/#54 execution;
- deployment or publication.

Published production remains the older separately certified Task #73 source.

## Completion meaning

This closeout completes the **P12.2 engineering bridge only**.

P12.2 production certification remains blocked until a separately authorized live proof demonstrates:

1. exact Diamond Shelf target/site/persistence binding;
2. real sitemap discovery and approved canonical inventory;
3. first complete full crawl with P2.4 whole-site certification;
4. intentional interruption and checkpoint resume;
5. repeat/reconciliation full crawl with P2.5 history comparison;
6. one bounded P2.6 incremental cycle;
7. persisted/inspectable lineage and receipts;
8. no safety-fuse violation or unexpected write.

P12.3 and P12.4 remain independent live-provider lanes.

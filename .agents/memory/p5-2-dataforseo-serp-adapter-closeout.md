# P5.2 — DataForSEO SERP / Ranking Adapter Closeout

P5.2 is complete under issue #221 / PR #222.

## Purpose

P5.2 implemented the first external SERP/ranking adapter foundation while preserving the existing Task #67 → #68 → #69 → #70 safety architecture.

The implementation is provider-specific enough to model DataForSEO Google Organic request/result semantics, but remains completely network-free, credential-free, source-admission-free, persistence-free and unpublished.

## Canonical implementation

Files:
- `artifacts/api-server/src/lib/dataforseo-serp-adapter.ts`
- `artifacts/api-server/src/lib/dataforseo-serp-adapter.test.ts`
- `docs/p5-2-dataforseo-serp-ranking-adapter.md`

Provider docs reviewed on 2026-09-18:
- https://docs.dataforseo.com/v3/serp/google/organic/task_post/
- https://docs.dataforseo.com/v3/serp-se-type-task-get-advanced/
- https://docs.dataforseo.com/v3/appendix-errors/

## Contract completed

P5.2 now provides:

- exact canonical P5.1 review/freshness binding;
- requirement that the P5.1 dual-purpose engineering role still resolves to DataForSEO;
- exact Task #68 source/request/market/category lineage binding;
- expected source key `dataforseo-google-organic-serp` without Task #67 admission;
- Google Organic standard-task request metadata;
- keyword/location/language/device/depth validation;
- internal depth cap 100, in 10-result increments;
- hard-coded normal priority `1`;
- deterministic provider tag and request identity/fingerprint;
- conservative `depth / 10` billed-page-unit upper-bound metadata;
- no live endpoint, high priority, callback, pingback, postback, polling or HTML mode;
- supplied-result-only normalization;
- bounded provider-neutral organic ranking projection retaining only rank/page/domain/URL;
- tracked-domain/subdomain ranking matches;
- best rank / top-10 / top-20 metrics;
- explicit no-match success semantics;
- empty-result semantics;
- bounded provider/task error mapping;
- malformed/oversized/conflicting-result fail-closed behavior;
- exact Task #68-compatible adapter result;
- deterministic round-trip tests through Task #68 `normalizeAdapterResult`.

## Important rank semantic

DataForSEO `rank_absolute` represents absolute position among all SERP elements, while `rank_group` is the position within the organic result type.

P5.2 therefore bounds `rank_group` against the requested organic depth and does not incorrectly require `rank_absolute <= depth`.

## Raw-data rule

P5.2 does not retain raw provider responses.

The ranking projection keeps only:
- rank group;
- absolute rank;
- page;
- normalized domain;
- normalized HTTP(S) URL.

Provider titles, snippets/descriptions, XPath, raw status messages and arbitrary extra provider fields are discarded.

## Safety result

The P5.2 capability hard-codes false authorization for:
- provider enrollment/purchase;
- credential creation/use;
- configured live transport;
- network/provider requests;
- live endpoint;
- high priority;
- callback/pingback/postback;
- polling/retry;
- Task #67 source admission;
- Task #69 live authorization;
- Task #70 execution;
- observation/evidence persistence;
- DB reads/writes/schema mutation;
- scheduler/batch/worker;
- provider/public-site writes;
- publication;
- automatic transition.

The module contains no HTTP/fetch/provider SDK, environment-secret binding, database client, timer loop, source-admission call or Task #70 execution call.

## GitHub certification

Base:
- SHA `c352ac4e8c60dfc3ded33aaa63faff3bb43d6be0`
- tree `0c8138ee1134dec9f6846fe97dfaf6a93e97a68e`

Exact tested implementation head:
- SHA `184706ae549be75a19d22e15acbc1f280962785b`
- PR #222
- PR CI run `35365076296` / CI #417: success
- schema/task checks: success
- recursive workspace tests: success
- Playwright Chromium + P4.10 browser suite: success
- typecheck: success
- build: success

Merge:
- SHA `873aebeae798e61b2c313dfbe5e618c09c6a7f75`
- tree `9136828ed85cbcd3b548a8532e0e452c2bb2f9f7`
- issue #221 closed completed

Post-merge:
- push CI run `35365310166` / CI #418: success
- full schema/task/workspace/browser/typecheck/build matrix: success

## Replit certification

Replit was exact-fast-forward synchronized only after post-merge main CI passed.

Certified state:
- branch: `main`
- HEAD: `873aebeae798e61b2c313dfbe5e618c09c6a7f75`
- tree: `9136828ed85cbcd3b548a8532e0e452c2bb2f9f7`
- `origin/main`: exact same SHA/tree
- ahead/behind: `0/0`
- index/worktree: clean
- untracked files: 0

Non-browser validation on that exact tree:
- recursive workspace tests: passed
- full typecheck: passed
- full build: passed
- `git diff --check`: passed

Replit browser execution remains intentionally skipped; GitHub Ubuntu/Chromium is the canonical P4.10 browser environment.

## Publication state

P5.2 was **not published**.

The production-certified application source remains Task #73.

P5.2 did not perform provider signup/enrollment/purchase, credential binding/use, provider/search-engine requests, Task #67 external-source admission, Task #70 execution, observation/evidence persistence, Production DB reads/DDL/DML, scheduler/worker activation, Task #53/#54/#64 execution, public/provider writes, config/secret changes or deployment/publication.

## Next safe boundary

The default next safe milestone is **P5.3 — keyword volume/difficulty/opportunity adapter(s)**.

P5.1 selected DataForSEO as the initial dual-purpose engineering target, so P5.3 may build a DataForSEO-shaped keyword adapter first. Generic `continue` authorizes only default-off/network-free request/result contracts, normalization, bounds, P5.1 lineage and Task #68 compatibility using deterministic supplied fixtures.

It does **not** authorize provider enrollment, credentials, live DataForSEO requests, Task #67 source admission, Task #70 execution, persistence, scheduler/worker activation, Production DB changes, provider/public-site writes or publication.

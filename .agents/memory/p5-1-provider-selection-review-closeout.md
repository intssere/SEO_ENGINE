# P5.1 — SERP + Keyword Provider Selection Review Closeout

P5.1 is complete under issue #218 / PR #219.

## Purpose

P5.1 established a dated, deterministic provider-selection review for the external SERP and keyword intelligence phase without enrolling a provider, binding credentials, making provider/API requests, admitting an external Task #67 source, activating Task #70, persisting observations/evidence, touching Production data/schema, enabling a scheduler/worker, or publishing the application.

## Canonical implementation

Files:
- `artifacts/api-server/src/lib/external-search-provider-selection.ts`
- `artifacts/api-server/src/lib/external-search-provider-selection.test.ts`
- `docs/p5-1-serp-keyword-provider-selection-review.md`

Review snapshot:
- reviewed at: `2026-09-18T00:00:00.000Z`
- bounded re-review interval: 90 days, or earlier on material provider pricing/API/terms/reliability changes
- deterministic review ID/fingerprint
- caller-time freshness classification
- explicit role policy rather than one opaque provider score

## Engineering selections

P5.1 selects separate engineering roles:

- `dataforseo` — initial dual-purpose P5.2/P5.3 engineering target for SERP plus keyword adapter contracts;
- `serpapi` — independent SERP benchmark/fallback candidate;
- `google_ads_keyword_planner` — official keyword-reference candidate under a separately reviewed Google Ads account/developer-token/OAuth boundary;
- `ahrefs` and `semrush` — deferred broad-suite candidates for later comparative/backlink/search-intelligence work.

These are **engineering selections only**. They do not constitute provider enrollment, procurement approval, Task #67 admission, credential authorization, live-read authorization, or a durable claim that provider pricing/reliability cannot change.

## Selection contract

The review records explicit, dated evidence for:
- SERP capability;
- keyword metrics/ideas capability;
- location/language controls;
- pricing model and relative initial cost class;
- throughput/rate-limit evidence;
- reliability/status/SLA evidence class;
- credential/enrollment complexity;
- fit with the existing Task #67–#70 control plane.

The selection policy fails closed when required capability or evidence provenance is absent. It does not mutate the Task #67 source registry.

## Safety result

The P5.1 capability hard-codes false authorization for:
- provider enrollment/purchase;
- API-key/OAuth/developer-token creation or use;
- Task #67 source-registry admission;
- network collection;
- Task #70 execution;
- observation/evidence persistence;
- database reads/writes/DDL;
- scheduler/batch/worker/retry execution;
- provider/public-site writes;
- publication;
- automatic transition.

The module has no executable provider transport, provider SDK, environment-secret binding, database client, scheduler/worker, or publication path.

## GitHub certification

Base:
- SHA `52e697b08868e546b8edea8083df8ff1bf60d5ec`
- tree `91414019e43141c74a490a134f213b989a326111`

Exact tested implementation head:
- SHA `193c517bcefbfac2b1726e59fb33521cd0d45b18`
- PR #219
- PR CI run `35361361888` / CI #413: success
- schema gates: success
- recursive workspace tests: success
- Playwright Chromium install and P4.10 browser suite: success
- typecheck: success
- build: success

Merge:
- SHA `1d1ee1b5284b62fe9cb446a7ad6d79a35db53259`
- tree `573d1ec33cd1c5d84868fe29c8f1cbab6f24636a`
- issue #218 closed completed

Post-merge:
- push CI run `35361587686` / CI #414: success
- full schema/task/workspace/browser/typecheck/build matrix: success

## Replit certification

Replit was exact-fast-forward synchronized only after post-merge main CI passed.

Certified state:
- branch: `main`
- HEAD: `1d1ee1b5284b62fe9cb446a7ad6d79a35db53259`
- tree: `573d1ec33cd1c5d84868fe29c8f1cbab6f24636a`
- `origin/main`: exact same SHA/tree
- ahead/behind: `0/0`
- index/worktree: clean
- untracked files: 0

Non-browser validation on that exact tree:
- recursive workspace tests: passed
- full typecheck: passed
- full build: passed
- `git diff --check`: passed

Replit browser execution was intentionally not used; GitHub Ubuntu/Chromium remains the canonical P4.10 browser environment.

## Publication state

P5.1 was **not published**. The production-certified application source remains Task #73.

No provider request, provider enrollment, credential use, external-source admission, Production observation/evidence read or persistence, Production DDL/DML, scheduler/worker activation, Task #53/#54/#64/#70 execution, public/provider write, secret/config change, or deployment was performed.

## Next safe boundary

The default next safe engineering milestone is **P5.2 — SERP/ranking adapter(s)**.

Based on P5.1, P5.2 may target the DataForSEO SERP contract first, but generic `continue` authorizes only default-off/network-free adapter engineering using deterministic fake/supplied transport. It does **not** authorize DataForSEO signup, purchase, API credentials, provider requests, Task #67 admission, Task #70 execution, persistence, scheduler/worker activation, Production DDL/DML, public/provider writes, or publication.

P5.3 keyword adapter engineering follows separately after P5.2 certification.

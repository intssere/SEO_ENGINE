# P4.6 — Full-Site Audit / Crawl Explorer UI Closeout

P4.6 is a frontend/read-only product-system engineering milestone under issue #210 / PR #211.

## Canonical implementation

- `artifacts/seo-engine/src/lib/audit-workspace-model.ts`
- `artifacts/seo-engine/src/pages/technical-seo.tsx`
- audit/explorer styles in `artifacts/seo-engine/src/index.css`
- source contract: `artifacts/seo-engine/src/audit-workspace-contract.test.mjs`

## Runtime/data boundary

P4.6 deliberately does **not** create a new crawl/read API.

The existing `/technical-seo` route uses only:
- `useListTechnicalFindings` — current GET `/api/technical-seo`;
- `useGetDashboard` — existing dashboard GET, used only for already exposed crawl-certification summary.

P2.1–P2.8 remain engineering contracts. In particular, P2.7 `UrlExplorerResult` is not currently bound to a frontend GET endpoint.

## Audit honesty contract

Current persisted technical findings:
- are defensively normalized from the generic operational response;
- may show title, category, severity, status, description and URL;
- do not prove that a complete full-site URL inventory exists.

Coverage:
- unavailable certification remains unavailable;
- not-evaluated remains neutral;
- bounded certification remains warning and explicitly not whole-site;
- only explicit `wholeSiteCertified=true` can render whole-site success.

## URL Explorer contract

The UI mirrors P2.7 retained dimensions:
- canonical URL;
- pathname;
- sitemap sources;
- lastmod;
- recrawl status;
- recrawl priority;
- recrawl reasons.

It also explicitly lists P2.7 unavailable per-URL dimensions:
- HTTP status;
- fetch outcome;
- redirect target;
- canonical target;
- indexability;
- content fingerprint.

Because there is no safe frontend read binding yet:
- URL Explorer rows are exactly empty;
- no URL is synthesized from findings, counts, dashboard data or sitemap assumptions;
- the workspace says `Read model not bound`;
- P2.5 history and P2.6 incremental recrawl surfaces also say unavailable instead of rendering zero/fake snapshots.

## Safety boundary

The presentation contract hard-codes false for:
- network execution;
- crawl execution authorization;
- sitemap network fetching;
- Production evidence reads;
- persistence;
- scheduler;
- worker;
- public-site writes.

The page contains no crawl start/resume/retry, sitemap fetch, mutation, direct network, SQL/DB, scheduler, worker, approval, execution or deployment primitive.

## Validation

Implementation head:
- SHA `0bac69bfd5a3b55a2c93e2bc39a135b6672323c5`
- tree `ae65775bee692dd7e15dd0df1eb1793975cc96fc`

Replit validation on that exact head:
- SEO Engine tests: 65 passed
- recursive workspace tests: passed
- SEO Engine/full typecheck: passed
- SEO Engine/full build: passed
- `git diff --check`: passed

Exact-head GitHub CI run `35330165670`: success.

Final merge still requires green CI on the exact docs-complete PR head.

## Safety / release result

P4.6 does not authorize or perform publication/deployment, live full-site network execution, sitemap network fetching, Production observation/evidence reads or persistence, Production DDL/DML, provider/public-site activity, scheduler/worker activation, Task #53/#54 execution, secret/config changes, or autonomous capability activation.

Default next safe milestone after certified P4.6 closeout: **P4.7 — responsive/mobile/tablet professional polish**. Real P1 live-provider activation remains a separately authorized alternative.

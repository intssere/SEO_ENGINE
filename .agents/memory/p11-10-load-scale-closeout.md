# P11.10 — synthetic load/scale certification closeout

## Milestone

Roadmap P11.10 — load/scale testing for target URL/query volumes.

- issue: #371
- implementation PR: #372
- base SHA/tree: `4aad63e82d2ec41d80328b63c9a1a7b8737b3d9e` / `79a1420043c2aad16138e54679506f2320b708d8`
- final exact tested head/tree: `0b1cb915ac54cc56c26aeb841662f26d6de052f4` / `16a453f80ba5577416d3060696a56e027762952c`
- exact-head PR CI: #658 / run `35627543198` — success
- implementation merge/tree: `fbf1abd2e1f04de649b9c54b29b74873098ccdb9` / `16a453f80ba5577416d3060696a56e027762952c`
- post-merge main CI: #659 / run `35627981015` — success

## Certified scale envelope

- 25,000 canonical URLs/site;
- 100,000 synthetic page-query signal rows/site;
- max 25,000 materialized opportunity candidates;
- crawl batch size 250, producing exactly 100 batches;
- URL Explorer page size 500;
- 100 read schedules/projection;
- DataForSEO provider request limit remains 50 keywords/request.

## Final exact-head profile

- certification fingerprint: `99c9910efd2474573f5ffd060bd24cea276aa337adfdf57140679e6ae6fdb20c`
- combined measured scenario time: **739.787 ms**
- sitemap inventory: 25,000 → 25,000, 234.623 ms, 54.49 MiB
- crawl execution plan: 25,000 → 100, 58.501 ms, 54.80 MiB
- URL Explorer: 25,000 → 500, 193.964 ms, 33.71 MiB
- opportunity engine: 100,000 → 25,000, 238.407 ms, 96.42 MiB
- read scheduler: 100 → 100, 14.292 ms, 95.40 MiB
- zero blockers in every scenario.

Budgets remain catastrophic-regression guards only:
- 20 seconds per individual scenario;
- 45 seconds combined;
- 768 MiB heap-used observation per scenario.

They are not production SLOs.

## Canonical validation

Exact-head CI #658 passed:
- workspace tests: **1,250 / 0 failures**
- API tests: **1,063 / 1,063**
- dedicated P11.10 scale gate
- Chromium: **110 / 110**
- typecheck
- build
- P11.1 assets:
  - JS 611,156 raw / 175,333 gzip
  - CSS 186,332 raw / 31,020 gzip.

Post-merge main CI #659 passed the same gate sequence.

## Stabilization significance

The first canonical run exposed a genuine scale problem:
- fixture produced 50,000 valid candidates instead of intended 25,000;
- internal-link source selection scanned all eligible crawl pages per qualifying query even though only three sources were needed.

The fix preserves the previous first-three ordered source semantics while stopping once those three matches are found. A regression test locks the behavior.

This is a useful P11.10 result: the gate found an algorithmic inefficiency before final hardening closeout rather than merely measuring a preselected happy path.

## Replit

Replit is exact at the implementation merge:

- branch `main`
- HEAD `fbf1abd2e1f04de649b9c54b29b74873098ccdb9`
- tree `16a453f80ba5577416d3060696a56e027762952c`
- origin/main exact
- ahead/behind `0/0`
- tracked 0
- untracked 0
- clean
- Git locks 0
- active repository writers 0
- active validation processes 0 at reconciliation.

No deployment or publication occurred.

## Boundaries preserved

P11.10 performed no:
- production load generation;
- public-site crawl;
- provider/API load or provider request;
- Production DB benchmark/read/write/DDL/DML;
- destructive retention execution;
- scheduler/worker activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- runtime/config/secret mutation;
- deployment or publication.

It does not certify production:
- latency percentiles;
- concurrency;
- DB throughput;
- provider quotas;
- worker capacity;
- horizontal scaling;
- hosting size;
- uptime/SLA.

## Program state

**P11 enterprise hardening is complete.**

The ten P11.9 privacy/compliance blockers remain independently open for affected live/commercial flows.

The next safe boundary is **P12 final production completion certification entry/readiness review**. Generic continuation may reconcile P12.1–P12.10 against current evidence and complete deterministic/read-only prerequisites, but live provider, crawl, database, execution, scheduler, credential, deployment and publication actions remain separately authorized.

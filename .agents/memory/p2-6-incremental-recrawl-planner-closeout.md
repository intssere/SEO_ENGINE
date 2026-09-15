---
title: P2.6 incremental recrawl planner closeout
scope: deterministic bounded recrawl planning over certified crawl-history evidence
---

# P2.6 — Incremental Recrawl Planner v1

P2.6 is engineering-complete under issue #162 and PR #163.

## Certification lineage

- baseline main: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- exact tested head: `1553430a96bec277009a458d704dcdf5f5f4795f`
- PR CI #273 / run `35005645661`: success
- implementation merge: `cdc272ea33b5e937662f85543fde9928175777bf`
- implementation tree: `227da28f22bc0047a71227f4fd01925a2011f717`
- post-merge main CI #274 / run `35005842971`: success
- Replit Git-only reconciliation verified at the exact implementation merge/tree, `0/0`, clean, no extra commit on `main`.
- preserved local audit branch `p2-5-crawl-history-closeout-docs` remains at `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732`; it was not force-pushed, rewritten or discarded.

## Durable contract

P2.6 provides deterministic, bounded, execution-disabled incremental recrawl planning over a semantically valid P2.5 comparison plus exact supplied P2.1–P2.4 lineage.

The v1 planner supports provable or explicitly supplied first-party signals including:

- newly added canonical URLs;
- sitemap `lastmod` changes;
- trusted high-value URL candidates;
- stale URL candidates;
- unresolved issue candidates where URL identity is supplied by a trusted first-party input;
- GSC-opportunity candidates where URL identity is supplied;
- URLs affected by recent executions where supplied;
- aggregate regression/lineage conditions that require bounded full reconciliation rather than fabricated per-URL causes.

It applies deterministic reason merging, priority classes, ordering, dedupe, finite page/batch budgets, included/deferred/excluded accounting and SHA-256 fingerprinting. Budgets remain bounded by upstream P2.1/P2.3 hard-page and absolute ceilings; there is no unlimited mode.

P2.6 reconstructs and revalidates the supplied P2.5 comparison from before/after artifacts instead of trusting a fingerprint alone, and its serialized plan has an independent semantic integrity validator.

## Evidence limits

The planner does not fabricate per-URL HTTP/fetch/canonical/indexability/content-fingerprint reasons when upstream artifacts do not retain those facts. When evidence is insufficient for safe targeted planning, the artifact recommends a bounded full reconciliation instead.

## Safety boundary

P2.6 adds no built-in network client, live crawl or sitemap fetch, persistence, DDL, scheduler/worker/batch execution, retry activation, competitor collection, OAuth/provider action, provider/public-site write path or publication/redeploy. All execution and write authorizations remain closed/default-off.

## Handoff

P2.7 — URL Explorer API/query model is the next roadmap milestone. It should expose governed read/query models over supplied or already-retained crawl/inventory/history/recrawl artifacts without silently creating a live crawler, persistence path or write capability.

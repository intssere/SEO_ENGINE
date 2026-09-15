---
title: P2.5 crawl history closeout
scope: deterministic crawl-history comparison and change detection
---

# P2.5 — Crawl History, Comparison, and Change Detection v1

P2.5 is engineering-complete under issue #160 and PR #161.

## Certification lineage

- exact tested head: `646719a4bc0afd30fa6fc5b1049e25862f80eaed`
- PR CI #271 / run `35001858253`: success
- implementation merge: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- implementation tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- post-merge CI #272 / run `35002068558`: success
- Replit was Git-only synchronized to the P2.5 merge before P2.6 engineering began; the local docs-only closeout commit later failed remote authentication and was preserved for audit rather than force-pushed.

## Durable contract

P2.5 provides deterministic same-site history comparison over retained P2.2 inventory and P2.4 certification artifacts. It can prove:

- canonical inventory URL additions and removals;
- sitemap `lastmod` additions, removals and changes when supplied upstream;
- aggregate completion-ledger deltas;
- whole-site certification transitions and blocker added/removed sets;
- bounded lineage/configuration changes relevant to comparability;
- deterministic ordering, sanitized output and SHA-256 fingerprinting.

P2.5 deliberately does **not** invent unavailable per-URL evidence. P2.1–P2.4 do not retain enough information to prove per-URL HTTP/fetch outcomes, redirect targets, canonical targets, indexability transitions or content-fingerprint changes, so those capabilities remain explicitly unavailable.

## Safety boundary

P2.5 adds no built-in networking, live crawling, sitemap fetching, persistence, DDL, scheduler/worker/retry execution, competitor collection, provider activity, provider/public-site write path or publication action. All execution and write capabilities remain default-off.

## Handoff

P2.6 — Incremental Recrawl Planner v1 consumes certified P2.5 comparison artifacts and exact upstream lineage to produce bounded recrawl plans without executing requests or persisting work.

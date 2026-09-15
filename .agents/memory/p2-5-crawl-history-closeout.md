# P2.5 Crawl History / Comparison and Change Detection — Closeout

Status: engineering-complete, merged and CI-certified; no publication or live crawl activation.

## Lineage

- issue: #160 — `P2.5 — Crawl History, Comparison, and Change Detection v1`
- implementation PR: #161 — `P2.5 — crawl history comparison foundation`
- exact tested head: `646719a4bc0afd30fa6fc5b1049e25862f80eaed`
- PR CI #271 / run `35001858253`: success
- merge to `main`: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- merge tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- post-merge CI #272 / run `35002068558`: success

## What P2.5 established

P2.5 adds deterministic, first-party-only comparison over supplied valid P2.2 inventory and P2.4 certification snapshots. It can prove and compare:

- inventory membership additions/removals;
- sitemap `lastmod` transitions;
- aggregate completion-ledger deltas;
- whole-site certification and blocker transitions;
- crawl lineage/configuration changes;
- deterministic comparison ordering/fingerprints with semantic integrity validation.

The artifact is `first_party_crawl_history_comparison_v1` and keeps all network, crawl-execution, sitemap-fetching, persistence, scheduler, batch-executor, autonomous-worker, retry, provider-write and public-site-write authorization flags false.

## Explicit evidence boundary

P2.1–P2.4 do not retain per-URL fetch/content outcome detail sufficient for historical comparison of:

- HTTP status;
- fetch result;
- canonical target;
- indexability;
- content fingerprint.

P2.5 therefore marks those dimensions unavailable rather than inferring them.

## Replit continuity anomaly discovered later

A clean local Replit docs-only commit `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732` existed on branch `p2-5-crawl-history-closeout-docs`, parented exactly to the P2.5 merge. It contained only continuity documentation and was never present on GitHub. GitHub remains canonical. This closeout reconstructs the P2.5 record on a GitHub-authoritative docs branch rather than treating the Replit-local commit as canonical.

## Safety

P2.5 did not authorize or perform live crawling, sitemap fetching, persistence/DDL, scheduler/worker execution, competitor activity, provider requests, OAuth activity, provider/public-site writes or publication.

## Next boundary

P2.6 — Incremental Recrawl Planner v1: deterministic bounded planning from proven P2.5 changes and explicitly supplied trusted first-party candidates, while preserving unavailable per-URL evidence as unavailable.

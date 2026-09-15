# P2.8 technical issue taxonomy and evidence model closeout

## Scope
P2.8 added a pure/read-only/default-off technical-SEO issue taxonomy and evidence-model foundation. It is intended to support later Audit UI, opportunity generation, durable evidence persistence and governed remediation without inventing facts that P2.1–P2.7 do not retain.

It did not add or activate a network-facing route, live crawling, sitemap fetching, persistence, DDL, scheduler/worker/batch/retry execution, provider/OAuth activity, competitor collection, public-site writes or publication.

## Certified lineage
- Issue: #170 — P2.8 Technical issue taxonomy and evidence model expansion v1
- Implementation PR: #171
- Exact tested PR head: `198965f52e428af99f2af4cc6fcab64c0373243c`
- PR CI: #287 / run `35025006982` — success
- Merge to `main`: `d15551b2ec841856e88c872ddd476ddbadbf6c4c`
- Merge tree: `5ce4e67ada0e7a078d3bf6b8fa4deecfaad85afe`
- Post-merge main CI: #288 / run `35025174780` — success

Both CI runs passed schema validation, task tests, full workspace tests, typecheck and build.

## Replit engineering synchronization
After post-merge certification, the existing `SEO_ENGINE` Replit workspace was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `d15551b2ec841856e88c872ddd476ddbadbf6c4c`
- tree: `5ce4e67ada0e7a078d3bf6b8fa4deecfaad85afe`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked changes: `0/0`
- working tree clean: true
- extra local commit: false

No application publication/redeploy occurred. The separately attested production release remains Task #73.

## Contract delivered
P2.8 provides:
- a deterministic technical-SEO taxonomy spanning crawlability/indexability, canonicalization, metadata, structured data, internal links, performance, images, content quality, AI accessibility and crawl completeness;
- exact compatibility with the existing technical-finding severity vocabulary: `info | low | medium | high | critical`;
- explicit issue statuses and evidence-quality/confidence vocabulary;
- strict first-party site/origin and upstream fingerprint lineage;
- stable affected-URL references using the P2.7 URL identity algorithm;
- evidence kinds that distinguish retained facts, aggregate facts, explicitly supplied first-party observations and unavailable markers;
- fail-closed evidence requirements that prevent P2.7-unavailable per-URL facts from being fabricated into issues;
- deterministic evidence IDs, issue keys, evidence-set fingerprints, issue fingerprints and query fingerprints;
- bounded sanitization with raw-markup and secret-like material rejection;
- deterministic issue filtering, sorting and bounded pagination;
- a compatibility adapter into the existing `TechnicalFindingSignal` shape for active URL-scoped issues;
- explicit closed authorization/capability flags.

## Honest evidence boundary
P2.7 does not retain per-URL HTTP status, fetch outcome, redirect target, canonical target, indexability or content fingerprint. P2.8 may define taxonomy entries for issue types that need those dimensions, but an instance cannot be created unless a later allowed source explicitly supplies available evidence with valid provenance. An unavailable marker cannot satisfy the issue's evidence requirements.

## Safety boundary retained
The following remain closed/default-off after P2.8:
- live first-party full-site crawling;
- sitemap network fetching;
- observation/evidence persistence;
- DDL/schema migration;
- scheduler/worker/batch/retry execution;
- provider reads/writes and OAuth live stages;
- competitor collection/persistence;
- public-site writes;
- publication/redeploy.

## Next milestone
P3.1 — Observation/evidence persistence design.

P3.1 should remain architecture/domain-model work only. It should define a durable persistence contract for observations and evidence, identity/dedupe/fingerprint/provenance/freshness fields, relationships to P2.8 issues and existing signal observations, retention/supersession hooks, and a migration plan. It must not run production DDL or persist real production observations. P3.6 remains the separately reviewed and explicitly authorized production-migration/DDL boundary.

# P3.1 Observation/Evidence Persistence Design Closeout

## Status

P3.1 is engineering-complete as a **pure, storage-agnostic, default-off design foundation**. It does not activate durable storage or any live data path.

## Certified lineage

- Issue: #173 — `P3.1 — Observation/Evidence Persistence Design Foundation`
- Feature branch: `p3-1-observation-evidence-persistence-design`
- Exact PR head: `add9a5a59b15ef8880dd8e398739bedd66babc0e`
- PR: #174
- PR CI: run #291 / Actions run `35064641066` — success
- Merge SHA: `e94a38427b23cbd6d74f6a9ef722e16d84c88635`
- Merge tree: `52c45dccd332877222e132a35aea1f4309f45b9f`
- Post-merge main CI: run #292 / Actions run `35064873440` — success
- Replit Git state after certification: exact same SHA/tree, `0/0`, clean, no extra local commit.

## What P3.1 established

The P3.1 module defines a deterministic normalized observation/evidence contract over the existing P2.8 technical issue/evidence model:

- stable observation, semantic, value, evidence-set, provenance, relation, history, query and result fingerprints;
- site- and URL-scoped subject identity with same-origin and credential-bearing URL rejection;
- bounded structured material values rather than arbitrary/raw payload persistence;
- evidence references that retain identity/provenance metadata without retaining free-form P2.8 summaries, labels, details or raw evidence values;
- explicit caller-supplied `observedAt` because the current P2.8 technical issue record does not itself contain an observation timestamp;
- deterministic supplied-time freshness windows with no wall-clock dependence;
- exact duplicate, supersession, conflict, corroboration and independent transition semantics;
- deterministic history construction with explicit supersession/conflict/corroboration relations;
- bounded deterministic read/query contract across site, URL, kind, source, lifecycle and freshness dimensions;
- deterministic P2.8 `TechnicalIssue` adapter;
- fail-closed semantic integrity assertions and fingerprint tamper detection;
- secret-like material, credential-bearing URL, malformed timestamp, invalid fingerprint and unbounded input rejection.

## Explicitly still disabled

P3.1 does **not** include or authorize:

- database clients or ORM wiring;
- SQL DDL or DML;
- migrations or startup schema changes;
- persistence adapters or repository writes;
- filesystem writes;
- provider/network/crawl requests;
- live crawl execution;
- environment-secret binding;
- scheduler/worker activation;
- autonomous mutation;
- provider/public-site writes;
- publication/redeployment.

The production module exposes all corresponding authorization/capability fields as false.

## CI and hardening result

Both the exact PR head and merged `main` passed:

- task-specific tests;
- full workspace tests;
- typecheck;
- build;
- legacy PostgreSQL schema validation.

Hardening tests assert that the production P3.1 source does not contain network transports, DB/ORM clients, SQL DDL/DML, filesystem-write primitives, environment binding, scheduler/process worker primitives, or enabled authorization gates.

## Replit reconciliation caveat

The post-CI Git-only Replit synchronization completed exactly at the certified merge SHA/tree with a clean working tree and no extra commit. No publication or runtime/config/database/provider/crawl/persistence mutation occurred as part of synchronization.

A pre-existing automatic Replit `smoke` workflow ran about 79 seconds after the Git fast-forward and failed its first proxied health check with HTTP 502 from `localhost:80`. Read-only diagnosis found:

- the API workflow was listening on port 8080 and recorded successful API requests;
- web and component-preview workflows were running;
- P3.1 is not wired into runtime;
- the running processes predated the P3.1 Git sync and therefore did not runtime-certify the new checkout;
- available evidence attributes the smoke failure to the Replit-facing development proxy/runtime condition, not a P3.1 compile/test/runtime exception.

No restart or request was performed to investigate further because P3.1 does not authorize runtime mutation or publication.

## Important modeling lesson

Do not fabricate source time. If an upstream artifact lacks `observedAt`, the adapter boundary must require an explicit trusted timestamp input. Likewise, source identity, evidence identity and material state must remain separate concepts so later persistence can reason about lineage, freshness and conflict without hidden last-write-wins behavior.

## Next safe milestone

**P3.2 — Dedupe/Fingerprint/Freshness/Provenance Persistence Foundation**.

P3.2 may build a bounded persistence-facing contract over the P3.1 domain model, but production migration/DDL remains reserved for P3.6 and requires separate review/authorization. Do not interpret P3.1 completion as permission to enable DB writes, migrations, live provider/crawl collection, workers, autonomous mutation or publication.

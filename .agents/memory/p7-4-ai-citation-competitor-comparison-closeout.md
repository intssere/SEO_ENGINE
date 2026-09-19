# P7.4 AI Citation/Domain/Competitor Comparison Closeout

## Scope

Roadmap P7.4 implements deterministic/default-off citation/domain/competitor comparison over exact P7.3 supplied-observation records only.

Issue: #273  
Implementation PR: #274  
Base SHA: `de4d6df160d95ef13d6dd7dc6b358b1eadcfdd36`  
Base tree: `1200efff9d1e6bee23f654337bbcf5d2e724fcfd`  
Exact tested implementation head: `8c5ba7ff86d28e6b77c67d26db32a10031b4c4ef`  
Implementation merge: `3e34b7e151a0e5669b986e377dded16c53f86073`  
Implementation tree: `cb0403478f20e6aae1847d6d2d9fa58cdc54af19`

P7.4 is additive deterministic comparison engineering only. It adds no runtime route, OpenAPI change, live AI/provider request, credential use, answer-text mining, citation fetch, persistence, database read/write/schema mutation, visibility scoring, scheduler/worker, approval grant, site mutation, deployment or publication.

## Exact P7.3 lineage

P7.4 accepts:
- exact P7.3 collection input;
- exact P7.3 collection report;
- explicit caller-supplied comparison groups.

Before comparison it rebuilds P7.3 and requires complete canonical equality.

P7.3 reconstruction retains exact P7.2 prompt/topic lineage.

A tampered P7.3 report fails closed.

## Explicit competitor groups

Each group supplies:
- normalized unique comparison key;
- exact tracked subject brand key;
- one or more exact tracked competitor brand keys.

All brands must exist in the exact P7.3 tracked-brand registry.

The subject may not appear in its own competitor list.

Repeated competitor references dedupe and sort canonically.

P7.4 never infers competitor identity from:
- answer text;
- labels;
- topic similarity;
- citation domains;
- provider/model identity;
- market/category metadata;
- external knowledge.

## Positive mention evidence only

P7.4 consumes the explicit positive brand-mention evidence already normalized by P7.3.

For every subject-vs-competitor pair it derives:
- subject mention-evidence observation keys;
- competitor mention-evidence observation keys;
- observations with supplied positive evidence for both;
- observations with subject evidence and no supplied competitor mention evidence;
- observations with competitor evidence and no supplied subject mention evidence.

The evidence-only difference sets are not semantic absence claims.

No supplied competitor mention evidence does not prove that the competitor is absent from answer text.

P7.4 performs no answer-text mining.

## Citation-domain co-occurrence

For each brand side, P7.4 collects citation domains from observations that also carry explicit mention evidence for that brand.

It derives:
- subject-side domains;
- competitor-side domains;
- shared domains;
- subject-side-only domains;
- competitor-side-only domains.

These are observation-level co-occurrence sets only.

A citation domain appearing in the same observation as a brand mention does not prove:
- the citation supports the brand;
- the citation refers to the brand;
- endorsement;
- association;
- authority;
- trust;
- factual support.

P7.4 does not fetch or inspect citation content.

## Domain provenance summaries

P7.4 emits one deterministic summary for every exact P7.3 citation domain.

Each summary contains:
- citation-record count;
- distinct observation count;
- citation fingerprints;
- observation keys;
- provider keys;
- prompt keys;
- topic keys.

These values describe recorded provenance only.

They are not domain authority, quality, trust, recommendation, visibility or market-share metrics.

## No winner or ranking

P7.4 explicitly does not:
- select a winner;
- rank brands;
- rank providers;
- rank domains;
- claim greater visibility from larger counts;
- infer preference;
- infer quality;
- infer authority;
- infer market share.

Provider/model observations are not converted into a cross-provider normalized performance metric.

P7.5 owns any later visibility scoring/history semantics under a separately reviewed contract.

## Determinism and bounds

P7.4 deterministically produces:
- domain-summary fingerprints;
- pair fingerprints;
- comparison-group fingerprints;
- report counts;
- report fingerprint.

Comparison group input order does not affect identity.

Competitor references dedupe/sort canonically.

Bounds:
- comparison groups: 128;
- competitor references per group: 64;
- normalized keys: 96 characters.

Bounds fail closed.

## Test and CI certification

Exact tested PR head `8c5ba7ff86d28e6b77c67d26db32a10031b4c4ef` passed CI #492 / run `35449557160` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P7.4;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #274 was merged only from that exact green head.

Post-merge main `3e34b7e151a0e5669b986e377dded16c53f86073` passed CI #493 / run `35449745409` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `de4d6df160d95ef13d6dd7dc6b358b1eadcfdd36` / `1200efff9d1e6bee23f654337bbcf5d2e724fcfd`;
- refreshed origin/main at the P7.4 implementation merge;
- ahead/behind `0/2`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `3e34b7e151a0e5669b986e377dded16c53f86073`;
- tree `cb0403478f20e6aae1847d6d2d9fa58cdc54af19`;
- origin/main identical;
- ahead/behind `0/0`;
- clean index/worktree;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation on that exact checkout passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Build output retained only existing non-fatal tooltip/sheet sourcemap messages and the existing minified chunk-size warning.

No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P7.4 performed no:
- live AI/provider request;
- provider credential use;
- answer-text mining;
- citation fetch;
- source admission;
- comparison/domain persistence;
- Production DB read/write/DDL/DML;
- Task #64/#70 execution;
- visibility scoring;
- scheduler/worker/retry activation;
- approval grant;
- provider/public-site write;
- automatic transition;
- environment/secret/config mutation;
- deployment/publication.

## Next boundary

The next safe default milestone is **P7.5 — AI visibility scoring/history**.

P7.5 should remain deterministic/default-off and should score only explicit normalized dimensions over exact certified P7.3/P7.4 records.

P7.5 must preserve:
- no hidden cross-provider comparability assumption;
- null distinct from zero;
- descriptive P7.4 counts are not automatically scores;
- citation co-occurrence is not citation support;
- missing mention evidence is not semantic brand absence;
- no live provider request;
- no persistence/history storage;
- no opportunity generation owned by P7.6;
- no scheduler/worker/publication activation.

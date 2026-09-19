# P7.3 AI Answer/Brand/Citation Collection Closeout

## Scope

Roadmap P7.3 implements a deterministic/default-off provider-neutral collection-normalization contract over exact P7.2 prompt/topic lineage and supplied/synthetic observations only.

Issue: #270  
Implementation PR: #271  
Base SHA: `d325d46010c36764a8be14af8c697e627f8e69b2`  
Base tree: `2721afdea15f59a29fb4f2e5334b41f25a8d0641`  
Exact tested implementation head: `4313d5df785d43245d0f327265897a29c915a0cf`  
Implementation merge: `399a6b946b213b2e8aff9416ca5287896476fe48`  
Implementation tree: `35d337012c4865e162e606f505d3ea63660e4e09`

P7.3 is additive deterministic fixture/contract engineering only. It adds no runtime route, OpenAPI change, live AI/provider request, credential use, persistence, database read/write/schema mutation, scheduler/worker, approval grant, site mutation, deployment or publication.

## Exact P7.2 lineage

P7.3 accepts:
- exact P7.2 prompt/topic model input;
- exact P7.2 prompt/topic model report;
- collection reference time;
- explicit provider/model registry;
- explicit tracked-brand registry;
- supplied/synthetic answer observations.

Before processing observations, P7.3 reconstructs P7.2 and requires complete canonical equality.

Every observation must bind to:
- a known exact P7.2 prompt key;
- the exact P7.2 prompt fingerprint.

Unknown or mismatched prompt lineage fails closed.

Prompt topic keys/fingerprints are inherited from P7.2 rather than inferred from answer text.

## Provider/model registry

Caller-supplied provider identities contain:
- normalized unique provider key;
- exact label;
- one or more models.

Each model contains:
- normalized unique model key within the provider;
- exact label.

P7.3 derives deterministic provider/model fingerprints.

Provider and model identity is opaque.

P7.3 does not infer:
- capability;
- quality;
- policy;
- freshness;
- market share;
- business value;
- preference or recommendation.

No cross-provider comparability claim is made.

## Tracked-brand registry

Caller supplies bounded tracked brands:
- normalized unique brand key;
- exact label.

P7.3 derives deterministic brand fingerprints.

It does not:
- discover aliases;
- infer entities;
- parse answer text for brands;
- infer brand absence from missing mention evidence.

## Observation contract

Each observation contains:
- normalized unique observation key;
- provider/model identity;
- exact P7.2 prompt key/fingerprint;
- canonical observation time;
- supplied evidence fingerprint;
- answer state;
- answer text;
- explicit brand mentions;
- explicit citations.

Observation order does not affect canonical report identity.

## Collection frame

Caller supplies canonical `collectionReferenceTime`.

It must be at or after exact P7.2 model reference time.

Every observation must be at or before collection reference time.

No wall-clock time is used.

## Answer states

Allowed:
- `answered`;
- `refused`;
- `unavailable`;
- `error`.

`answered` requires non-empty bounded exact answer text.

Other states require:
- null answer text;
- zero brand-mention records;
- zero citation records.

These states describe supplied collection results only.

They do not diagnose provider policy, intent or motive.

## Exact answer text

Answer text is preserved exactly after bounded control-character validation.

P7.3 does not:
- trim;
- normalize wording;
- summarize;
- rewrite;
- evaluate correctness;
- evaluate quality;
- infer sentiment.

## Explicit brand-mention evidence

Each supplied mention binds:
- known tracked brand key;
- exact caller-supplied matched text.

Matched text is preserved exactly.

Identical mention records collapse deterministically.

P7.3 derives only descriptive:
- mention count;
- distinct explicitly mentioned brand keys.

Mention evidence does not imply:
- recommendation;
- positive or negative sentiment;
- prominence;
- preference;
- ranking.

Missing supplied mention evidence does not prove a brand is absent from answer text.

## Citation normalization

Each citation contains:
- caller-supplied absolute URL;
- optional exact caller-supplied title.

P7.3:
- accepts HTTP(S) only;
- rejects URL credentials/userinfo;
- removes fragments;
- normalizes via the platform URL parser;
- exposes lower-cased hostname as descriptive citation domain.

The normalized URL is the duplicate identity within one observation.

Repeated identical normalized URLs with equal title metadata collapse.

Conflicting title metadata for the same normalized URL fails closed.

Citation URLs are never fetched.

## Citation semantic boundary

Citation presence does not imply:
- endorsement;
- authority;
- trust;
- correctness;
- factual support;
- ownership;
- competitive relationship.

Citation domain is descriptive provenance only.

P7.4 owns citation/domain/competitor comparison.

## Deterministic outputs

P7.3 deterministically emits:
- provider/model records and fingerprints;
- tracked-brand records and fingerprints;
- brand-mention records and fingerprints;
- citation records and fingerprints;
- observation records and fingerprints;
- inherited prompt/topic lineage;
- per-observation counts;
- report counts;
- report fingerprint.

Report counts include:
- providers/models/brands;
- observations;
- answered/refused/unavailable/error;
- explicit brand mentions;
- observations with explicit mention evidence;
- citations;
- distinct citation domains.

Counts are descriptive, not scores.

## Semantic guardrails

P7.3 explicitly records:
- supplied observations only;
- exact P7.2 prompt lineage required;
- answer observation does not imply correctness;
- non-answered state does not diagnose provider policy;
- brand mentions are caller-supplied only;
- no mention text mining;
- mention does not imply recommendation, positive sentiment, prominence or preference;
- missing mention evidence does not imply brand absence;
- citations are caller-supplied only;
- citation presence does not imply endorsement, authority, trust or support;
- citation domain is descriptive only;
- collection does not imply indexing;
- collection does not imply crawler accessibility;
- no cross-provider comparability claim;
- no domain/competitor comparison;
- no visibility scoring/history;
- no opportunity generation.

## Test and CI certification

Exact tested PR head `4313d5df785d43245d0f327265897a29c915a0cf` passed CI #488 / run `35447907730` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P7.3;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #271 was merged only from that exact green head.

Post-merge main `399a6b946b213b2e8aff9416ca5287896476fe48` passed CI #489 / run `35448044951` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `d325d46010c36764a8be14af8c697e627f8e69b2` / `2721afdea15f59a29fb4f2e5334b41f25a8d0641`;
- refreshed origin/main at the P7.3 implementation merge;
- ahead/behind `0/2`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `399a6b946b213b2e8aff9416ca5287896476fe48`;
- tree `35d337012c4865e162e606f505d3ea63660e4e09`;
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

Build output retained only existing non-fatal tooltip/sheet sourcemap messages and minified chunk-size warning.

No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P7.3 performed no:
- live AI/provider request;
- provider credential use;
- provider selection;
- AI/LLM or embedding call;
- source admission;
- prompt/answer/mention/citation persistence;
- Production DB read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry activation;
- approval grant;
- provider/public-site write;
- automatic transition;
- environment/secret/config mutation;
- deployment/publication.

## Next boundary

The next safe default milestone is **P7.4 — citation/domain/competitor comparison**.

P7.4 should remain deterministic/default-off and consume only exact P7.3 supplied-observation records plus explicit caller-supplied site/competitor domain identities.

P7.4 must not:
- call providers;
- fetch citation URLs;
- infer competitor identity from domain popularity or names;
- treat citation frequency as authority or quality;
- compare providers as though their observation samples are statistically equivalent unless an explicit compatible frame is supplied;
- score AI visibility/history owned by P7.5;
- generate opportunities owned by P7.6;
- persist data;
- publish.

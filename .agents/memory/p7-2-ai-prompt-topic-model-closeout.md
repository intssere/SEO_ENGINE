# P7.2 AI Prompt/Topic Set Model Closeout

## Scope

Roadmap P7.2 implements a deterministic/default-off prompt/topic-set catalog over explicit supplied/synthetic definitions only.

Issue: #267  
Implementation PR: #268  
Base SHA: `3c46105da8daaa6464c5f012e6c20d991b83db0f`  
Base tree: `d3b2ebea2e2a0a8f54c0b7e4d740deb578d7f2f7`  
Exact tested implementation head: `a10bedcec52baa16507ee8715d439cc672f15254`  
Implementation merge: `ecee3e9796c04c25f3c800e73e621c2cef299666`  
Implementation tree: `78384a93df0a3d66beba03d0e06b83a5ba57bd11`

P7.2 is additive deterministic modeling only. It adds no runtime route, OpenAPI change, AI/provider request, embedding request, database read/write/schema mutation, persistence, scheduler/worker, approval grant, site mutation, deployment or publication.

## Catalog frame

The caller supplies a normalized opaque site key, canonical reference time, topics, prompts and prompt sets. P7.2 requires at least one topic, prompt and prompt set in v1. The model contains no external lookup or live collection step.

## Topic definitions

Each topic contains a normalized unique topic key, exact caller-supplied label and optional normalized parent topic key. Only keys are normalized; labels are preserved exactly after bounded validation.

A parent relation exists only when explicitly supplied. P7.2 rejects unknown parents, self-parenting and topic cycles. It never infers hierarchy from labels, prompt text, keywords, embeddings or category assumptions.

## Prompt definitions

Each prompt contains a normalized unique prompt key, exact caller-supplied text, one or more explicit topic keys, and optional caller-owned intent/language/market codes.

Prompt text is preserved exactly. P7.2 performs no trimming/case-folding of prompt text, grammar correction, paraphrase, expansion or variant generation.

Repeated topic references are deterministically deduplicated and sorted. Every referenced topic must exist.

## Caller-owned codes

Intent, language and market codes are normalized opaque labels only. P7.2 does not infer intent, language or geography from prompt wording and attaches no hidden taxonomy to those codes.

## Prompt sets

Each set contains a normalized unique set key, exact caller-supplied label and one or more explicit prompt keys. Every referenced prompt must exist.

Repeated prompt references are deterministically deduplicated and sorted. Set topic coverage is derived only as the union of referenced prompts' exact topic keys. That union is descriptive catalog coverage only.

## Determinism

P7.2 canonicalizes output by topic, prompt and set key. Input order does not alter identity.

It emits deterministic topic, prompt and prompt-set fingerprints, reference/count summaries and a report fingerprint. Duplicate normalized topic/prompt/set definitions fail closed rather than being merged.

## Semantic guardrails

P7.2 explicitly records that:
- prompt membership does not imply demand, popularity or search volume;
- prompt-set membership does not imply priority;
- topic coverage does not imply AI visibility;
- prompt coverage does not imply answer inclusion, citation, ranking or recommendation;
- intent and topic similarity are not inferred;
- no prompt generation, expansion or rewriting occurs;
- no embeddings are generated;
- no answers/citations are collected;
- no visibility score/history is generated;
- no AI/GEO opportunity is generated.

## Bounds

P7.2 v1 bounds:
- topics: 256;
- prompts: 512;
- prompt sets: 128;
- topic references per prompt: 32;
- prompt references per set: 256;
- labels: 256 characters;
- prompt text: 4,096 characters;
- normalized keys/codes: 96 characters.

Bounds fail closed.

## Test and CI certification

The implementation required no semantic or test correction before merge.

Exact tested PR head `a10bedcec52baa16507ee8715d439cc672f15254` passed CI #484 / run `35445344907` across legacy PostgreSQL schema validation, Task tests, P3.6 migration validation, all workspace tests including P7.2, P4.10 Playwright Chromium critical paths, typecheck and build.

PR #268 was merged only from that exact green head.

Post-merge main `ecee3e9796c04c25f3c800e73e621c2cef299666` passed CI #485 / run `35445482575` across the same full matrix.

## Replit certification

Before implementation sync, Replit was at `3c46105da8daaa6464c5f012e6c20d991b83db0f` / tree `d3b2ebea2e2a0a8f54c0b7e4d740deb578d7f2f7`, clean, zero untracked, and `0/2` behind refreshed origin/main.

A Git-only fast-forward synchronized Replit to `ecee3e9796c04c25f3c800e73e621c2cef299666` / tree `78384a93df0a3d66beba03d0e06b83a5ba57bd11`, with origin/main identical, `0/0`, clean index/worktree, zero untracked, no Replit-only commit and no non-Git mutation.

Non-browser validation passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Build output retained only the existing non-fatal tooltip/sheet sourcemap messages and minified chunk-size warning. No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P7.2 performed no provider/AI/embedding request, credential use, source admission, prompt/topic persistence, answer/citation collection, visibility scoring, opportunity generation, Production DB read/write/DDL/DML, Task #64/#70 execution, scheduler/worker/retry activation, approval grant, provider/public-site write, automatic transition, environment/secret/config mutation, deployment or publication.

## Next boundary

The next safe default milestone is **P7.3 — AI answer/brand/citation visibility collection strategy**.

P7.3 should remain deterministic/default-off and first define a provider-neutral collection contract plus supplied/synthetic answer fixtures bound to exact P7.2 prompt identities.

P7.3 must not perform a live AI-provider request without separate explicit authorization, use credentials, persist answers/citations, claim supplied fixtures reflect live provider behavior, infer citation/brand presence without explicit supplied answer evidence, score visibility/history owned by P7.5, generate opportunities owned by P7.6, or publish.

# P7.1 AI Crawler/Bot Accessibility Closeout

## Scope

Roadmap P7.1 implements a deterministic/default-off AI crawler/bot accessibility audit over supplied/synthetic evidence only.

Issue: #264  
Implementation PR: #265  
Base SHA: `5ffb308a0a606b2514c3aaa8d443b8e382679e65`  
Base tree: `b6c3dcc81984059cb44f953f440fe567d7bdb992`  
Exact tested implementation head: `1525569d0f917e0760dc3aa53823a37ef0f6fdaa`  
Implementation merge: `74e5de6518359f9f92b2e73edd5d44f02eecffa2`  
Implementation tree: `6dfd2b5179b489367858ca2092000a9e0292415f`

P7.1 is additive deterministic audit engineering only. It adds no runtime route, OpenAPI change, live crawler, provider or AI request, database read/write/schema mutation, persistence, scheduler/worker, approval grant, site mutation, deployment or publication.

## Supplied evidence contract

P7.1 accepts:
- canonical audit reference time;
- normalized opaque site key;
- bounded caller-supplied bot/path observations.

Each observation carries:
- normalized bot key;
- exact caller-supplied user-agent string;
- exact caller-supplied site-relative path;
- exact evidence fingerprint;
- canonical observation time at or before the audit reference time;
- supplied robots decision: `allowed / disallowed / unknown`;
- optional supplied robots-rule fingerprint;
- supplied HTTP status;
- supplied challenge-detected flag;
- supplied body-available flag.

P7.1 never fetches or parses robots.txt and never sends an HTTP request.

## Identity and integrity

Only site/bot keys are normalized for deterministic identity.

User-agent and path remain exact caller-supplied strings after validation.

All observations sharing one normalized bot key must use the same exact user-agent string.

Duplicate identity is:
- bot key;
- path;
- evidence fingerprint.

Exact duplicates collapse only when all normalized observation metadata match.

Conflicting metadata under the same duplicate identity fails closed.

Different evidence fingerprints may represent distinct observations of the same bot/path.

## Deterministic probe status

P7.1 uses fixed precedence:

1. `blocked`
   - robots explicitly disallowed; or
   - HTTP 401/403.
2. `unavailable`
   - no block; and
   - HTTP 404/410.
3. `limited`
   - no block/unavailable condition; and
   - challenge detected, HTTP 429, or unresolved 3xx.
4. `accessible`
   - robots explicitly allowed;
   - HTTP 2xx;
   - body available.
5. `indeterminate`
   - all other combinations.

The status does not discard diagnostics. Robots/HTTP/challenge/body reason codes remain visible.

A stronger-precedence result may therefore retain lower-level diagnostics, for example a robots-disallowed 404 remains blocked while retaining resource-unavailable evidence.

## Bot summaries

P7.1 groups exact probes by normalized bot key and exact user-agent identity.

Summary state is:
- `accessible` if every probe is accessible;
- `blocked` if every probe is blocked;
- `limited` if every probe is limited;
- `unavailable` if every probe is unavailable;
- `indeterminate` if every probe is indeterminate;
- `mixed` otherwise.

Summaries also expose per-status probe counts.

A bot summary is descriptive only. It is not ranking, value scoring, recommendation or authorization.

## Semantic guardrails

P7.1 explicitly records that:
- robots allowance is not training consent;
- robots allowance is not a license;
- accessibility does not imply indexing;
- accessibility does not imply citation;
- accessibility does not imply AI-answer visibility;
- blocked/limited/unavailable status does not diagnose vendor intent;
- bot/vendor policy is not inferred from names;
- meta robots / X-Robots semantics are not invented when not supplied;
- no recommendation is generated;
- no prompt/topic model is generated;
- no AI answer/brand/citation visibility is collected;
- no AI visibility score/history is generated;
- no AI/GEO opportunity is generated.

## No vendor-specific hard-coding

P7.1 deliberately does not embed a current list of AI crawler vendors or user agents.

The caller supplies exact bot identity and user-agent text.

This prevents a stale hard-coded vendor catalog from becoming hidden policy semantics.

## Determinism and bounds

P7.1 deterministically produces:
- normalized site/bot keys;
- canonical observations;
- probe status/reasons;
- probe fingerprints;
- per-bot summary fingerprints;
- report counts;
- report fingerprint.

Input ordering and exact duplicate ordering do not affect canonical output ordering.

Bounds:
- maximum observations: 512;
- maximum distinct bots: 64;
- user-agent: 256 characters;
- path: 2,048 characters;
- normalized keys: 96 characters.

Bounds fail closed.

## Test and CI certification

The initial implementation commit `1525569d0f917e0760dc3aa53823a37ef0f6fdaa` required no semantic or test correction before merge.

That exact PR head passed CI #480 / run `35442537775` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P7.1;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #265 was merged only after the exact head was green.

Post-merge main `74e5de6518359f9f92b2e73edd5d44f02eecffa2` passed CI #481 / run `35442677104` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `5ffb308a0a606b2514c3aaa8d443b8e382679e65` / `b6c3dcc81984059cb44f953f440fe567d7bdb992`;
- refreshed origin/main at the P7.1 implementation merge;
- ahead/behind `0/2`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `74e5de6518359f9f92b2e73edd5d44f02eecffa2`;
- tree `6dfd2b5179b489367858ca2092000a9e0292415f`;
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

P7.1 performed no:
- live crawl;
- robots.txt fetch;
- provider or AI/LLM request;
- credential use;
- vendor-policy lookup;
- source admission;
- observation/accessibility persistence;
- Production DB read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry activation;
- approval grant;
- provider/public-site write;
- automatic transition;
- environment/secret/config mutation;
- deployment/publication.

## Next boundary

The next safe default milestone is **P7.2 — prompt/topic set model**.

P7.2 should remain deterministic/default-off and should model only explicit supplied/synthetic prompt/topic definitions and relationships.

P7.2 must not:
- call an AI provider;
- collect answers/citations owned by P7.3;
- infer prompt demand from unsupported data;
- treat prompt/topic coverage as visibility;
- persist data;
- generate site mutations;
- activate schedulers/workers;
- publish.

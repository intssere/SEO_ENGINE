# P6.7 Opportunity Lifecycle/History Closeout

## Scope

Roadmap P6.7 implements deterministic/default-off lifecycle/history engineering over exact P6.6 preview/diff and P6.5 actionability lineage.

Issue: #261  
Implementation PR: #262  
Base SHA: `04f458d6b0eecdd5c09d7cc85543d65e5c2ffabd`  
Base tree: `6b9184f65fe5b88aa427d613378effbf1d9f8ead`  
Exact tested implementation head: `56f5ba6f6aa33378f7e4cc39ba34ba6a923866e4`  
Implementation merge: `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b`  
Implementation tree: `5e410bc0b5cd6953d769fe336407d4e6491d222d`

P6.7 is additive deterministic history engineering only. It adds no route, OpenAPI change, provider/AI request, database read/write/schema mutation, persistence, approval grant, scheduler/worker, site mutation, automatic transition, deployment or publication.

## Exact lineage

P6.7 accepts:
- exact P6.6 preview/diff input;
- exact P6.6 preview/diff report;
- caller-supplied history reference time;
- optional caller-supplied lifecycle histories.

Before processing history it rebuilds P6.6 and requires complete canonical equality.

P6.6 reconstruction transitively revalidates exact P6.5/P6.4/P6.3/P6.2/P6.1 lineage.

Histories bind to exact opportunity and actionability fingerprints from the current certified P6.5 collection.

## Neutral observed baseline

Every exact current opportunity produces one lifecycle record.

Without explicit lifecycle events its state is `observed`.

`observed` means only:
- present in the certified current snapshot;
- no lifecycle transition was supplied.

It does not mean recommendation, approval, implementation, execution, deployment or verification.

## Explicit event ledger

History is caller supplied.

Each event includes:
- contiguous positive sequence beginning at 1;
- canonical timestamp;
- explicit event type;
- optional normalized caller-owned reason code;
- related opportunity fingerprint only for supersession.

Input array order is irrelevant; replay is canonicalized by sequence.

Event timestamps must be nondecreasing by sequence.

## Deterministic time boundary

The caller supplies `historyReferenceTime`.

It must be a canonical timestamp at or after the P6.6 opportunity reference time.

Every event timestamp must be at or before the supplied history reference time.

P6.7 uses no wall clock or `Date.now()`, so identical inputs replay identically.

## Lifecycle state machine

States:
- `observed`
- `active`
- `deferred`
- `dismissed`
- `closed`
- `superseded`

Allowed transitions:

- activate:
  - observed → active
  - deferred → active
- defer:
  - observed → deferred
  - active → deferred
- dismiss:
  - observed → dismissed
  - active → dismissed
  - deferred → dismissed
- close:
  - observed → closed
  - active → closed
  - deferred → closed
- supersede:
  - observed → superseded
  - active → superseded
  - deferred → superseded

A deferred opportunity can become active again only through an explicit later `activate` event.

## Terminal stale-fingerprint rule

`dismissed`, `closed`, and `superseded` are terminal in v1.

No later event may reactivate that exact fingerprint.

This enforces the architecture rule that stale opportunities remain history rather than being silently reused as live candidates.

If later evidence yields a new opportunity identity, that new fingerprint is tracked separately.

## Closed is not verified resolution

`closed` is administrative lifecycle closure only.

P6.7 explicitly does not interpret it as proof that:
- the SEO condition is fixed;
- a proposal was implemented;
- a provider/site mutation happened;
- measurement succeeded;
- verification passed.

Lifecycle state and execution/measurement evidence remain separate domains.

## Explicit supersession only

Supersession requires an exact related opportunity fingerprint.

The target must:
- exist in the same current exact P6.5 actionability collection;
- differ from the source.

The complete supersession graph must be acyclic.

P6.7 never infers supersession from:
- subject;
- family;
- kind;
- shared evidence;
- score/rank;
- actionability;
- preview content/diff;
- lexical similarity.

Supersession does not transfer recommendation, approval, execution or apply authority.

## Preview and actionability separation

P6.7 records:
- exact actionability identity/classification;
- associated exact P6.6 preview fingerprints where present.

Neither actionability classification nor preview presence/differences infer lifecycle events.

A blocked/recommend/approval/informational opportunity with no explicit history remains `observed`.

## Deterministic identity

P6.7 emits deterministic:
- event fingerprints;
- lifecycle record fingerprints;
- state/event counts;
- report fingerprint.

History-entry input order and event-array input order do not affect canonical identity once explicit sequences are valid.

## Test and CI certification

Exact tested PR head `56f5ba6f6aa33378f7e4cc39ba34ba6a923866e4` passed CI #476 / run `35440752266` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P6.7;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #262 was merged only from that exact green head.

Post-merge main `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b` passed CI #477 / run `35440907498` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `04f458d6b0eecdd5c09d7cc85543d65e5c2ffabd` / `6b9184f65fe5b88aa427d613378effbf1d9f8ead`;
- refreshed origin/main at the P6.7 implementation merge;
- ahead/behind `0/2`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `d587a1cc7737c87e09b5bdb827b1cc80170c8a8b`;
- tree `5e410bc0b5cd6953d769fe336407d4e6491d222d`;
- origin/main identical;
- ahead/behind `0/0`;
- index/worktree clean;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation on that exact checkout passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Build output retained existing non-fatal sourcemap messages for `tooltip.tsx` and `sheet.tsx` plus the existing minified chunk-size warning. No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P6.7 performed no:
- provider or AI/LLM request;
- credential use;
- current-site fetch;
- public-site read/write;
- source admission or refresh-plan mutation;
- Task #64/#70 execution;
- approval grant;
- observation/evidence/score/priority/explanation/actionability/preview/lifecycle persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- automatic lifecycle transition;
- environment/secret/config mutation;
- application deployment or publication.

## Phase P6 completion

With P6.7 certified, Phase P6 is complete:
- P6.1 unified opportunity types;
- P6.2 transparent evidence-bound scoring;
- P6.3 conflict/dedupe/suppression/prioritization;
- P6.4 deterministic explanation/evidence generation;
- P6.5 deterministic actionability classification;
- P6.6 deterministic current-vs-proposed preview/diff;
- P6.7 deterministic lifecycle/history.

## Next boundary

The next safe default milestone is **P7.1 — AI crawler/bot accessibility audit**.

The safe initial P7.1 boundary is deterministic/default-off audit engineering using supplied or synthetic accessibility-policy evidence only.

P7.1 must not, without separate authorization:
- perform a live crawl or public-site request;
- use provider credentials;
- infer bot access from unsupplied network observations;
- mutate robots.txt, headers, CDN/firewall policy or site content;
- persist new production evidence;
- activate workers/schedulers;
- deploy or publish.

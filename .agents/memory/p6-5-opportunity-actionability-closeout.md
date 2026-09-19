# P6.5 Opportunity Actionability Closeout

## Scope

Roadmap P6.5 implements deterministic/default-off actionability classification over exact P6.4 explanation lineage.

Canonical states:
- `informational`
- `recommend`
- `approval`
- `blocked`

Issue: #255  
Implementation PR: #256  
Base SHA: `153c5c423443c746085c6c7893c1f0893cff6e1d`  
Base tree: `a07d8fb5388d451dc4b10e1a4e7ff63a099fd194`  
Exact tested implementation head: `abd73c795b061d7f31b7e6c95a3a8811d702c431`  
Implementation merge: `0a306365d8f0e23f203e4dc9c59afed0c04c586f`  
Implementation tree: `d776c241f8884e2f83d3aa6db3d212c9da30de1c`

P6.5 is additive deterministic governance engineering only. It adds no route, OpenAPI change, provider or AI request, database read/write/schema mutation, persistence, approval grant, scheduler/worker, public-site mutation, automatic transition, deployment or publication.

## Exact lineage

P6.5 accepts the exact P6.4 explanation input and exact P6.4 explanation report.

Before classification it rebuilds P6.4 and requires complete canonical equality.

P6.4 reconstruction transitively revalidates:
- exact P6.3 prioritization;
- exact P6.2 scoring;
- exact P6.1 opportunity/evidence lineage.

A caller-tampered explanation report therefore fails closed.

## Explicit governance policy

Every P6.4 explanation item must have exactly one explicit policy entry containing:
- the exact opportunity fingerprint;
- `recommendationAllowed`;
- `approvalRequired`;
- bounded `blockCodes`.

There is no implicit policy default.

Missing coverage, unknown fingerprints and duplicate policy entries fail closed.

This prevents a high score, top rank or serialization position from silently becoming an actionability escalation.

## Block-code normalization

Caller-owned block codes are:
- NFKC normalized;
- trimmed;
- lower-cased;
- syntax validated;
- deduplicated;
- sorted;
- bounded to eight per opportunity.

P6.5 gives the codes no hidden business interpretation.

Any explicit block code makes the current classification `blocked`.

## Exact precedence

P6.5 applies one fixed precedence:

1. `blocked`
   - explicit P6.5 block code exists; or
   - inherited exact P6.3 decision is suppressed.
2. `approval`
   - not blocked;
   - `approvalRequired=true`.
3. `recommend`
   - not blocked;
   - approval not required;
   - `recommendationAllowed=true`.
4. `informational`
   - none of the above.

If approval and recommendation flags are both true, `approval` wins.

## Blocked state

`blocked` is a current governance classification only.

It is not deletion, permanent rejection, approval denial or an execution side effect.

The decision preserves:
- normalized explicit P6.5 block codes;
- inherited P6.3 explicit suppression codes;
- inherited P6.3 system suppression reasons;
- inherited conflict metadata.

Unresolved equal-top P6.3 conflicts remain blocked. P6.5 never invents a winner.

## Approval state

`approval` means approval is **required before any future execution path**.

It does not mean approval is granted.

Every decision hard-codes:
- `approvalGranted: false`;
- `executionAuthorized: false`;
- `automaticTransitionAuthorized: false`.

P6.5 has no approver action and no approval-transition primitive.

## Recommend state

`recommend` is advisory governance classification only.

It does not:
- generate recommendation prose;
- grant approval;
- authorize execution;
- enqueue work;
- mutate a provider/site;
- transition automatically.

## Informational state

`informational` has no implicit escalation.

It means the explicit policy does not currently enable recommendation or require approval and the inherited P6.3 decision is not blocked.

P6.5 performs no state transition on its own.

## No hidden inference

P6.5 explicitly does not infer actionability from:
- P6.2 score;
- P6.3 advisory priority rank;
- equal-score serialization order;
- opportunity family;
- opportunity kind;
- subject text;
- evidence kind/text;
- missing-evidence code;
- semantic-guard text.

A rank-1 opportunity can remain informational.

A lower-ranked eligible opportunity can be recommend if the explicit policy allows it.

Scoring/prioritization and governance remain separate concerns.

## Determinism

P6.5 deterministically produces:
- normalized policy metadata;
- classification/reasons;
- actionability decision fingerprint;
- per-state counts;
- report fingerprint.

Policy input order does not affect output identity.

Decision order follows canonical P6.4 item order and does not create an additional preference.

## Test and CI history

Initial implementation commit: `cc2ec0bec86e3992966166f3500fde8015df1dd6`.

Before PR creation, an unused test fixture helper was removed in commit `abd73c795b061d7f31b7e6c95a3a8811d702c431`. This was test-only cleanup and changed no P6.5 semantics.

Exact tested PR head `abd73c795b061d7f31b7e6c95a3a8811d702c431` passed CI #467 / run `35435400355` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P6.5;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #256 was merged only from that exact green head.

Post-merge main `0a306365d8f0e23f203e4dc9c59afed0c04c586f` passed CI #468 / run `35435517215` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `153c5c423443c746085c6c7893c1f0893cff6e1d` / `a07d8fb5388d451dc4b10e1a4e7ff63a099fd194`;
- origin/main at the P6.5 implementation merge;
- ahead/behind `0/3`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `0a306365d8f0e23f203e4dc9c59afed0c04c586f`;
- tree `d776c241f8884e2f83d3aa6db3d212c9da30de1c`;
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

P6.5 performed no:
- provider or AI/LLM request;
- credential use;
- public-site read/write;
- source admission or refresh-plan mutation;
- Task #64/#70 execution;
- approval grant;
- observation/evidence/score/priority/explanation/actionability persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- automatic transition;
- environment/secret/config mutation;
- application deployment or publication.

## Next boundary

The next safe default milestone is **P6.6 — current-vs-proposed preview/diff generation**.

P6.6 should remain deterministic/default-off and may describe a caller-supplied current state versus a caller-supplied proposed state only when both are explicitly bound to certified P6.1–P6.5 lineage.

P6.6 must not:
- manufacture current state that is not supplied;
- treat proposed content/configuration as already applied;
- mutate a provider/site;
- grant approval;
- execute or enqueue changes;
- infer lifecycle/history owned by P6.7;
- activate persistence, schedulers/workers or publication.

# P8.8 W09-C3F-A-R1 — queued deployment closeout and diagnostic contract

## Status

**R1 CONSUMED — NON-TERMINAL / FAIL CLOSED.**

This document persists the exact one-shot R1 observation and defines the next bounded diagnostic gate. It does not authorize another Railway call.

## R1 observation

The authorized target was:
- project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- canonical deployment `fc7a00ce-9fc1-4c43-a936-b942386bbd99`.

Exactly one read-only status observation was made.

Railway reported:
- target deployment `fc7a00ce-9fc1-4c43-a936-b942386bbd99`: `QUEUED`, pending-work status `applying`;
- newer application deployment `b02a72cd-98b2-4eb4-aa7b-e7f8fae0775d`: `QUEUED`, pending-work status `applying`;
- staged environment patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`: `STAGED`, two internal changes representing the previously reconciled service update and `AUTH_PUBLIC_ORIGIN` variable set;
- Railway-managed Postgres deployment `31895ebb-987b-47e7-a938-a52b902b62ef`: `SUCCESS`;
- existing Postgres volume `5e7f09d1-c436-4a49-9526-c3150d0e820a` remained mounted at `/var/lib/postgresql/data`, 50000 MB, `europe-west4-drams3a`.

No second observation was performed.

## R1 verdict

The target deployment was still non-terminal. R1 therefore cannot establish:
- terminal success;
- terminal failure;
- a stable snapshot;
- deployment-consumed config identity;
- a deployable C2Z Railway input.

Result: **C3F_A_R1_NON_TERMINAL**.

The appearance of a second queued application deployment is evidence of concurrent/pending deployment work. It is not by itself evidence of a build failure, runtime failure, Railway outage, deadlock, or application defect.

## Four independent state dimensions

### D1 — queue/control-plane state

Known:
- at the R1 observation instant, two application deployments were queued/applying;
- the environment therefore was moving.

Unknown:
- whether either later reached BUILDING/DEPLOYING/SUCCESS/FAILED/CANCELED;
- whether the queue was ordinary serialization, capacity delay, control-plane delay, or another cause.

### D2 — build/runtime failure evidence

No logs were authorized or read. No build/runtime failure may be inferred from `QUEUED`.

Historical failed deployments remain historical evidence only and must not be used to classify the new queued deployments.

### D3 — staged patch state

Patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` remained STAGED. R1 did not apply, discard, edit, or otherwise mutate it.

The queued deployments must not be assumed to include that staged patch unless authoritative deployment metadata proves such inclusion.

### D4 — structural external-binding gap

R1 was a terminal-state recovery gate only. It does not repair C3F-A's separate lack of:
- `bindingRevisionId`;
- `structuralReferenceId`;
- `structuralReferenceTargetResourceId`.

Even terminal SUCCESS would leave the C2Z external-Neon association unproved.

## Next gate — C3F-A-Q1 bounded queue diagnostic

Q1 exists only to classify current deployment/control-plane state without logs or mutation.

### Allowed observations

One bounded read-only observation may retrieve:
- exact project/environment/service identity;
- a bounded list of application deployment records;
- deployment IDs;
- status;
- created/updated timestamps if exposed;
- Git commit/branch metadata;
- snapshot ID when exposed;
- non-secret workflow/pending-work identity/status;
- staged-patch ID/status/count and change kinds/variable names only.

### Forbidden observations/actions

Q1 must not:
- read build/deploy/runtime logs;
- read variable values or rendered references;
- read secrets or connection strings;
- invoke Agent or shell;
- perform `config pull`, `config plan`, or `config apply`;
- accept/discard/edit the staged patch;
- deploy, redeploy, cancel, restart, rollback, or otherwise mutate a deployment;
- call Neon;
- open a DB session or execute SQL;
- infer external provider identity from a credential/hostname;
- poll or automatically retry.

## Q1 classification

### Q1_TERMINAL_SUCCESS

The exact canonical deployment is terminal `SUCCESS` and exposes a stable snapshot.

Record the evidence and stop. Do not proceed to Neon because R2 structural association remains unsolved.

### Q1_TERMINAL_FAILURE

The exact canonical deployment is terminal `FAILED`, `CANCELED`, or equivalent.

Record only control-plane failure state and stop. A separate explicit authorization is required before logs may be considered.

### Q1_SUPERSEDED_SUCCESS

The exact canonical deployment did not become the active success, but a later deployment for an explicitly identified canonical main commit is terminal `SUCCESS`.

Record both deployment identities and stop. A separate source-lineage reconciliation is required before treating the later deployment as the certified replacement.

### Q1_STILL_MOVING

Any relevant application deployment remains non-terminal and prevents a stable certification boundary.

Stop with no retry.

### Q1_STATE_AMBIGUOUS

Returned metadata is insufficient or contradictory.

Stop fail closed.

## Fresh authorization packet — Q1

`AUTHORIZE W09-C3F-A-Q1 BOUNDED RAILWAY QUEUE DIAGNOSTIC — perform exactly one read-only control-plane observation of Railway project 52265e29-921b-4652-ac0d-9da4e5e69936, production environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298, and application service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90; retrieve only a bounded deployment list and non-secret status/ID/timestamp/commit/branch/snapshot/pending-work metadata plus staged-patch ID/status/count/change-kind/variable-name metadata; classify the canonical deployment fc7a00ce-9fc1-4c43-a936-b942386bbd99 and any later app deployment without reading logs; no polling/retry, variable values, rendered references, secrets, shell, Agent, config pull/plan/apply, patch mutation, deploy/redeploy/cancel/restart/rollback, Neon/DB/SQL, provider/public writes, or other mutation.`

Q1 is consumed after one observation regardless of result.

## After Q1

- Terminal success: persist deployment evidence, then continue to the separately designed C3F-A-R2 structural-association capability work.
- Terminal failure: do not automatically read logs; design/authorize a bounded diagnostic if needed.
- Still moving: stop. Do not consume repeated observation packets in a tight loop.
- Ambiguous: fail closed and improve the evidence mechanism.

## Hard exclusions

This contract does not authorize any live Railway call. It does not authorize Neon, DB/SQL, credentials, logs, staged-patch mutation, deployment mutation, IaC operations, Replit mutation, scheduler/worker/provider activation, Stage 0, cutover, or UGP integration.

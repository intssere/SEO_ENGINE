# P8.8 W09-C3F-A-Q1 — queue result and repeated-failure diagnostic gate

## Status

**Q1 CONSUMED — Q1_STILL_MOVING / FAIL CLOSED.**

This document persists the one-shot Q1 observation and defines a separate future diagnostic gate. It authorizes no live action.

## Q1 evidence

The exact authorized project/environment/service were:
- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`.

Exactly one bounded deployment-list observation was made.

It established:
- `fc7a00ce-9fc1-4c43-a936-b942386bbd99`: `FAILED`, snapshot `07f73cd3-417c-4912-9d54-884501914966`, main commit `503826227a52db61e775fa89eb45b37e49d787c4`;
- `b02a72cd-98b2-4eb4-aa7b-e7f8fae0775d`: `FAILED`, snapshot `6b2c1332-dd22-4ae3-a460-6321442b6fac`, main commit `1f03834d976b73b64c9d7eede79b9535cfb32e68`;
- `b1702163-ba85-4be2-a73c-de4af65afda9`: `BUILDING`, snapshot `a0b1c45e-2fd6-4fb9-860d-9783a23849ed`, canonical main commit `47bbab439c5c3121fb6d73fc541220e1ab63fd16`.

The bounded history also contained multiple preceding terminal `FAILED` main deployments. Status history alone does not establish their failure cause.

No log stream was read and no mutation occurred.

## Q1 verdict

Because the exact current-main deployment was still `BUILDING`, no stable terminal certification boundary existed.

Result: **Q1_STILL_MOVING**.

The terminal failures are sufficient to justify a separately authorized failure diagnostic, but not to infer:
- build-command failure;
- Dockerfile failure;
- dependency-install failure;
- application startup failure;
- healthcheck failure;
- missing/incorrect variable;
- database connectivity failure;
- Railway platform failure;
- staged-patch involvement;
- external-Neon binding failure.

## Diagnostic separation

### Build phase

A deployment that reaches `FAILED` may have failed during build, but status alone does not prove that phase or cause.

### Deploy/runtime phase

A build may complete and deployment/runtime/healthcheck may then fail. Status alone does not distinguish this.

### Queue/control-plane phase

Q1 proved earlier queued deployments progressed to terminal states and current main reached `BUILDING`. This narrows the earlier queue concern but does not certify current terminal state.

### Staged patch

Patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` was previously certified STAGED and unapplied. No deployment is to be treated as containing the patch without authoritative evidence.

### External Neon association

Deployment failure diagnosis is independent of the unresolved C3F structural association:
`bindingRevisionId -> structuralReferenceId -> structuralReferenceTargetResourceId`.

A deployment becoming healthy would not by itself prove the external-Neon join.

## Next gate — C3F-A-F1 bounded failure diagnostic

F1 is a read-only diagnostic for one selected terminal failed deployment. It is deliberately narrower than general log access.

### Preconditions

Before F1:
1. select one exact terminal failed deployment;
2. bind the authorization to its deployment ID and snapshot ID;
3. do not use a moving deployment;
4. do not include current BUILDING deployment unless a later, separately authorized observation first proves it terminal.

The preferred initial specimen is the already terminal canonical C3F deployment:
- deployment `fc7a00ce-9fc1-4c43-a936-b942386bbd99`;
- snapshot `07f73cd3-417c-4912-9d54-884501914966`;
- commit `503826227a52db61e775fa89eb45b37e49d787c4`.

### Allowed evidence

Exactly one bounded Railway log retrieval may read:
- build log stream;
- deploy/runtime log stream;
- only for the exact selected deployment;
- at most 100 entries per requested stream.

Return only the minimum lines needed to identify:
- last successful build/deploy phase marker;
- first concrete error;
- Railway-reported error class/message;
- healthcheck/startup phase if explicitly present.

### Secret-safety rule

If returned logs contain credentials, tokens, passwords, connection strings, cookies, authorization headers, private keys, or rendered secret values:
- do not reproduce them;
- redact the value;
- classify the evidence as contaminated where the secret is material to diagnosis;
- stop rather than using a secret value as provenance.

Credential-derived hostnames must not be promoted into C3F/C2Z identity evidence.

### Forbidden actions

F1 must not:
- read HTTP request logs;
- read variable values or call variable-listing surfaces;
- read secrets/config values;
- invoke shell or Agent;
- mutate, redeploy, restart, cancel, rollback, or remove a deployment;
- accept/discard/edit the staged patch;
- perform IaC pull/plan/apply;
- call Neon;
- open DB/SQL;
- trigger provider/public writes;
- retry automatically.

### F1 classifications

- **F1_BUILD_FAILURE_IDENTIFIED** — bounded build evidence identifies a concrete build-stage failure.
- **F1_RUNTIME_FAILURE_IDENTIFIED** — build completed sufficiently and bounded deploy evidence identifies startup/runtime/healthcheck failure.
- **F1_PLATFORM_FAILURE_IDENTIFIED** — Railway explicitly reports a platform/control-plane failure not attributable from the evidence to application execution.
- **F1_SECRET_CONTAMINATED** — required diagnostic evidence exposes secret material; stop.
- **F1_INSUFFICIENT_EVIDENCE** — bounded streams do not identify a concrete cause.
- **F1_STATE_MISMATCH** — selected deployment/snapshot is not the frozen specimen; stop.

A diagnosis does not authorize a fix. Any repository/config/deployment correction must be separately reviewed and authorized according to its mutation class.

## Fresh authorization packet — F1

`AUTHORIZE W09-C3F-A-F1 BOUNDED RAILWAY FAILURE DIAGNOSTIC — for terminal failed Railway deployment fc7a00ce-9fc1-4c43-a936-b942386bbd99 / snapshot 07f73cd3-417c-4912-9d54-884501914966 in project 52265e29-921b-4652-ac0d-9da4e5e69936, retrieve exactly one bounded Railway log response containing only build and deploy/runtime streams with at most 100 entries per stream; identify only the last successful phase marker, first concrete error, Railway error class/message, and explicit startup/healthcheck phase; redact and do not use any credential/token/password/connection-string/cookie/auth-header/private-key/rendered-secret material; no HTTP logs, variable-value access, secrets/config reads, shell, Agent, IaC pull/plan/apply, patch mutation, deploy/redeploy/restart/cancel/rollback/remove, Neon/DB/SQL, provider/public writes, or automatic retry.`

F1 is consumed after exactly one bounded log retrieval regardless of result.

## After F1

- Concrete repository/build defect: reproduce from repository/config evidence where possible, prepare a bounded fix PR, and require normal CI/merge authorization.
- Runtime/config defect: design the smallest correction packet; do not mutate Railway under F1.
- Platform failure: preserve provider evidence and define a support/retry strategy separately.
- Secret contamination: rotate if necessary under separate authorization and redesign the diagnostic.
- Insufficient evidence: fail closed; do not widen access automatically.

## Hard exclusions

This document does not authorize F1 itself. It authorizes no live Railway call, no deployment observation/retry, no variable or secret access, no Railway mutation, no Neon/DB/SQL, no Replit mutation, no Stage 0, no scheduler/worker/provider activation, no cutover, and no UGP integration.

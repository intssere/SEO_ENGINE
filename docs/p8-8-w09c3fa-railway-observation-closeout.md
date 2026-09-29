# P8.8 W09-C3F-A — Railway non-secret binding observation closeout

## Status

**CONSUMED — FAIL CLOSED.**

This record persists the one-shot W09-C3F-A observation authorized under the C3F contract. It does not authorize a retry and does not mutate Railway.

Canonical GitHub main observed: `503826227a52db61e775fa89eb45b37e49d787c4`.

## Authorized boundary

The observation was restricted to the exact:
- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`;
- production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`.

Only non-secret deployment/config/reference metadata and variable names were permitted. Variable values, rendered references, secrets, logs, shell, agent, IaC pull/plan/apply, patch mutation, deploy/redeploy/cancel, DB/SQL, and automatic retry were forbidden.

## Observation

The exact Railway target matched the frozen C3F identifiers.

The application service's latest deployment was:

- deployment ID: `fc7a00ce-9fc1-4c43-a936-b942386bbd99`;
- status: `QUEUED`;
- created: `2026-09-29T16:51:16.604Z`;
- canonical commit: `503826227a52db61e775fa89eb45b37e49d787c4`;
- branch: `main`;
- snapshot ID: unavailable while observed.

Railway also reported that deployment as pending/applying work.

The previously reconciled environment patch remained:
- patch ID `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`;
- status `STAGED`;
- associated with the application service and `AUTH_PUBLIC_ORIGIN`.

The patch was not accepted, discarded, changed, or deployed by C3F-A.

The Railway-managed Postgres shadow service remained separate from the selected external-Neon architecture.

## Structural-association result

The permitted Railway surfaces exposed:
- project/environment/service identity;
- deployment identity and state;
- snapshot identity when available for historical terminal deployments;
- Git commit/branch metadata;
- service source/build/deploy/network configuration;
- variable names;
- staged-patch identity/state.

They did **not** expose an authoritative:
- `bindingRevisionId`;
- `structuralReferenceId`;
- `structuralReferenceTargetResourceId`.

`DATABASE_URL` was observed only as a variable name. Its value was not requested or returned.

Therefore no C2Z external-resource join can be constructed from this observation.

## Verdict

Two independent fail-closed conditions were present.

### 1. Environment moving

The exact canonical deployment was non-terminal `QUEUED`, so the observation cannot certify a successful deployment, stable snapshot, or deployment-consumed configuration.

Result: **C3F_A_ENVIRONMENT_MOVING**.

### 2. Structural association unavailable

The bounded connector surfaces did not expose the non-secret deployed-binding-to-external-resource association required by C3F/C2Z.

Result: **C3F_A_STRUCTURAL_ASSOCIATION_UNAVAILABLE**.

Overall: **FAIL CLOSED**.

No automatic retry or polling occurred.

## What is not established

C3F-A does not establish:
- that deployment `fc7a00ce-9fc1-4c43-a936-b942386bbd99` later succeeded or failed;
- its eventual snapshot ID;
- a binding revision;
- an external structural reference;
- that `DATABASE_URL` targets Neon;
- any current Neon identity;
- C2Z PASS;
- C2W PASS.

## Recovery decomposition

The two blockers must be handled independently.

### R1 — terminal deployment-state recovery

After sufficient time has elapsed, a fresh one-shot read-only authorization may observe only the exact canonical deployment and environment state.

R1 can establish a stable successful deployment/snapshot if Railway reports terminal `SUCCESS`. It cannot repair the structural-association gap.

If the deployment is still non-terminal, stop without polling/retry.

If terminal `FAILED`, record the stable failure. Logs remain outside scope unless separately authorized.

### R2 — structural-association capability recovery

Even after R1 succeeds, C3F-A remains blocked unless an authoritative Railway/platform surface can expose the exact deployed opaque binding's non-secret external target identity.

The next investigation should target:
- official Railway API/schema/documentation for variable/reference/binding revision metadata;
- Railway support/platform attestation capability;
- an integration/resource identifier that can be independently joined to Neon.

It must not inspect the rendered variable value.

If no such platform surface exists, the correct result remains UNAVAILABLE and the architecture must use an explicitly attestable binding mechanism before C2Z can pass.

## Fresh authorization packet — R1

`AUTHORIZE W09-C3F-A-R1 TERMINAL DEPLOYMENT STATE OBSERVATION — perform exactly one read-only observation of Railway project 52265e29-921b-4652-ac0d-9da4e5e69936, production environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298, application service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90, and canonical deployment fc7a00ce-9fc1-4c43-a936-b942386bbd99; return only deployment status, deployment ID, snapshot ID, commit/branch metadata, environment pending-work summary, and staged-patch identity/status; no polling or retry, variable values, logs, agent, shell, config pull/plan/apply, patch mutation, deploy/redeploy/cancel, Neon/DB/SQL, or other mutation.`

R1 is consumed after one observation regardless of result.

## Future structural-capability gate

A separate C3F-A-R2 contract should be implemented before any live R2 action. It should enumerate the exact Railway API/documentation/support surfaces to inspect and require non-secret outputs only.

R2 must remain separate from R1 so a moving deployment cannot cause repeated capability calls and a capability investigation cannot mutate deployment state.

## Sequencing

```text
C3F-A consumed / FAIL CLOSED
  -> persist this closeout
  -> C3F-A-R1 one-shot terminal-state observation (fresh explicit authorization)
  -> if terminal SUCCESS: retain deployment/snapshot evidence
  -> C3F-A-R2 structural-association capability contract/research
  -> only if R2 proves authoritative target identity: C3F-B Neon observation
  -> exact resource-ID join
  -> C3F-C pure C2Z/C2W materialization
```

A successful R1 alone does not authorize C3F-B.

## Hard exclusions

No retry of consumed C3F-A, no automatic polling, variable values, rendered references, secrets, logs, Railway Agent, shell, IaC pull/plan/apply, patch mutation, deploy/redeploy/cancel, Neon live observation, DB/SQL, migration, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.

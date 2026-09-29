# P8.8 W09-C3D — Live-safe Railway IaC import/preflight authorization design

## Status

Repository-only authorization/runbook design. C3D performs no Railway IaC import or plan, no staged-patch mutation, no deployment action, no secret read, and no Neon/database action.

Canonical base: `69e07d06855bb141cfaebf27b5a7ceffbd1cccd5`.

## Purpose

C3C created a deterministic non-secret desired-state manifest and a deliberately non-applicable scaffold. C3D defines the exact bounded live procedure required before a real Railway IaC baseline can be imported and a read-only plan can be trusted.

The future live procedure is split into independently authorized phases so observation cannot silently become mutation.

## Current read-only control-plane observation

Observed during C3D without variable values, logs, or mutation:

### Frozen target
- Railway project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` / `production`
- application service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` / `seo-engine-shadow`
- repository/branch: `intssere/SEO_ENGINE` / `main`
- Dockerfile path: `Dockerfile`
- healthcheck: `/api/healthz`
- Railway Postgres shadow service remains present and is not Production DB authority.

### Existing staged patch
Patch:
- ID `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`
- status `STAGED`
- started `2026-09-22T12:41:07.141Z`

Environment pending-work view reports exactly:
1. `resource.update` for the application service;
2. `variable.set` for `AUTH_PUBLIC_ORIGIN`.

The service-config staged projection reports `changeCount=1` and the staged variable name `AUTH_PUBLIC_ORIGIN`, while environment-level status reports `changeCount=2`.

C3D treats this as a **projection difference** because the environment-level surface explicitly enumerates both changes. It is not evidence that the patch changed, and it does not authorize accepting or discarding either change.

No value of `AUTH_PUBLIC_ORIGIN` was read.

### Moving deployment state
A Git-triggered deployment was automatically observed:
- deployment `aa6b685b-ef9b-480f-8009-3a5a73fe055e`
- commit `69e07d06855bb141cfaebf27b5a7ceffbd1cccd5`
- status at observation: `WAITING`
- URL: absent
- snapshot: absent

C3D did not trigger, approve, cancel, redeploy, or inspect logs for this deployment.

A non-terminal deployment means the Railway environment is not a stable certification snapshot. A future IaC import/plan authorization must first re-observe a terminal state.

## Authorization phases

### Phase D0 — stable-state observation

Allowed under a future explicit C3D live-preflight authorization:
- read Railway project/environment/service metadata;
- read current deployment metadata;
- read staged-patch metadata;
- read variable **names only** through a surface documented not to return values;
- read non-secret domains/configuration metadata.

Forbidden:
- `list_variables`;
- logs;
- shell/agent secret discovery;
- variable values;
- accept/discard patch;
- deploy/redeploy/cancel;
- `config pull/plan/apply`;
- Neon/database access.

D0 PASS requires:
1. exact project/environment/service IDs match;
2. canonical Git commit is frozen;
3. latest app deployment is terminal;
4. no pending deployment/build/apply workflow;
5. staged patch ID and exact enumerated changes are captured;
6. no unexpected staged DB/provider/scheduler/worker/public-write changes;
7. Railway Postgres shadow resource remains unchanged;
8. no credential-bearing output is required.

If the latest deployment is `WAITING`, `QUEUED`, `INITIALIZING`, `BUILDING`, `DEPLOYING`, `NEEDS_APPROVAL`, or otherwise non-terminal, stop without import/plan.

Terminal does not mean successful. A terminal `FAILED` deployment may establish stable control-plane state for import design, but cannot satisfy later deployment certification.

### Phase D1 — staged-patch reconciliation decision

D1 is a decision gate, not an automatic action.

The operator must classify every enumerated staged change:
- intended and preserve;
- intended and separately commit;
- unrelated and separately discard/revert;
- unknown -> fail closed.

For the currently observed patch, both the application `resource.update` and `AUTH_PUBLIC_ORIGIN` variable set must be explained before proceeding.

The service-config projection alone is insufficient because it omits the resource-update item shown by environment pending-work metadata.

D1 must produce an exact reconciliation packet:
- patch ID;
- patch status;
- full non-secret change list;
- classification per change;
- intended action per change;
- explicit statement that no DB/provider/scheduler/worker/public-write gate is enabled;
- expected post-reconciliation config identity.

**No reconciliation action may occur from a generic `continue`.** Accepting, committing, discarding, reverting, or otherwise changing the patch requires separate explicit mutation authorization.

If the selected future workflow can import safely while preserving the patch without accepting/discarding it, that fact must be demonstrated by authoritative Railway semantics. It must not be assumed.

### Phase D2 — secret-safe IaC baseline import

D2 requires fresh explicit authorization because `config pull` reads live Railway configuration and writes repository-local IaC content.

Permitted command semantics:
- `railway config pull`;
- **never** `--include-variables`;
- target exact frozen project/environment;
- write only the isolated C3D/C3E working branch;
- no apply.

Required post-import inspection:
1. exactly one Railway authoring file exists;
2. imported project/environment target is correct;
3. existing application service is preserved rather than recreated;
4. Railway Postgres shadow service and volume are preserved;
5. generated Railway domains are not accidentally promoted into destructive desired state;
6. secret variables are represented only through Railway's secret-preserving mechanism such as `preserve()`;
7. no literal `DATABASE_URL`, password, token, connection string, hostname copied from credentials, or other secret appears;
8. no migration/pre-deploy command is introduced;
9. no scheduler/worker/provider/public-write activation is introduced;
10. imported baseline is committed separately before adding C3C desired-state declarations.

If import emits a secret or credential-bearing value, stop, do not commit it, do not echo it into receipts, and treat the import as failed/contaminated.

D2 import is a repository working-tree change, not Production mutation. It still requires explicit authorization because it reads live platform configuration.

### Phase D3 — read-only IaC plan

D3 requires a separately reviewed baseline and explicit plan authorization.

Permitted:
- `railway config plan`;
- default hidden/redacted values only;
- saved machine-readable plan artifact where supported;
- `--detailed-exit-code` for drift detection;
- no `--show-values`.

Forbidden:
- `config apply`;
- `--show-values`;
- accept-deploy;
- variable mutations;
- deployment/redeploy;
- destructive confirmation flags.

The plan must be tied to:
- canonical Git commit;
- exact `.railway/` tree;
- Railway project/environment IDs;
- exact application service ID continuity;
- environment/config etag or equivalent immutable plan-state token;
- staged-patch disposition;
- plan artifact identity;
- creation timestamp.

D3 PASS for a baseline-only import is **zero unintended change**.

If a later plan intentionally adds the C3C non-secret manifest, every proposed change must be allowlisted and separately reviewed.

Any delete/recreate of the app service, Postgres service, volume, domain, or variable is fail-closed unless explicitly designed and authorized in a later destructive milestone.

## Evidence receipt

A future C3D live-preflight receipt must be sanitized and contain only:
- schema/version;
- canonical Git commit/tree;
- Railway project/environment/service IDs;
- latest deployment ID/status/snapshot ID if present;
- stable-state verdict;
- staged patch ID/status;
- enumerated non-secret change kinds/addresses/variable names;
- reconciliation classification;
- import mode (`values_excluded`);
- imported IaC tree/blob identity;
- secret-scan verdict;
- plan artifact ID/hash derived from non-secret artifact bytes;
- config etag/state token if Railway exposes it;
- plan add/change/destroy counts;
- exact allowlisted planned changes;
- overall verdict and fail-closed code.

Never include rendered variable values, connection strings, usernames/passwords, tokens, secret-derived hashes, or credential-derived hostnames.

## Stable fail-closed codes

A future deterministic receipt evaluator should support at least:
- `C3D_OK`
- `C3D_TARGET_MISMATCH`
- `C3D_SOURCE_MOVED`
- `C3D_ENVIRONMENT_MOVING`
- `C3D_PATCH_MISSING_OR_CHANGED`
- `C3D_PATCH_UNRECONCILED`
- `C3D_UNEXPECTED_STAGED_CHANGE`
- `C3D_IMPORT_UNAUTHORIZED`
- `C3D_IMPORT_CONTAMINATED`
- `C3D_RESOURCE_CONTINUITY_UNPROVED`
- `C3D_SHADOW_DB_CHANGED`
- `C3D_PLAN_UNAUTHORIZED`
- `C3D_PLAN_STATE_DRIFT`
- `C3D_PLAN_DESTRUCTIVE_CHANGE`
- `C3D_PLAN_UNEXPECTED_CHANGE`
- `C3D_SECRET_NONOBSERVABILITY_UNPROVED`.

## No-retry rule

Do not automatically retry when:
- project/environment/service identity changes;
- source commit moves;
- deployment becomes non-terminal;
- staged patch changes;
- import output is contaminated;
- Railway requires variable values;
- plan state/etag drifts;
- a destructive/unexpected change appears;
- tool/API semantics are ambiguous.

Stop and require a new observation/review. A transient API transport failure may be reported, but a second live attempt still requires the authorization packet to permit retries explicitly.

## Exact future authorization packets

### Packet A — D0 observation only

`AUTHORIZE W09-C3D D0 RAILWAY STABLE-STATE OBSERVATION — read only the exact SEO ENGINE Railway project 52265e29-921b-4652-ac0d-9da4e5e69936, production environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298, and application service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90; capture deployment and staged-patch non-secret metadata and variable names only; no list_variables, values, secrets, logs, agent, config pull/plan/apply, patch mutation, deploy/redeploy/cancel, Neon/DB access, or retry on mismatch.`

### Packet B — D2 import only

May be issued only after D0 PASS and an explicit D1 reconciliation decision:

`AUTHORIZE W09-C3D D2 SECRET-SAFE IAC IMPORT — from the frozen canonical source and exact D0-certified Railway target/state, run exactly one Railway config pull without --include-variables into an isolated branch; preserve secrets only through Railway's opaque preservation mechanism; inspect for credential contamination and resource continuity; do not plan/apply, mutate the staged patch, deploy, read variable values/logs, access Neon/DB, or retry on contamination/drift.`

### Packet C — D3 plan only

May be issued only after D2 baseline review:

`AUTHORIZE W09-C3D D3 READ-ONLY IAC PLAN — against the exact reviewed imported IaC tree and frozen Railway target/state, run exactly one Railway config plan with values hidden and saved plan/state identity where supported; no --show-values, apply, destructive confirmation, patch mutation, deployment, variable mutation, Neon/DB access, or retry on drift/unexpected change.`

These packets are intentionally separate. Authorization for D0 does not authorize D2; D2 does not authorize D3; none authorizes mutation/apply.

## Relationship to C2Z/C2W

C3D only establishes a trustworthy Railway IaC baseline and plan discipline. It does not solve the external Neon association.

Even a perfect zero-drift IaC plan cannot prove the opaque `DATABASE_URL` points to the C3C declared Neon resource. C2Z/C2W remain blocked until a separately authoritative cross-side association and current Neon identity are available.

## Next milestone

After C3D merges, the next safe action is **D0 stable-state observation under explicit authorization**. If D0 passes, prepare the D1 staged-patch reconciliation decision. Do not jump directly to `config pull`.

## Hard exclusions

No Railway `config pull/plan/apply` execution in C3D, no staged-patch accept/discard/commit/revert, no deployment/redeploy/cancel, no variable values or secrets, no logs, no Railway agent, no Neon read/write, no DB/SQL, no migration, no Replit mutation, no scheduler/worker/provider activation, no DNS/cutover, no Stage 0, and no UGP integration.

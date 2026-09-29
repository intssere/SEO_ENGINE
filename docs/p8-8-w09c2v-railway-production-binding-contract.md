# P8.8 W09-C2V — Railway Production binding and deployment provenance contract

## Status

Repository-only specification. It grants no Railway, Replit, database, provider, credential, migration, activation, DNS, or cutover authority.

## Basis

Canonical main at specification start: `0fe98b33314726fc0685db283d1e7db70ebcfb16`.

The application is already Railway-ready through PR #303 / issue #302: one same-origin Express service serves the API and built SPA, startup recognizes the exact 34-table P3.6 baseline without DDL, legacy pilot auto-resume is default-off, and `/api/healthz` is the healthcheck.

W09-C2N is the pure sanitized binding-attestation verifier. W09-C2U is the dormant safe receipt adapter. Neither discovers infrastructure identity or approves provenance.

Current Replit Side R remains UNPROVED. C2V does not reinterpret or repair that result.

## Objective

For a future Railway Production runtime, make the infrastructure association an explicit certified input rather than infer it from a credential-bearing connection string.

Required chain:

```text
canonical GitHub commit/tree
        |
        v
Railway project + Production environment + service
        |
        v
Railway deployment + configuration revision
        |
        v
explicit database resource/binding association
        |
        +--> provider project / branch / database / endpoint / lineage
        |
        v
sanitized authoritative producer
        |
        v
W09-C2N verifier
        |
        v
W09-C2U safe receipt
```

## Railway identity tuple

A future Railway producer must independently establish, without reading or deriving identity from credential values:

- Railway project ID;
- Railway environment ID and an explicit Production designation;
- Railway service ID;
- Railway deployment ID;
- deployment terminal status;
- deployed canonical Git commit SHA and, when the platform exposes it authoritatively, tree/build identity;
- deployment/public URL;
- immutable configuration revision, deployment snapshot, or equivalent identifier that binds the deployment to its configured resources;
- observed-at timestamp.

A service name, domain, operator label, repository URL, or Git branch name alone is insufficient.

## Database binding tuple

The same authoritative evidence chain must identify the database resource actually configured for that exact deployment/configuration revision.

Minimum sanitized provider identity remains compatible with C2N:

- provider = Neon when Neon is the selected Production provider;
- provider project/resource ID;
- branch ID;
- database name;
- endpoint/compute ID;
- timeline/lineage ID, or separately certified immutable continuity semantics;
- Railway-side database binding/resource/reference ID;
- binding/configuration revision tying that resource to the exact Railway deployment.

The binding must be established from non-secret Railway/provider control-plane metadata. `DATABASE_URL`, PostgreSQL URLs, passwords, usernames, tokens, environment maps, credential-bearing hostnames, and derivatives are not evidence inputs.

## Producer trust boundary

The preferred producer is a read-only Railway control-plane operation or a trusted broker that can resolve the exact deployment's resource association internally and emit only sanitized identity.

The producer must:

1. select an exact project/environment/service/deployment;
2. resolve the exact database association from authoritative control-plane metadata;
3. never return credential material;
4. fail closed if association is missing or ambiguous;
5. expose an immutable/freshness-bounded binding/configuration revision;
6. identify its producer version and authority;
7. perform no DB connection or SQL;
8. perform no provider/public-site mutation.

C2V does not approve a provenance kind or authority. Approval remains a separate offline certification before any live C2N PASS is possible.

## C2N/C2U mapping

The Railway producer may carry Railway-specific envelope fields outside C2N only in a separately certified adapter. The object handed to C2N must remain the closed C2N schema.

Required mapping:

| C2N field | Future Railway source |
| --- | --- |
| replId | must not be falsified; a Railway-specific verifier evolution or certified platform-subject abstraction is required before live Railway PASS |
| deploymentId | authoritative Railway deployment ID after certified schema evolution/adapter |
| deploymentStatus | terminal successful Railway deployment state mapped deterministically to `success` |
| publicUrl | authoritative deployment/service URL |
| bindingRevisionId | Railway immutable binding/configuration/snapshot association |
| provider | authoritative bound provider identity |
| providerProjectId | provider control-plane project/resource ID |
| branchId | provider branch ID |
| databaseName | provider database identity |
| timelineId | provider lineage ID when available |
| endpointId | provider endpoint/compute ID |
| observedAt | producer observation time |

### Important schema constraint

Current C2N names the platform subject `replId`. C2V explicitly forbids putting a Railway project/service ID into `replId` merely to make the current verifier pass.

Before Railway can produce a live PASS, a repository-only successor must generalize the platform subject while preserving C2N's closed-schema, credential-rejection, provenance, freshness, binding, and lineage guarantees.

This is the next code milestone after C2V; it is not a live infrastructure action.

## Service separation

Initial Railway certification should keep the existing single web/API service as the only deployed application authority.

Scheduler and worker activation remain separate gates. They must not inherit Production mutation authority merely because the web/API deployment passes infrastructure certification.

Future topology:

```text
web/API        scheduler        workers
   |               |               |
   +---------------+---------------+
                   |
          certified Production DB
```

Each executable role requires an explicit enabled/disabled state and independently reviewed write/provider gates.

## Staged migration gates

### R0 — offline contract
C2V merged; generalized verifier successor designed and tested. No infrastructure action.

### R1 — read-only Railway inventory
Separately authorize observation of existing Railway project/environment/service/deployment/resource metadata only. No deployment or config changes.

PASS requires exact resource identities and evidence that the required non-secret association is exposed. Otherwise fail closed.

### R2 — staging/shadow certification
Separately authorize a Railway staging/shadow deployment from an exact canonical commit with all mutation/provider/scheduler/worker gates disabled.

No Production cutover. Database use must follow a separately approved staging database plan; do not point an untrusted staging deployment at Production merely to test connectivity.

### R3 — Production database binding certification
Separately authorize creation/selection of the intended Production binding and provider-side read-only identity corroboration. Produce the sanitized attestation and C2U receipt.

No migrations or Stage 0 until PASS.

### R4 — Production read-only preflight
Run a fresh C2H-equivalent read-only catalog/recovery/runtime preflight against the certified database under separate authorization. Exact schema/no-drift and recovery gates must pass.

### R5 — controlled migration/commissioning
Only after R4 PASS may required migrations be proposed under their own authorization packet. DDL remains distinct from attestation.

### R6 — Railway Production deployment
Deploy exact canonical source with default-off mutation/provider/scheduler/worker gates. Verify source provenance, health, auth/session behavior, and C2U binding receipt.

Replit remains serving/fallback; no DNS cutover yet.

### R7 — bounded Stage 0
Execute the separately certified first real Production operation with one-action limits and independent provider/storefront verification.

### R8 — traffic cutover
Only after R6/R7 certification may DNS/custom-domain traffic move from Replit to Railway under explicit authorization.

### R9 — progressive activation
Enable scheduler/workers/provider actions individually with their own gates and rollback criteria.

## Rollback contract

Until cutover is certified, Replit remains untouched and available as the serving fallback.

A Railway rollback must be able to:

- restore the last certified Railway deployment/configuration revision;
- disable scheduler/workers/provider mutations independently;
- preserve database lineage and avoid destructive database rollback;
- route traffic back to the last certified serving environment when necessary;
- retain sanitized deployment/binding receipts for audit.

Database rollback is not synonymous with application rollback. Schema/data rollback requires its own migration/recovery procedure and authorization.

## Fail-closed conditions

Stop without retry or inference when any of the following occurs:

- canonical Git source moved from the authorized identity;
- Railway deployment identity is ambiguous;
- Production environment/service identity is ambiguous;
- deployment-to-database association cannot be proven from authoritative non-secret metadata;
- credential material would need to cross the producer boundary;
- provider project/branch/database/endpoint/lineage cannot be independently established;
- binding/configuration revision is missing or stale;
- Railway and provider evidence disagree;
- C2N-successor verification is not PASS;
- C2U receipt is not PASS;
- recovery/read-only preflight is incomplete;
- any mutation/provider/scheduler/worker gate is unexpectedly enabled.

No automatic fallback to historical Replit/Neon IDs, environment labels, connection-string parsing, schema similarity, or operator assertion is allowed.

## Immediate engineering consequence

C2V intentionally discovers a required code change before any Railway Production action: the C2N platform subject must be generalized from Replit-specific `replId` to an explicit platform-neutral subject without weakening its safety properties.

That successor should be repository-only and backward-compatible for existing historical C2N evidence. It must not authorize Railway deployment or approve a live producer.

## Hard exclusions

C2V performs no Railway project/service/environment mutation, deployment, domain/DNS change, environment/Secrets change, Replit action, Neon/provider inspection, DB connection, SQL, DDL/DML/migration, OAuth callback change, scheduler/worker/provider activation, Stage 0, Production cutover, or UGP reconciliation/merge.

# P8.8 W09-C3C — Railway IaC offline implementation + deterministic binding manifest

## Status

Repository-only implementation. No live Railway or Neon action is authorized or performed.

## Implementation

C3C adds:
- `p8-8-w09c3c-binding-manifest.ts`: pure deterministic builder/verifier for a closed, non-secret desired-state manifest;
- synthetic tests integrated through the existing API-server test glob;
- `.railway/railway.c3c-scaffold.ts`: deliberately **non-applicable** scaffold. It imports no Railway SDK and exports no Railway project.

The scaffold is intentionally not named `railway.ts`. C3C therefore cannot be mistaken for an apply-ready IaC transition.

## Manifest semantics

Schema: `p8-8-w09c3c-v1`.

The manifest pins the already-observed Railway project/environment/service IDs and declares only intended Neon identity:
provider, project, branch, database, endpoint ID, timeline ID, and stable provider resource ID.

`manifestId` is SHA-256 over a deterministic canonical serialization of those non-secret fields and schema version. It is not derived from a URL, hostname, credential, environment value, or secret.

A PASS means only: **the desired-state declaration is syntactically complete, deterministic, non-secret, and targeted at the frozen Railway runtime identity.**

It does not mean:
- Railway `DATABASE_URL` resolves to that Neon resource;
- the Neon identity is currently authoritative;
- a Railway deployment consumed the declaration;
- C2Z or C2W may PASS.

## Fail-closed behavior

The verifier rejects:
- unsupported schema;
- unknown fields;
- credential-shaped keys/values recursively;
- URLs and hostname-shaped identity material;
- wrong Railway project/environment/service;
- provider other than Neon;
- incomplete provider identity;
- missing timeline/lineage;
- altered or missing manifest ID.

Receipts never echo rejected credential-shaped material.

## No historical Neon promotion

C3C contains no historical candidate Neon project, branch, endpoint, or timeline values as certified identity. Tests use explicitly synthetic identifiers.

## IaC adoption boundary

The scaffold freezes the future target but remains `applicable:false`.

Before an actual `.railway/railway.ts` may be introduced:
1. existing staged Railway patch must be reconciled;
2. live import baseline must be separately authorized and reviewed;
3. imported secret values must remain `preserve()`;
4. exact Neon identity must be independently certified;
5. external cross-side binding mechanism must be available or the provenance gap remains fail-closed;
6. exact plan must be reviewed and pinned;
7. apply requires separate explicit mutation authorization.

## CI

No Railway SDK or Railway workflow is added. Existing workspace CI automatically executes the new synthetic test because API-server tests already include `src/lib/*.test.ts`. Typecheck likewise covers the implementation.

## Next milestone

**W09-C3D — live-safe IaC import/preflight authorization design.**

C3D should define the exact bounded authorization packet for staged-patch reconciliation plus a secret-safe `config pull`/read-only plan acquisition. It must not execute that live step without fresh explicit authorization.

## Hard exclusions

No Railway SDK installation, `config pull`, `config plan`, `config apply`, staged-patch mutation, deployment/redeploy, variable value/secret read, Neon live access, DB/SQL, migration, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.

# P8.8 W09-C3E — Certified Railway IaC baseline persistence + external-Neon binding advancement

## Status

Repository-only certification record and next-gate design. No Railway, Neon, database, Replit, provider, scheduler, worker, DNS, or public-site mutation is authorized or performed by C3E.

Canonical base: `2edd11a1fb6a001cfce68d401b4587e2fa7346a4`.

## Purpose

C3D completed the bounded live-safe Railway IaC baseline workflow. C3E persists only sanitized, non-secret evidence from D0–D3 and defines the next exact provenance problem without promoting opaque credentials or historical Neon candidates into certified identity.

## C3D certified result

### D0 — stable-state observation

PASS for stable control-plane state.

Frozen Railway target:
- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` / `production`
- application service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` / `seo-engine-shadow`
- repository/branch: `intssere/SEO_ENGINE` / `main`
- canonical source commit: `2edd11a1fb6a001cfce68d401b4587e2fa7346a4`

The latest observed application deployment was terminal `FAILED`. This was sufficient only to establish stable control-plane state for C3D. It is not successful deployment certification.

The Railway-managed Postgres shadow service and persistent volume remained present and unchanged. They are not promoted to Production database authority.

### D1 — staged-patch reconciliation

PASS as a decision/reconciliation gate only.

The previously observed staged patch remained separate from C3D mutation authority. UI evidence established the single user-facing staged variable change as `AUTH_PUBLIC_ORIGIN` from unset to the public Railway application origin. Environment metadata represented this as an application resource update plus variable set.

C3D did not deploy, accept, discard, revert, or otherwise mutate this patch.

### D2 — secret-safe IaC import

PASS.

Exactly one authorized `railway config pull` was executed without `--include-variables`.

The imported TypeScript baseline:
- preserved `seo-engine-shadow`;
- preserved Railway-managed `Postgres`;
- preserved `postgres-volume` at 50000 MB in `europe-west4-drams3a`;
- preserved the application source/build/healthcheck/replica topology;
- represented all imported application variables, including `DATABASE_URL`, only as `preserve()`;
- contained no literal connection string, password, token, secret, credential-derived hostname, migration command, scheduler/worker activation, provider-write activation, or public-write activation.

Certified imported `.railway/railway.ts` SHA-256:

`F342D244C350D6109378651807BF6C70ECC6C37150C29A858D249C36FDE89818`

The import was performed in an isolated disposable working directory rather than committed directly to the repository. C3E therefore persists the evidence and hash, not the live-imported file as canonical apply-ready IaC.

### D3 — read-only IaC plan

PASS with `C3D_OK`.

Execution prerequisites:
- Railway CLI `5.62.1`
- Railway TypeScript IaC SDK `3.12.0`
- Node ESM mode
- exact verified CLI executable supplied process-locally for the SDK compatibility check
- input `railway.ts` hash unchanged from D2

The successful plan reported:
- kind: `railway.config.plan`
- version: `1`
- CLI version: `5.62.1`
- environment ID: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- source tree: `sha256:dfa2b6ac6c4491c06d1793c1c0e7ee996899f39cee3c27b7747830b45ea1f6ca`
- config etag: `54374c11f22902bc0ecee0e9b247bfcf0c7d325653474b484d2b4d0112f97f49`
- change-set hash: `sha256:afd0e2a6e0e497acf5a7048efbe8788a610c0e7a6e1e8c770eb0be917276676f`
- changes: none
- diagnostics: none
- diff: `No changes.`
- destructive: `false`
- claim: `true`
- declared resources:
  - `service.seo-engine-shadow`
  - `database.Postgres`
  - `volume.postgres-volume`

Saved plan artifact SHA-256:

`E1545D064EF4B72AF3C0BD859D21BB85EE5F84323305CCF858AA21F19E6D6454`

No `config apply` occurred.

## What C3D now proves

C3D establishes that the secret-safe imported Railway IaC baseline describes the IaC-visible Railway environment without unintended drift at the certified config etag.

It proves deterministic baseline/resource continuity at the IaC layer for the declared app, Railway Postgres shadow database, and volume.

It does **not** prove:
- the latest application deployment is successful;
- the staged `AUTH_PUBLIC_ORIGIN` patch was applied or discarded;
- `DATABASE_URL` points to Neon;
- any Neon project/branch/database/endpoint/timeline identity;
- a Railway opaque-variable revision to external-provider-resource association;
- C2Z or C2W provenance PASS.

## External-Neon binding gap

The remaining provenance join is exactly:

```text
Railway project/environment/service
  -> successful deployment + snapshot
  -> config/binding revision
  -> opaque DATABASE_URL slot/revision
  -> authoritative external Neon provider resource
  -> current Neon project/branch/database/endpoint/timeline
```

C3D supplies the Railway IaC/config-etag side only. `DATABASE_URL: preserve()` is intentionally non-observable and therefore cannot authenticate the external resource.

No historical Neon candidate identifier may be promoted merely because it resembles a connection target or prior deployment.

## Next bounded mechanism

The next milestone must seek a **non-secret authoritative association**, not inspect or fingerprint the credential.

Acceptable evidence classes remain:
1. Railway-native external-resource/reference metadata exposing a stable non-secret target resource ID and revision;
2. a Railway/platform attestation tying the exact opaque binding revision to an external provider resource ID;
3. a provider/platform signed receipt establishing the same association;
4. another independently reviewed mechanism that gives C2Z both `structuralReferenceTargetResourceId` and `providerResourceId` from authoritative, non-secret sources.

Separately, Neon control-plane evidence must certify current project, branch, database, endpoint/compute, timeline/lineage, provider resource identity, and recovery/PITR state.

The two sides must join without reading, rendering, hashing, parsing, redacting, or deriving identity from `DATABASE_URL`.

## C2Z/C2W advancement rule

C2Z remains fail-closed until all of these are authoritative:
- successful Railway deployment ID;
- Railway snapshot ID;
- binding revision ID;
- structural reference ID;
- structural reference target resource ID;
- provider = Neon;
- current provider project/branch/database/endpoint/timeline;
- provider resource ID;
- exact cross-side equality between structural target resource ID and provider resource ID.

Only a C2Z PASS may feed the platform-neutral C2W verifier under separately approved provenance/freshness context.

## Next milestone

**W09-C3F — authoritative external-binding association acquisition contract.**

C3F should inventory the currently available Railway and Neon non-secret control-plane surfaces against each required C2Z field and define the minimum missing evidence mechanism. It may perform repository research and read-only public/platform capability research.

Any live Railway observation beyond already-certified metadata, Neon control-plane call, variable/config revision inspection, support submission, deployment, patch mutation, IaC plan/apply, or database access requires its own explicit authorization.

## Hard exclusions

No Railway `config pull`, `config plan` rerun, `config apply`, staged-patch mutation, deploy/redeploy/cancel, variable values, `--show-values`, logs, shell/agent secret discovery, Neon live access, DB/SQL, migration, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.

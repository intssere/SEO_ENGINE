# P12.2-L1A-E7 — immutable runner release and live Railway execution packet

## Current state

Canonical source containing E6:

- commit: `bebcf8aba3c3f1a1790ce0937c3e954006229d61`
- tree: `439c01e603f5558b2d96ee4e31b74ff11a45d934`
- dedicated Dockerfile: `Dockerfile.p12-2-l1a-observation`

Railway Production binding:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` (`production`)
- Postgres service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`
- application service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`

The existing DB observation authorization remains unconsumed:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

No Production SQL has been executed.

## Phase 1 — immutable runner image release

The repository includes a manual-only workflow:

`.github/workflows/p12-2-l1a-e7-image-release.yml`

It has no push, pull-request, schedule, or repository-dispatch trigger.

The workflow is fixed to E6 source commit/tree above and publishes:

`ghcr.io/intssere/seo-engine-p12-2-l1a-observation:<SOURCE_SHA>`

with BuildKit provenance and SBOM enabled.

Required manual image-release authorization:

`AUTHORIZE:P12_2_L1A_E7_IMAGE_RELEASE:bebcf8aba3c3f1a1790ce0937c3e954006229d61`

A successful workflow run must produce and record an immutable digest:

`ghcr.io/intssere/seo-engine-p12-2-l1a-observation@sha256:<digest>`

The digest must be independently read back before any Railway runner creation.

Image publication is not authorized by merging this specification.

## E7 release receipt — completed

Manual workflow run `37015351377` completed successfully from canonical workflow commit:

- workflow commit: `f3a8f71ec6ec7fb6fcd8db94c5ef9419d4a2b85f`
- source commit: `bebcf8aba3c3f1a1790ce0937c3e954006229d61`
- source tree: `439c01e603f5558b2d96ee4e31b74ff11a45d934`
- Dockerfile: `Dockerfile.p12-2-l1a-observation`
- immutable image: `ghcr.io/intssere/seo-engine-p12-2-l1a-observation@sha256:864895fe47e4961d3cc4d8709cf21b0ca20bc69804779a21e4f1b8b598c18b0e`
- release authorization: `AUTHORIZE:P12_2_L1A_E7_IMAGE_RELEASE:bebcf8aba3c3f1a1790ce0937c3e954006229d61`

The release workflow passed authorization verification, exact-source checkout, source identity verification, GHCR login, attestation-capable Buildx initialization, immutable image build/push, and release-receipt emission.

Phase 1 is therefore complete. No Railway runner service was created and no Production SQL was executed by this release.

## Phase 2 — exact Railway mutation packet

Only after an immutable digest is certified may the live runner be created.

Target:

- project: exact project ID above;
- environment: exact Production environment above;
- new service name: `p12-2-l1a-observation-once`;
- source: exact immutable E7 image digest only;
- no GitHub repository source;
- no GitHub autodeploy;
- no public/custom domain;
- no volume;
- no cron;
- no pre-deploy command;
- restart policy: `NEVER`;
- no scheduler/worker binding;
- no application-service mutation;
- no Postgres-service mutation.

Because Railway image-service creation may immediately start the container, the initial image must remain fail-closed when required variables are absent. E6 satisfies this: missing required runtime variables fails before E5 executor invocation and therefore before SQL.

After service creation and before the only authorized execution, configure exactly:

- `P12_2_L1A_POSTGRES_SERVICE_ID=${{Postgres.RAILWAY_SERVICE_ID}}`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `P12_2_L1A_AUTHORIZATION_LITERAL=AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

Variable configuration must suppress automatic deployment where the Railway API supports that option. Configuration must be read back by variable **names/reference shape only**; secret values must not be printed into chat, issues, docs, or receipts.

Then perform exactly one explicit redeploy/start of the configured immutable image.

## Phase 3 — receipt collection

Observe the one deployment to a terminal state and collect bounded deploy logs.

A valid successful receipt must show:

- E6 version;
- E5 preflight receipt;
- exact E4 Railway binding;
- E3 query-set fingerprint;
- `productionSqlAttemptConsumed=true`;
- seven query receipts;
- `completed=true`;
- `stoppedAtOrdinal=null`;
- attempts = 1;
- retries = 0;
- fallback transport = false;
- no credential material.

The seven query outputs are then interpreted only by the already-certified L1A decision contract.

## Stop conditions before first SELECT

Stop without consuming the DB one-shot if any of these occur:

- immutable image digest unavailable or does not match certified release;
- wrong project/environment/service identity;
- unexpected existing service with the chosen runner name;
- source is not the exact immutable digest;
- any domain, volume, cron, scheduler, worker, or GitHub source appears;
- restart policy cannot be fixed to NEVER;
- reference variables cannot be bound exactly;
- E6/E5/E4 preflight failure;
- `psql` unavailable;
- authorization literal mismatch;
- any retry/fallback is configured;
- any credential would be printed or serialized;
- any unexpected Railway staged change affects existing services.

These failures leave the DB one-shot unconsumed.

## Stop conditions after first SELECT

Once the first certified SELECT is invoked, the DB one-shot is consumed.

From that instant:

- do not retry the deployment;
- do not redeploy the runner;
- do not restart the runner;
- do not create a second runner;
- do not replay any subset of queries;
- do not switch transports;
- do not run ad-hoc SQL.

If query 1–7 fails after invocation, collect the bounded failure receipt and stop for review. A new live authorization would be required for any subsequent DB attempt.

## Post-run disposition

After receipt collection:

- keep existing application and Postgres services unchanged;
- do not repurpose the runner;
- prevent automatic restart/redeploy;
- record the exact runner service/deployment/image digest and receipt in the repository;
- runner teardown/removal, if desired, is a separate destructive Railway mutation and requires explicit authorization.

## Explicit live authorization boundary

The future Railway authorization must name the exact immutable image digest produced by Phase 1. Do not authorize a tag-only image.

A suitable form after digest certification is:

`AUTHORIZE P12.2-L1A-E7 LIVE RAILWAY ONE-SHOT — project 52265e29-921b-4652-ac0d-9da4e5e69936; environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298; create disposable service p12-2-l1a-observation-once from exact immutable image ghcr.io/intssere/seo-engine-p12-2-l1a-observation@sha256:864895fe47e4961d3cc4d8709cf21b0ca20bc69804779a21e4f1b8b598c18b0e; restart NEVER; no domain/volume/cron/GitHub source/autodeploy; set only the exact Postgres reference variables and existing DB authorization literal with deploy suppression; verify config; execute exactly one deployment; collect secret-free receipt; zero retries/redeploys after first SELECT; no migration/crawl/provider/application/Postgres mutation.`

Generic `continue` is not this authorization.

# P12.2-L1A — current immutable runner and live Railway execution packet

## Canonical repository state

Current canonical main before E11 merge:

- commit: `707678a207aa659dbdbcaae80f111f15f7e5518f`
- tree: `69c381f29e20a1478393a79adeed5d01550040d3`

Railway Production binding remains:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` (`production`)
- Postgres service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`
- application service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`

The certified seven-query read-only fingerprint remains unchanged:

`6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

The approved site binding remains:

- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`
- canonical origin: `https://diamondshelf.us`

## Attempt 1 — consumed failure receipt

The original DB authorization literal was:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

That authorization is permanently consumed and must never be reused.

Disposable Railway service:

- name: `p12-2-l1a-observation-once`
- service ID: `4a2cdeb6-d435-4ad9-a31a-11b8e43bddc1`

Configured live deployment:

- deployment ID: `59f4bb30-6adb-4112-9372-da9eb465eb50`
- image: `ghcr.io/intssere/seo-engine-p12-2-l1a-observation@sha256:864895fe47e4961d3cc4d8709cf21b0ca20bc69804779a21e4f1b8b598c18b0e`

The E5 preflight succeeded and query ordinal 1 crossed the executor boundary, so:

- `productionSqlAttemptConsumed=true`
- query count observed: 1
- retries: 0
- fallback transport: false
- credential material recorded: false

The query did not establish a Production Postgres connection. The runner passed `DATABASE_URL` only as an environment variable named `DATABASE_URL`; `psql` did not consume it automatically and fell back to the local Unix socket.

No migration, crawl, provider action, application mutation, Postgres mutation, or successful Production SQL result occurred.

## E9 transport and replay repair

E9 changed only the runtime adapter and replay behavior:

- parse `DATABASE_URL` into explicit libpq `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` variables;
- do not put credentials into `psql` argv;
- remove `DATABASE_URL` from the child environment;
- preserve retries = 0 and fallback transport = false;
- after a bounded E5 receipt exists, exit the process successfully so platform process status does not replay a consumed attempt.

E9 merged in PR #782.

Canonical repaired source:

- commit: `b8e9ed767af8f344e43b7369a64767caf503f896`
- tree: `5e5a691937fefdc814741054498b531c47a39ae4`

## E10 repaired image release receipt

Manual workflow run `37027216565` completed successfully.

Released source:

- source commit: `b8e9ed767af8f344e43b7369a64767caf503f896`
- source tree: `5e5a691937fefdc814741054498b531c47a39ae4`
- Dockerfile: `Dockerfile.p12-2-l1a-observation`
- release authorization: `AUTHORIZE:P12_2_L1A_E10_IMAGE_RELEASE:b8e9ed767af8f344e43b7369a64767caf503f896`
- immutable image: `ghcr.io/intssere/seo-engine-p12-2-l1a-observation@sha256:de477773d34edf6d027a44ab8b25ea8a4482359655bd4f90fcbc3fbe96d310d7`

The workflow passed exact authorization, exact-source checkout, source identity verification, GHCR login, docker-container Buildx verification, provenance generation, SBOM generation, image push and immutable digest readback.

This E10 image proves the E9 runtime repair, but it still embeds the original V1 DB-authorization derivation and therefore must not be used for attempt 2.

## E11 fresh authorization generation

E11 preserves the E1 SQL, site binding, seven-command E2 plan and query-set fingerprint exactly.

It introduces this authorization-generation identity:

`attempt-2-after-e9-transport-repair`

The live authorization fingerprint is SHA-256 over the stable JSON object containing:

- `querySetFingerprint=6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`
- `authorizationGeneration=attempt-2-after-e9-transport-repair`

Expected fresh authorization fingerprint:

`744498635c3a55b0accf4eaefe25d81a43e14b501b6e4eb0045abf6f69a3509f`

Expected fresh live DB authorization literal:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT_V2:744498635c3a55b0accf4eaefe25d81a43e14b501b6e4eb0045abf6f69a3509f`

The consumed V1 literal must fail closed before executor invocation.

## Required sequence before attempt 2

1. Merge and CI-certify E11.
2. Release a new immutable observation-runner image from the exact E11 canonical source.
3. Record and independently read back the new immutable digest.
4. Prepare a fresh Railway packet bound to that new digest and the V2 DB authorization literal above.
5. Obtain separate explicit Railway one-shot authorization.
6. Re-read Railway skill and independently verify Production project/environment/service state.
7. Execute exactly one configured deployment.
8. Once query ordinal 1 is invoked, the V2 authorization is consumed; zero retries, redeploys, restarts, second runners, alternate transports, subset replays or ad-hoc SQL.

The E10 digest `sha256:de477773d34edf6d027a44ab8b25ea8a4482359655bd4f90fcbc3fbe96d310d7` is not eligible for attempt 2 because it predates E11 authorization generation.

## Railway runner contract for attempt 2

The eventual runner must preserve:

- exact project/environment/Postgres binding above;
- disposable one-shot service only;
- exact immutable image digest only;
- no GitHub source/autodeploy;
- no public/custom domain;
- no volume;
- no cron;
- no pre-deploy command;
- restart policy `NEVER`;
- no scheduler/worker binding;
- no application-service mutation;
- no Postgres-service mutation.

Configure only:

- `P12_2_L1A_POSTGRES_SERVICE_ID=${{Postgres.RAILWAY_SERVICE_ID}}`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `P12_2_L1A_AUTHORIZATION_LITERAL=AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT_V2:744498635c3a55b0accf4eaefe25d81a43e14b501b6e4eb0045abf6f69a3509f`

Variable configuration must suppress deployment where supported. Secret values must never be printed or serialized.

## Production DB interpretation contract

After exactly seven successful SELECTs:

- exact 34 public base tables + all three P12 tables absent + exact site binding => `eligible_for_migration_review`; stop and require separate migration authorization;
- exact 37 public base tables + exact P12 tables/columns/constraints/indexes + exact site binding => `migration_not_required`;
- anything else => fail closed.

Migration `0004_first_party_crawl_execution_state.sql` is never implicitly authorized.

Generic `continue` is not live Railway or Production DB authorization.

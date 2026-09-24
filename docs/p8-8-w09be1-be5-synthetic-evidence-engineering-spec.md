# P8.8 W09-BE1–BE5 — Synthetic Evidence Acquisition Engineering Specification

**Issue:** #499  
**Status:** SPECIFICATION / REVIEW ONLY — IMPLEMENTATION, PRODUCTION ACCESS, PROVIDER ACCESS, PERSISTENCE AND W10 BLOCKED

## 1. Purpose

W09-B review is merged and certified complete.

W09-BE1 through W09-BE5 define the engineering bridge needed **before** any real Stage 0 Production read can be authorized.

This engineering package must prove that the system can:

- describe one exact frozen SELECT-only query set;
- acquire bounded evidence from an explicit PostgreSQL URL without using ambient Production configuration;
- produce an immutable acquisition package with deterministic fingerprints;
- translate evidence-complete acquisition records into merged W09-A `supplied_real_snapshot` inputs offline;
- fail closed on missing W05/W07 schema/state, ambiguous Product identity, non-authoritative provider-before evidence, row-cap overflow and integrity drift;
- certify the adapter against synthetic/ephemeral PostgreSQL only;
- prove statically that the engineering package cannot call providers, mutate the database, persist Stage 0 results, bind runtime routes/workers, or activate W10.

This specification authorizes no Production/provider activity.

## 2. Canonical baseline

Specification base:
- canonical `main`: `882ec877e0f052f71c6dce3b15f352472b468f5e`;
- canonical tree: `6db5dcc0a85b25a8212b00c1b216aace11f85ac3`;
- W09-B review: issue #497 / PR #498;
- post-merge CI #1040: success;
- Replit exact Git-only reconciled to canonical main;
- W09-A already merged/certified and remains the only Stage 0 policy evaluator.

## 3. Package split

### W09-BE1 — frozen query-set and evidence contracts

Pure module only.

Defines:
- query descriptors;
- query-set fingerprint;
- acquisition request contract;
- immutable acquisition manifest;
- immutable raw candidate evidence records;
- candidate completeness states;
- per-query result fingerprints;
- whole-package fingerprint;
- safety/semantics capability markers.

No database/network dependency.

### W09-BE2 — explicit-URL read-only PostgreSQL acquisition adapter

Default-off module.

Properties:
- accepts a database URL as an explicit function/constructor argument;
- no `process.env`;
- no generic `DATABASE_URL` fallback;
- no import of `@workspace/db` because that package creates an ambient `DATABASE_URL` pool;
- direct `postgres` client with one connection;
- one transaction;
- `READ ONLY`;
- `REPEATABLE READ`;
- frozen query descriptors only;
- no arbitrary SQL API exported;
- no persistence;
- no provider/network dependency;
- no route/startup/scheduler/worker binding.

### W09-BE3 — offline translator

Pure module only.

Input:
- already-created immutable W09-B acquisition package;
- current exact W01 grant;
- canonical evaluation window.

Output:
- zero or more exact W09-A `P88W09ShadowItemInput` values with provenance `supplied_real_snapshot`;
- translation summary;
- deterministic translator/package fingerprints.

No DB/network access.

### W09-BE4 — synthetic PostgreSQL certification

Ephemeral/local PostgreSQL only.

Must verify:
- read-only/repeatable-read enforcement;
- frozen query execution;
- current 43-table W07 engineering schema;
- missing 0005/0006/0007 behavior;
- exact cardinality/row caps;
- ambiguous site/product behavior;
- W06 provider-observation validation;
- package determinism;
- zero DML/DDL from adapter;
- no Production connection.

### W09-BE5 — static safety certification

Prove:
- no provider adapter/fetch;
- no mutation SQL;
- no migration;
- no persistence;
- no runtime route/startup/scheduler/worker binding;
- no Task #51/#53/#54 runtime dependency;
- no public-write/policy-execution gate mutation;
- no W10 activation.

## 4. Engineering-only database boundary

BE2 may connect only when the caller explicitly supplies the URL.

The engineering module must never do:

```ts
process.env.DATABASE_URL
```

or:

```ts
import { db, pool } from "@workspace/db"
```

The intended engineering API shape is conceptually:

```ts
acquireP88W09BEvidence({
  databaseUrl,
  request,
  querySet,
})
```

The actual names may vary, but the semantics may not.

For BE4 CI, the only accepted database hostnames are:
- `127.0.0.1`;
- `localhost`.

The dedicated CI variable should be:

`P8_8_W09B_EPHEMERAL_DATABASE_URL`

The test must reject any non-localhost URL.

The expected CI database name is:

`seo_engine_test`

or a test-created disposable derivative whose name begins:

`seo_engine_w09b_`

The adapter itself must not create/drop databases.

## 5. Query descriptor contract

Each query descriptor is immutable and contains at minimum:

- `queryId`;
- `queryVersion`;
- `purpose`;
- canonical SQL text;
- normalized SQL hash;
- parameter schema;
- exact allowed tables;
- exact allowed columns;
- maximum invocations;
- maximum rows per invocation;
- maximum total rows;
- deterministic ordering description;
- mandatory/optional flag;
- expected cardinality semantics.

Each normalized SQL hash contributes to the query-set fingerprint.

A query-set fingerprint binds:
- W09-BE version;
- ordered query descriptors;
- SQL hashes;
- row caps;
- invocation caps;
- parameter schemas;
- purpose strings.

Changing any SQL text, column list, order, parameter, cap or optionality changes the query-set fingerprint.

## 6. SQL normalization

BE1 SQL normalization must be deterministic and narrow.

Recommended normalization:
- normalize CRLF to LF;
- trim leading/trailing whitespace;
- collapse runs of horizontal/line whitespace outside quoted literals to one space;
- preserve quoted string contents byte-exact;
- preserve parameter positions;
- preserve identifiers and operators;
- no SQL parsing/rewrite that changes semantics.

If a safe deterministic normalizer cannot prove quote handling, use exact reviewed SQL bytes for hashing instead.

Do not normalize SQL by executing it.

## 7. Frozen query set

The first engineering query set should have exactly these descriptors.

### Q00 — transaction identity

`w09b.transaction_identity.v1`

Purpose:
- prove the exact database/role/transaction mode/time/version.

Expected output: exactly 1 row.

Allowed expressions:
- `current_database()`;
- `current_user`;
- `current_setting('transaction_read_only')`;
- `current_setting('transaction_isolation')`;
- `transaction_timestamp()`;
- `version()`.

No table read.

Required checks:
- transaction_read_only = `on`;
- transaction_isolation semantically equals repeatable read;
- timestamp canonicalizable;
- exactly one row.

### Q01 — required schema preflight

`w09b.required_schema.v1`

Purpose:
- prove required tables/columns exist.

Allowed metadata sources only:
- `information_schema.tables`;
- `information_schema.columns`;
- `pg_catalog.pg_class` / `to_regclass` only if needed.

Maximum total rows: 256.

This query may observe schema metadata only.
It must not alter schema.

Required object groups:
- core site/page/opportunity/human-history objects;
- P3.6 observation/evidence objects;
- W04 reservation object;
- W05 control/claim objects;
- W07 dispatch/event objects.

Schema result must distinguish:
- `full_w07_schema`;
- `missing_w04`;
- `missing_w05`;
- `missing_w07`;
- `core_or_observation_missing`;
- `column_contract_mismatch`.

Only `full_w07_schema` may proceed to evidence-complete candidates.

### Q02 — site identity

`w09b.site_identity.v1`

Read:
- `sites.id`;
- `sites.domain`;
- `sites.canonical_origin`;
- `sites.platform`;
- `sites.is_active`;
- `sites.updated_at`.

Parameters:
- exact domain `diamondshelf.us`.

Filter:
- lower(domain) exact;
- canonical origin exact;
- platform exact `shopify`;
- active true.

Ordering:
- `id ASC`.

Maximum rows: 2.

Cardinality:
- exactly 1 required;
- 0 => abort;
- 2 => abort as ambiguous.

### Q03 — current mutation control

`w09b.control_state.v1`

Table:
- `policy_mutation_control_state`.

Read:
- `control_version`;
- `site_id`;
- `revision`;
- `previous_control_fingerprint`;
- `mode`;
- `effective_at`;
- `control_fingerprint`;
- `updated_at`.

Parameter:
- exact site UUID.

Maximum rows: 2.

Cardinality:
- exactly 1 required for complete candidates;
- 0 => `control_state_missing`;
- >1 => abort/integrity failure.

### Q04 — bounded source opportunities

`w09b.candidate_opportunities.v1`

Tables:
- `opportunities`;
- `pages`.

Read from opportunities:
- `id`;
- `site_id`;
- `page_id`;
- `query_id`;
- `opportunity_type`;
- `status`;
- `score`;
- `impact_estimate`;
- `effort_estimate`;
- `rationale`;
- `evidence_ids`;
- `created_at`;
- `updated_at`.

Read from pages:
- `id`;
- `site_id`;
- `url`;
- `normalized_url`;
- `path`;
- `page_type`;
- `indexable`;
- `last_seen_at`.

Filter:
- exact site ID;
- page must exist;
- path begins `/products/`;
- no policy-status inference beyond persisted values.

Ordering:
1. opportunity.updated_at DESC;
2. opportunity.id DESC.

Row request:
- `LIMIT 101`.

Semantic cap:
- maximum 100 scanned opportunities;
- 101st row means `query_cap_exceeded` and abort, not silent truncation.

Candidate selection:
- first 25 distinct page/opportunity source pairs in this deterministic order;
- this is a freshness/bounding order only, not policy priority or recommendation quality.

### Q05 — page snapshots

`w09b.page_snapshots.v1`

Table:
- `page_snapshots`.

Parameters:
- selected candidate page IDs, maximum 25.

Read:
- `id`;
- `page_id`;
- `observed_at`;
- `status_code`;
- `meta_description`;
- `canonical_url`;
- `content_hash`;
- `raw_signals`.

Ordering:
1. `page_id ASC`;
2. `observed_at DESC`;
3. `id DESC`.

Maximum rows:
- 4 snapshots per page;
- 101 rows total as overflow detector.

Page snapshots are descriptive evidence only.
They cannot establish provider-authoritative before state.

### Q06 — legacy evidence by explicit IDs

`w09b.legacy_evidence.v1`

Table:
- `evidence`.

Parameters:
- union of selected opportunities' `evidence_ids`.

Precondition:
- each opportunity may contribute at most 16 IDs;
- >16 => that candidate becomes `query_cap_exceeded` before query execution.

Maximum selected candidates:
- 25.

Maximum total evidence IDs:
- 400.

Read:
- `id`;
- `site_id`;
- `page_id`;
- `source`;
- `kind`;
- `observed_at`;
- `confidence`;
- `payload`;
- `provenance`;
- `created_at`.

Ordering:
- `id ASC`.

Maximum rows:
- 401 as overflow detector;
- >400 => abort/integrity failure.

### Q07 — normalized observations

`w09b.normalized_observations.v1`

Table:
- `seo_observation`.

Parameters:
- exact site ID;
- selected canonical URLs/page-derived URL identities.

Allowed columns:
- `observation_id`;
- `schema_version`;
- `semantic_key`;
- `subject_kind`;
- `site_id`;
- `canonical_origin`;
- `url_id`;
- `canonical_url`;
- `observation_kind`;
- `material_value`;
- `value_fingerprint`;
- `evidence_set_fingerprint`;
- `source_kind`;
- `source_fingerprint`;
- `collector_id`;
- `provenance_fingerprint`;
- `confidence`;
- `observed_at`;
- `fresh_for_ms`;
- `stale_after`;
- `retention_class`;
- `record_fingerprint`.

Ordering per canonical URL:
1. observed_at DESC;
2. observation_id DESC.

Maximum:
- 8 observations per candidate;
- 201 total rows as overflow detector.

If more than 8 potentially relevant observations exist for one candidate, mark it incomplete rather than silently choosing beyond the cap.

### Q08 — normalized evidence references

`w09b.normalized_evidence.v1`

Tables:
- `seo_observation_evidence`;
- `seo_evidence`.

Parameters:
- selected observation IDs from Q07.

Read:
- observation/reference linkage;
- all exact evidence identity/fingerprint/quality/availability/provenance fields needed by P3.6 integrity verification.

Ordering:
1. observation_id ASC;
2. evidence/reference fingerprint ASC.

Cap:
- maximum 16 evidence refs per observation;
- maximum 3,200 rows for 25 * 8 * 16;
- fetch one overflow detector row where technically useful.

If required provenance would be truncated, mark affected candidate incomplete.

### Q09 — policy reservations

`w09b.policy_reservations.v1`

Table:
- `policy_mutation_reservations`.

Parameters:
- exact site ID;
- selected exact Product GIDs when known;
- bounded reference window.

Read only the fields frozen by W04/W09-B review:
- reservation/policy/evaluation/materialization/proposal/recommendation identities/fingerprints;
- target/provider/domain/action/field/scope;
- before/after fingerprints;
- policy action identity;
- status;
- authorized/expiry/claimed/terminal timestamps/reason;
- created/updated timestamps.

Maximum rows:
- 101.

>100 => `mutation_history_incomplete`.

### Q10 — policy claims

`w09b.policy_claims.v1`

Table:
- `policy_mutation_claims`.

Read:
- exact claim identity/fingerprint;
- reservation identity;
- policy action identity;
- site/control revision/fingerprint;
- target;
- before/after fingerprints;
- claimed/created timestamps.

Maximum rows:
- 101.

Optional when there is no matching policy history.
Required when reservation/dispatch history references a claim.

### Q11 — policy dispatches

`w09b.policy_dispatches.v1`

Table:
- `policy_mutation_dispatches`.

Read:
- exact lineage IDs/fingerprints;
- site;
- policy identity;
- target/provider/domain/action/field/scope;
- before/after fingerprints;
- state/revision;
- forward/rollback attempt counts;
- public-write/rollback occurrence;
- verification fingerprint;
- reserved/dispatch/rollback/terminal timestamps;
- terminal reason.

Maximum rows:
- 101.

>100 => `mutation_history_incomplete`.

### Q12 — policy dispatch events

`w09b.policy_dispatch_events.v1`

Table:
- `policy_mutation_dispatch_events`.

Parameters:
- dispatch IDs returned by Q11.

Read:
- event identity/fingerprint;
- dispatch/site;
- from/to revision/state;
- transition reason;
- public-write/rollback occurrence;
- effective timestamp.

Ordering:
1. dispatch_id ASC;
2. to_revision ASC;
3. event_fingerprint ASC.

Maximum rows:
- 1,001.

>1,000 => `mutation_history_incomplete`.

### Q13 — human action/plan history

`w09b.human_actions.v1`

Tables:
- `action_plans`;
- `actions`.

Parameters:
- exact site ID;
- selected candidate page IDs.

Read only W09-B-reviewed fields.

Maximum rows:
- 101.

Optional.

### Q14 — human approvals

`w09b.human_approvals.v1`

Table:
- `approvals`.

Parameters:
- action-plan IDs returned by Q13.

Maximum rows:
- 101.

Optional.

### Q15 — human deployments

`w09b.human_deployments.v1`

Table:
- `deployments`.

Parameters:
- action-plan IDs returned by Q13.

Maximum rows:
- 101.

Optional.

### Q16 — human rollbacks

`w09b.human_rollbacks.v1`

Table:
- `rollbacks`.

Parameters:
- deployment IDs returned by Q15.

Maximum rows:
- 101.

Optional.

### Q17 — human verifications

`w09b.human_verifications.v1`

Table:
- `verifications`.

Parameters:
- deployment IDs returned by Q15 and candidate page IDs.

Maximum rows:
- 101.

Optional.

No other SQL query belongs to W09-BE v1.

## 8. SQL allowlist validation

BE1/BE5 must statically verify every frozen SQL descriptor:

Allowed leading operation:
- `SELECT` only.

Allowed transaction-control statements in BE2 internal code:
- `BEGIN`;
- `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`, or semantically equivalent read-only transaction API;
- `COMMIT`;
- `ROLLBACK`.

Forbidden anywhere in query descriptors:
- `INSERT`;
- `UPDATE`;
- `DELETE`;
- `MERGE`;
- `COPY`;
- `CREATE`;
- `ALTER`;
- `DROP`;
- `TRUNCATE`;
- `GRANT`;
- `REVOKE`;
- `COMMENT`;
- `VACUUM`;
- `ANALYZE`;
- `REFRESH`;
- `CALL`;
- `DO`;
- `LOCK`;
- `SELECT ... FOR UPDATE`;
- `SELECT ... FOR SHARE`;
- advisory-lock functions;
- `pg_sleep`;
- mutation-capable user functions.

The adapter exposes no generic `unsafe(sql)` function to callers.

Internal execution may use `sql.unsafe` only with compile-time/frozen SQL from BE1 descriptors plus separate bound parameter arrays.

## 9. BE2 transaction contract

BE2 must:

1. validate explicit URL;
2. create one `postgres` client with `max: 1`;
3. begin one transaction;
4. set/verify repeatable-read + read-only;
5. set local safety timeouts;
6. execute Q00 first;
7. verify read-only/isolation;
8. execute only descriptors needed by the deterministic acquisition flow;
9. build in-memory package;
10. finish transaction;
11. close connection;
12. return immutable package.

Safety timeouts:
- `statement_timeout = 5000ms`;
- `lock_timeout = 1000ms`;
- `idle_in_transaction_session_timeout = 30000ms`.

A timeout fails closed.

No retry against another database.
No automatic reconnect that restarts a partially completed acquisition.
Caller may explicitly start a fresh run after failure.

## 10. Acquisition request contract

BE1 request includes at minimum:

- acquisition request version;
- expected application SHA;
- expected application tree;
- expected query-set fingerprint;
- expected database identity descriptor;
- expected role identity;
- exact domain `diamondshelf.us`;
- exact canonical origin;
- exact platform `shopify`;
- exact W01 policy ID/version/fingerprint;
- acquisition reference time;
- maximum final candidates = 25;
- maximum opportunity scan = 100;
- providerNetworkReadAllowed = false;
- persistenceAllowed = false;
- W10ActivationAllowed = false.

Engineering/synthetic runs may use:
- environment class `synthetic_ephemeral`.

A real Production request class may be defined structurally but must not be executed until separately authorized.

## 11. Synthetic evidence package

The engineering fixture package must be a complete immutable object, not loose ad hoc rows.

Recommended top-level shape:

```ts
type P88W09BAcquisitionPackage = {
  version;
  packageId;
  packageFingerprint;
  request;
  querySet;
  transaction;
  site;
  policy;
  queryResults;
  candidates;
  summary;
  safety;
  semantics;
}
```

### 11.1 Transaction section

Contains:
- database identity;
- role identity;
- transaction reference time;
- database/server version;
- transactionReadOnly = true;
- transactionIsolation = `repeatable_read`;
- start fingerprint;
- completion fingerprint.

No password/connection string.

### 11.2 Site section

Contains exact:
- site UUID;
- domain;
- canonical origin;
- platform;
- active flag;
- source result fingerprint.

### 11.3 Query result envelope

For every executed query:
- query ID/version;
- descriptor fingerprint;
- invocation index;
- canonical parameter fingerprint;
- row count;
- row result fingerprint;
- overflow detected boolean;
- executedAt/reference transaction timestamp if needed.

Do not store SQL credentials/secrets.

### 11.4 Candidate raw evidence record

Each selected candidate contains:
- acquisition candidate ID;
- candidate acquisition fingerprint;
- opportunity row;
- page row;
- bounded page snapshots;
- bounded legacy evidence;
- bounded normalized observations;
- bounded normalized evidence refs;
- exact Product GID witness, if present;
- exact provider-before witness, if valid;
- current mutation-control row;
- bounded reservation/claim/dispatch/event history;
- optional human history;
- deterministic upstream reconstruction result/fingerprints;
- derived W01 current-state facts;
- completeness state;
- incomplete reasons.

### 11.5 Package summary

Contains counts only:
- opportunities scanned;
- selected candidate count;
- complete count;
- incomplete count by exact reason;
- query row counts;
- overflow count;
- provider-authoritative-before count;
- Product-GID-present count;
- policy-history-complete count;
- human-comparison-source count.

No:
- activation score;
- policy quality score;
- W10 recommendation;
- provider-write readiness score.

## 12. Package fingerprinting

Stable hashing rules must match project precedent:
- recursively sort object keys;
- preserve array order where order is semantically defined;
- canonical ISO timestamps;
- exact strings;
- SHA-256 lowercase hex.

Package fingerprint excludes only:
- package ID when derived from fingerprint;
- package fingerprint itself.

Recommended:
- `packageId = "p88w09b-package-" + fingerprint.slice(0,24)`.

Each candidate ID similarly derives from its candidate acquisition fingerprint.

## 13. Candidate completeness states

Engineering must implement exactly:

- `complete_for_w09a`;
- `missing_product_gid`;
- `missing_upstream_lineage`;
- `missing_required_evidence`;
- `provider_before_not_authoritative`;
- `provider_before_stale`;
- `control_state_missing`;
- `mutation_history_incomplete`;
- `quota_state_incomplete`;
- `cooldown_state_incomplete`;
- `manual_intervention_state_incomplete`;
- `rollback_state_incomplete`;
- `ambiguous_target_identity`;
- `query_cap_exceeded`;
- `integrity_failure`.

A candidate may have multiple ordered incomplete reasons.

`complete_for_w09a` requires zero incomplete reasons.

## 14. Product GID witness

The acquisition record must not infer Product GID.

A Product GID witness contains:
- exact GID;
- source record kind;
- source record ID;
- source fingerprint;
- source field/path;
- candidate URL binding evidence.

Validation:
- exact regex `^gid://shopify/Product/[1-9][0-9]*$`;
- source integrity passes;
- source site/domain matches;
- no Collection GID;
- no URL-derived synthesis.

Synthetic fixtures must include:
- valid Product witness;
- missing Product witness;
- Collection-GID witness;
- conflicting Product GID witnesses.

Conflicting valid Product GIDs => `ambiguous_target_identity`.

## 15. Provider-authoritative before witness

This is the most restrictive BE1 contract.

A persisted row must **not** become provider-authoritative based only on:
- `source_kind`;
- `observation_kind`;
- collector name;
- URL;
- matching text;
- crawl origin;
- storefront origin;
- confidence score.

For W09-BE v1, a provider-before witness is valid only when persisted evidence contains an exact serialized W06:

`P88W06ProviderObservation`

and all of these hold:

1. `assertP88W06ProviderObservationIntegrity` passes;
2. `version` is the certified W06 provider-observation version;
3. `status === "observed"`;
4. `siteId` equals candidate site;
5. `provider === "shopify"`;
6. `resourceKind === "product"`;
7. `resourceGid` equals exact Product GID witness;
8. `field === "meta_description"`;
9. `observedBeforeFingerprint` is non-null;
10. `requestProvenanceFingerprint` is non-null;
11. `providerDispatchAttempted === false`;
12. `providerMutationCalled === false`;
13. `providerWritePerformed === false`;
14. persisted container row integrity/provenance also passes;
15. observation timestamp is at/before acquisition reference time;
16. freshness contract proves not stale.

BE2 may inspect approved JSON fields for such a serialized object, but may not coerce arbitrary JSON into the type by filling missing fields.

If no valid W06 envelope exists:
- `provider_before_not_authoritative`.

If valid but stale:
- `provider_before_stale`.

Engineering must not add a provider call to repair the gap.

## 16. Freshness rule

If the persisted container is a P3.6 normalized observation:
- `stale_after` must exist and be after the acquisition reference time; or
- a certified `fresh_for_ms` + `observed_at` rule may deterministically compute the same result.

If both exist and disagree:
- integrity failure/incomplete.

For legacy evidence without an independently certified freshness contract:
- it cannot prove current provider-before freshness for W09-B v1.

## 17. Current-state derivation

BE1/BE3 may derive W01 current-state fields only from exact package evidence.

### mutationControlMode / fingerprint
From one exact Q03 row.

Missing => `control_state_missing`.

### otherActiveSiteMutationCount
From exact Q11 dispatch states classified as W07 blocking states.

No mutation/control change is performed.

### unresolvedManualIntervention
Derived from:
- W04 manual-intervention reservation;
- W07 manual-intervention dispatch;
- exact comparable human evidence when independently reconstructed.

Unknown history => incomplete, not false.

### unresolvedUncertainProviderWrite
Derived only from W07 states/events with possible/confirmed write and unresolved verification/closure.

### unresolvedRollbackFailure
Derived only from exact W07/human rollback history lacking safe verified closure.

### sameTargetCooldownSatisfied
Derived from exact same site/provider/Product GID/field prior mutation timestamps under the certified path semantics.

Unknown last-mutation timing => `cooldown_state_incomplete`.

### mutationQuotaRemaining
Derived from exact site mutation history in the 24-hour policy window.

Unknown/incomplete history => `quota_state_incomplete`.

### priorDeploymentCount
Count only exact target deployments/mutations.
Created plans/actions are not deployments.

## 18. Deterministic upstream reconstruction

BE3 does not invent a recommendation persistence table.

For each candidate:
- use existing certified pure upstream functions;
- rebuild any required P9.7 recommendation/proposal lineage from persisted opportunity/evidence inputs;
- verify exact fingerprints;
- carry the reconstructed artifacts in the package/translation output only.

If the repository cannot reconstruct exact lineage from approved package evidence:
- `missing_upstream_lineage`.

No fallback AI generation.
No free-form rewrite.
No persistence.

## 19. Offline translator contract

BE3 must accept only an immutable package that passes independent package integrity verification.

For each `complete_for_w09a` candidate it produces:

- W09-A source:
  - system = exact W09-B translator system constant;
  - version = exact W09-B translator version;
  - sourceId derived from acquisition candidate ID;
  - provenance = `supplied_real_snapshot`;
  - W09-A source fingerprint generated by the existing W09-A helper;
- exact current W01 grant;
- exact W01 candidate;
- exact reference time;
- exact evaluation expiry;
- exact W01 evaluation generated offline;
- optional independently reconstructed P8.6 human ledger.

The translator then may call:
- `buildP88W09ShadowDecision`;
- `buildP88W09ShadowSession`.

W09-A must perform its existing independent W01 recomputation again.

BE3 never converts an incomplete acquisition record into W09-A input.

## 20. Acquisition package integrity verifier

BE1 must expose:
- issue-list verifier;
- throwing assertion helper.

It must detect at minimum:
- package version drift;
- package fingerprint mismatch;
- query-set fingerprint mismatch;
- descriptor drift;
- result row fingerprint mismatch;
- site identity mismatch;
- duplicate candidate IDs;
- candidate fingerprint mismatch;
- query cap overflow;
- query not in frozen set;
- missing mandatory query;
- invalid Product GID witness;
- invalid W06 provider observation;
- stale provider observation;
- current-state derivation mismatch;
- summary mismatch;
- safety/semantics marker mismatch.

## 21. BE2 capability markers

Recommended BE2 capability object:

- explicitDatabaseUrlOnly = true;
- ambientDatabaseUrlUsed = false;
- databaseReadPerformed = true;
- databaseWritePerformed = false;
- schemaReadPerformed = true;
- schemaMutationPerformed = false;
- transactionReadOnlyRequired = true;
- repeatableReadRequired = true;
- rowLockPerformed = false;
- advisoryLockPerformed = false;
- providerNetworkReadPerformed = false;
- providerWritePerformed = false;
- publicSiteReadPerformed = false;
- publicSiteWritePerformed = false;
- persistencePerformed = false;
- w03ToW07AuthorityCreated = false;
- schedulerActivated = false;
- workerActivated = false;
- deploymentPerformed = false;
- publicationPerformed = false;
- w10ActivationAuthorized = false.

These markers are descriptive evidence, not the only safety proof.

## 22. BE4 ephemeral PostgreSQL design

BE4 must not use Production-like remote URLs.

### Dedicated environment variable

`P8_8_W09B_EPHEMERAL_DATABASE_URL`

Rules:
- hostname localhost/127.0.0.1 only;
- test DB name `seo_engine_test` or `seo_engine_w09b_*`;
- no generic `DATABASE_URL` fallback.

### Full-schema case

Start from exact current W07 engineering schema:
- 43 public base tables.

Seed synthetic rows only in ephemeral DB.

Run BE2.
Assert:
- no table count change;
- no row mutation after acquisition;
- package deterministic;
- read-only/repeatable-read proven.

### Missing-schema cases

Test harness, not BE2, may create disposable localhost databases with controlled schema states.

Required:
- core/P3.6 only, missing W04/W05/W07;
- W04 present, W05/W07 missing;
- W05 present, W07 missing;
- full W07.

BE2 must:
- report incomplete/blocked schema state;
- never apply migrations;
- never create missing tables;
- never synthesize control/dispatch state.

### Read-only enforcement case

Use a PostgreSQL role whose transaction is read-only or validate transaction read-only setting.

Attempted mutation through any accidental path must fail.

The test harness may independently attempt a sentinel write to prove the role/transaction blocks it; that sentinel write is test-only and not part of BE2.

### Row-cap cases

Synthetic fixture must test:
- 100 opportunities accepted;
- 101st causes overflow/abort;
- 16 evidence IDs per candidate accepted;
- 17 marks candidate incomplete;
- 8 normalized observations per candidate accepted;
- 9 marks candidate incomplete;
- policy-history caps;
- dispatch-event cap.

### Identity cases

Test:
- zero active Diamond Shelf site => abort;
- two active matching sites => abort;
- wrong platform => abort;
- wrong canonical origin => abort;
- Product GID missing;
- Collection GID;
- conflicting Product GIDs.

### Provider-before cases

Test exact serialized W06 observation:
- valid/fresh => provider-authoritative witness;
- tampered observationFingerprint => incomplete/integrity failure;
- status unavailable => not authoritative;
- wrong Product GID => not authoritative;
- null request provenance => not authoritative;
- stale container => stale;
- arbitrary source_kind='provider' without W06 envelope => not authoritative;
- crawler meta description equal to W06 raw text => still not authoritative.

## 23. No-new-migration rule

BE1–BE5 implementation must not add:
- migration 0008;
- any W09-B schema;
- any persistent evidence table.

The engineering package should work against existing synthetic versions of the reviewed schemas.

Any future persistent Stage 0 evidence store is outside scope.

## 24. Static runtime-isolation proof

BE5 static tests must verify:

### Pure BE1/BE3 modules contain no:
- `postgres`;
- `pg`;
- `drizzle`;
- `process.env`;
- `fetch`;
- Express imports;
- provider adapters;
- filesystem persistence APIs;
- runtime route/startup imports.

### BE2 contains:
- `postgres` only;
- no `process.env`;
- no `fetch`;
- no Shopify/provider adapter import;
- no Express import;
- no scheduler/worker import;
- no Task #51/#53/#54 runtime import;
- no W03/W04/W05/W06/W07 mutation-store import;
- no `@workspace/db` ambient pool import.

### Repository binding scan
No non-test startup/router/worker/scheduler source may import W09-B acquisition modules.

### SQL scan
All query descriptors SELECT-only.
No forbidden SQL token/pattern.
No lock clause.

### Migration scan
No W09-B migration file.

## 25. Synthetic evidence fixture package

The implementation should include one canonical deterministic fixture builder.

Minimum happy-path fixture:

Site:
- exact Diamond Shelf Shopify site.

Opportunity/page:
- Product URL;
- real-shaped persisted opportunity;
- <=16 evidence IDs.

Product GID:
- exact `gid://shopify/Product/123456789` witness.

Provider-before:
- exact integrity-valid W06 `P88W06ProviderObservation`;
- status observed;
- exact Product GID;
- field meta_description;
- non-null request provenance fingerprint;
- exact W02-domain before fingerprint;
- fresh normalized container.

Current control:
- one W05 control row;
- mode running;
- stable revision/fingerprint.

History:
- no active blocking dispatch;
- no unresolved manual intervention;
- no uncertain provider write;
- no rollback failure;
- quota remaining 1;
- cooldown satisfied;
- prior deployment count 0.

Upstream:
- deterministic recommendation/proposal lineage sufficient to reconstruct W01 candidate.

Expected:
- `complete_for_w09a`;
- BE3 emits one W09-A item;
- W09-A independently recomputes W01;
- session deterministic.

The fixture must also produce targeted invalid variants without changing unrelated fields.

## 26. Required engineering certification matrix

At minimum:

1. BE1 query-set fingerprint deterministic.
2. descriptor order deterministic.
3. changing SQL changes query-set fingerprint.
4. changing row cap changes query-set fingerprint.
5. package fingerprint deterministic.
6. package tamper detected.
7. candidate tamper detected.
8. query-result tamper detected.
9. missing mandatory query detected.
10. unexpected query ID detected.
11. BE2 requires explicit URL.
12. BE2 rejects non-localhost URL in BE4.
13. BE2 never reads `process.env.DATABASE_URL`.
14. transaction is read-only.
15. transaction is repeatable read.
16. Q00 exactly one row.
17. missing W04 detected.
18. missing W05 detected.
19. missing W07 detected.
20. missing core/P3.6 detected.
21. no migration applied.
22. exact one site accepted.
23. zero site aborts.
24. two sites abort.
25. wrong platform aborts.
26. opportunity 100 cap boundary.
27. opportunity 101 overflow abort.
28. 16 legacy evidence IDs boundary.
29. 17 evidence IDs incomplete.
30. 8 normalized observations boundary.
31. 9 observations incomplete.
32. Product GID exact accepted.
33. missing GID incomplete.
34. Collection GID rejected/incomplete.
35. conflicting GIDs ambiguous.
36. arbitrary provider label without W06 envelope not authoritative.
37. valid W06 persisted envelope accepted.
38. tampered W06 envelope rejected.
39. unavailable W06 envelope not authoritative.
40. wrong Product GID W06 envelope not authoritative.
41. null request provenance not authoritative.
42. stale W06 container rejected as stale.
43. equal crawler text does not create provider authority.
44. control row missing incomplete.
45. control running mapped exactly.
46. pause/drain/kill preserved into W01 state.
47. blocking W07 dispatch increments concurrency.
48. manual intervention preserved.
49. uncertain write preserved.
50. rollback failure preserved.
51. quota history exact.
52. unknown quota incomplete.
53. cooldown history exact.
54. unknown cooldown incomplete.
55. prior deployment exact.
56. created action without deployment not counted.
57. optional human evidence target-bound only.
58. package contains no secret/connection string.
59. BE3 rejects package integrity failure.
60. BE3 skips incomplete candidates.
61. BE3 emits supplied_real_snapshot only.
62. BE3 cannot emit production_read_snapshot.
63. BE3 source IDs/fingerprints deterministic.
64. W09-A accepts valid translated candidate.
65. W09-A independently recomputes W01.
66. translated session deterministic.
67. adapter does not mutate row counts.
68. adapter does not change table count.
69. adapter performs no provider/public-site network call.
70. adapter performs no persistence.
71. no W03 authorization created.
72. no W04 reservation created/mutated.
73. no W05 claim/control mutation.
74. no W06 provider call/preflight.
75. no W07 dispatch/rollback.
76. no Task #51/#53/#54 execution.
77. no route/startup binding.
78. no scheduler/worker binding.
79. no migration file.
80. no W10 activation.

## 27. CI integration

Future implementation should add a dedicated CI step after the W07 PostgreSQL gate and before generic workspace tests.

Recommended step:

`Test P8.8 W09-B synthetic read-only acquisition certification`

Environment:
- `P8_8_W09B_EPHEMERAL_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/seo_engine_test`.

The test harness may create/drop disposable localhost derivative databases for missing-schema cases.

After the dedicated W09-B test:
- canonical `seo_engine_test` public base-table count must remain 43;
- no Production URL is present;
- generic workspace tests continue normally.

## 28. Implementation file boundary

Recommended files:

- `artifacts/api-server/src/lib/p8-8-w09b-evidence-contract.ts` — BE1 pure;
- `artifacts/api-server/src/lib/p8-8-w09b-readonly-acquisition.ts` — BE2;
- `artifacts/api-server/src/lib/p8-8-w09b-offline-translator.ts` — BE3 pure;
- `artifacts/api-server/src/lib/p8-8-w09b-test-fixture.ts` — synthetic package builder;
- `artifacts/api-server/src/lib/p8-8-w09b-evidence-contract.test.ts`;
- `artifacts/api-server/src/lib/p8-8-w09b-offline-translator.test.ts`;
- `artifacts/api-server/src/lib/p8-8-w09b-readonly-acquisition.ephemeral.test.ts`;
- `artifacts/api-server/src/lib/p8-8-w09b-static.test.ts`;
- package/CI script changes only as required for BE4.

No route.
No runner.
No CLI that defaults to Production.
No migration.

## 29. Failure taxonomy

Engineering should use explicit fail-closed codes.

Recommended hard-abort codes:
- `p88_w09b_database_url_required`;
- `p88_w09b_database_identity_mismatch`;
- `p88_w09b_role_identity_mismatch`;
- `p88_w09b_transaction_not_read_only`;
- `p88_w09b_transaction_isolation_invalid`;
- `p88_w09b_query_set_fingerprint_mismatch`;
- `p88_w09b_query_not_frozen`;
- `p88_w09b_site_cardinality_invalid`;
- `p88_w09b_schema_core_missing`;
- `p88_w09b_query_overflow_abort`;
- `p88_w09b_integrity_failure`;
- `p88_w09b_timeout`.

Candidate incomplete reasons remain the enum in §13.

Do not collapse safety failures into "no candidates".

## 30. Real-run separation

Merging BE1–BE5 later will **not** authorize:

- Production URL injection;
- Production SELECT;
- schema inspection;
- provider read;
- persistence;
- deployment.

A future real-run authorization must still name:
- exact BE1–BE5 merged SHA/tree;
- exact query-set fingerprint;
- exact Production project/environment/database;
- exact read-only role;
- exact bounded one-shot run parameters;
- external evidence destination.

## 31. Provider-read addendum remains separate

If a future DB-only real run is incomplete because no valid persisted W06 provider observation exists, stop.

Do not:
- import W06 Shopify reader into BE2;
- load Shopify credentials;
- call GraphQL;
- call storefront;
- perform W06 preflight.

A provider-read-only addendum remains separately reviewed and authorized.

## 32. W10 remains blocked

BE1–BE5 engineering evidence cannot:
- open public-write gates;
- enable policy mutation execution;
- activate scheduler/worker;
- create reservation/authorization/dispatch;
- recommend activation as a machine decision.

W10 remains a separate human authorization package.

## 33. Explicit non-authorization

This specification authorizes no:
- BE1–BE5 implementation;
- Production database connection/read/schema inspection;
- provider/public-site read/write;
- Production persistence;
- migration/schema change;
- W03–W07 materialization/mutation;
- Task #51/#53/#54 execution;
- scheduler/worker/startup activation;
- credential/scope/config/gate change;
- deployment/publication;
- real Stage 0 run;
- provider-read addendum;
- W10.

## 34. Next explicit engineering boundary

After this specification is merged and certified:

**Implement W09-BE1 through W09-BE5 exactly as defined here, using synthetic/ephemeral evidence only, explicit localhost-only PostgreSQL certification, and zero Production/provider access.**

That implementation still does not authorize a real W09-B Stage 0 Production read.

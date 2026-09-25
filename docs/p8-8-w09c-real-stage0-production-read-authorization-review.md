# P8.8 W09-C — First Real Stage 0 Production Read-Only Evidence Run Authorization Review

**Issue:** #509  
**Status:** REVIEW / AUTHORIZATION PACKAGE ONLY — REAL PRODUCTION CONNECTION BLOCKED

## 1. Purpose

W09-A, W09-B review, and W09-BE1–BE5 engineering are merged and certified.

W09-C defines the exact authorization package required before the first one-shot real Stage 0 evidence acquisition can connect to Production.

This document does **not** authorize a Production database connection, schema inspection, SELECT, provider read, persistence, migration, deployment, runtime activation, or W10.

## 2. Certified engineering baseline

The only implementation eligible for a future W09-C run is:

- canonical main: `261b9155ce9aa93fb468040c17cf55cb6172a46c`;
- canonical tree: `7fdd257f58992c2ae30ea512fd4e4b84f8ff4547`;
- implementation issue: #503;
- implementation PR: #504;
- certified implementation head: `e1162cf6c34991d313a01d153759a0751f93eddc`;
- post-merge CI: #1077 / run `36023252159` — success.

The merged W09-B query set is:

- version: `p8-8-w09b-query-set-v1`;
- descriptor count: `18`;
- exact query-set fingerprint:

`fd117eb142807ac982808bf3cd30f96009884b3c66366489875693e44103cabd`

Any change to canonical code, descriptor SQL, descriptor order, parameters, columns, row caps, invocation caps or ordering invalidates this authorization package until re-reviewed.

## 3. Canonical site binding

The repository's current Diamond Shelf production-capable site binding is recorded as:

- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin: `https://diamondshelf.us`;
- domain: `diamondshelf.us`;
- platform: `shopify`.

A future W09-C run must fail closed unless Q02 returns exactly one active Shopify site and:

- returned site ID = `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- returned canonical origin = `https://diamondshelf.us`;
- returned domain = `diamondshelf.us`;
- returned platform = `shopify`.

No alternate site UUID is accepted under this review.

## 4. Current blocking schema fact

Canonical project state currently records Production as **34 public tables**.

W09-BE2 requires the full W07 engineering schema and its Q01 preflight requires, among other objects:

- migration 0005:
  - `policy_mutation_reservations`;
- migration 0006:
  - `policy_mutation_control_state`;
  - `policy_mutation_control_events`;
  - `policy_mutation_claims`;
- migration 0007:
  - `policy_mutation_dispatches`;
  - `policy_mutation_dispatch_events`.

Those Production migrations have not been authorized/applied under the P8.8 engineering work.

Therefore, using the currently recorded canonical Production schema state, a W09-C real evidence run is **not execution-ready**.

Expected BE2 behavior against that state is fail-closed schema incompleteness, not migration or synthetic state.

### Consequence

Do not spend a Production connection merely to rediscover a schema gap already recorded in canonical project state.

Before any W09-C Production SELECT is authorized, the project needs a separate **Production schema readiness review** for migrations 0005/0006/0007.

That review does not itself authorize applying the migrations.

## 5. Remaining unresolved authorization fields

The repository does not currently establish all of these exact live values, and this review must not infer or inspect secrets/configuration to fill them.

A real-run authorization must name:

- Production hosting platform/project identity;
- exact environment name;
- exact database name;
- exact database host identity or sanctioned connection descriptor;
- exact read-only role identity;
- proof that the role cannot write;
- how the credential is injected explicitly into BE2 without logging it;
- external non-Production evidence-package destination;
- evidence-package retention/deletion policy;
- exact W01 shadow grant artifact/fingerprint;
- exact evaluation expiry window;
- exact operator identity/authorization record.

Passwords, tokens, secret refs and raw connection strings must not be written into GitHub issues, PRs, logs or evidence packages.

## 6. W01 shadow-grant binding

W01 does not define one ambient/current grant; grants are explicit immutable artifacts.

The future W09-C run must therefore use one exact pre-authorized shadow grant with:

- `policyStage = "shadow"`;
- `siteId = eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- `allowedDomain = diamondshelf.us`;
- `provider = shopify`;
- `requiredProviderScope = write_products`;
- `allowedResourceKind = product`;
- `allowedActionType = update_meta_description`;
- `allowedField = meta_description`;
- `allowedProposalGenerationMethod = p9.7_deterministic_preview`;
- `maximumEffectiveRisk = low`;
- concurrency limit = 1;
- mutation quota = 1 / 24 hours;
- same-target cooldown >= 336 hours;
- exact minimum evidence/quality thresholds;
- exact activation/expiry times;
- revoked = false;
- exact credential-profile descriptor ID;
- exact control-binding ID;
- exact activation actor ID;
- exact grant fingerprint.

The grant remains an evaluation artifact only. It does not enable provider access or public writes.

## 7. Additional pre-run binding check

The merged BE3 translator verifies policy identity but does not itself independently compare `grant.siteId` with `acquisitionPackage.site.siteId`.

Therefore the real-run package must include a certified pre-translation check:

`grant.siteId === acquisitionPackage.site.siteId === eb1da9ee-539c-4200-8f04-f64ccaea7768`

A future small hardening patch may internalize this check, but W09-C execution remains blocked until the equality is enforced and evidenced somewhere in the certified operator path.

Do not rely on matching domain text alone.

## 8. Exact one-shot scope

A future authorized real run is limited to:

- one Production database;
- one explicit read-only role;
- one canonical site;
- one BE2 acquisition;
- one database connection;
- one `READ ONLY / REPEATABLE READ` transaction;
- maximum 100 source opportunities scanned;
- maximum 25 final candidates;
- exactly the 18 frozen W09-B queries;
- one offline BE3 translation;
- one W09-A shadow session;
- no recurrence;
- no scheduler;
- no worker;
- no automatic retry.

A failed/aborted run requires a new explicit decision before another Production attempt.

## 9. Database transaction requirements

The future run must use BE2 exactly as merged:

- explicit database URL argument;
- no `process.env.DATABASE_URL`;
- no ambient `@workspace/db` pool;
- direct `postgres`;
- one reserved connection;
- `READ ONLY`;
- `REPEATABLE READ`;
- statement timeout 5 seconds;
- lock timeout 1 second;
- idle-in-transaction timeout 30 seconds;
- no row locks;
- no advisory locks;
- no DML;
- no DDL;
- no arbitrary caller SQL;
- no migration;
- no automatic reconnect to another database.

Q00 must prove the database name, role, read-only flag and isolation level before substantive evidence acquisition proceeds.

## 10. Frozen SQL boundary

Only the merged W09-B query descriptors may execute:

- Q00 transaction identity;
- Q01 required schema;
- Q02 site identity;
- Q03 mutation control;
- Q04 candidate opportunities;
- Q05 page snapshots;
- Q06 legacy evidence;
- Q07 normalized observations;
- Q08 normalized evidence;
- Q09 reservations;
- Q10 claims;
- Q11 dispatches;
- Q12 dispatch events;
- Q13 human actions;
- Q14 approvals;
- Q15 deployments;
- Q16 rollbacks;
- Q17 verifications.

No ad hoc SQL is permitted during the session.

The operator must independently attest the exact query-set fingerprint before connecting.

## 11. Provider-network boundary

The first W09-C run is provider-network-free.

Forbidden:

- Shopify Admin GraphQL;
- Shopify REST;
- storefront HTTP;
- public-site HTTP;
- W06 live provider preflight;
- any other network fetch used to repair evidence gaps.

Provider-authoritative before-state evidence is accepted only when persisted data contains an exact integrity-valid W06 `P88W06ProviderObservation` that passes the merged BE2 rules.

If none exists, the result is evidence-incomplete.

That outcome does not authorize a provider read.

## 12. Persistence boundary

The first W09-C run performs no Production persistence.

It must not:

- insert/update/delete Production rows;
- write a W09 session table;
- write a manifest table;
- create W03–W07 authority;
- change W05 control;
- mutate jobs/actions/deployments;
- apply migrations.

The raw acquisition package must be emitted outside Production.

## 13. Evidence-package destination blocker

The exact external evidence destination is not yet approved.

Before a real run, authorization must select one destination that is:

- outside the Production database;
- not a public repository;
- not logged with secrets;
- access-controlled;
- capable of preserving the immutable package hash.

The authorization must state:
- destination;
- retention period;
- who may access it;
- whether the raw package or only a redacted derivative is retained;
- deletion procedure.

Until this is named, W09-C execution remains blocked.

## 14. Pre-connection checklist

All items must be true before a connection is opened:

1. canonical Git SHA/tree equal the authorized SHA/tree;
2. working tree clean;
3. exact query-set fingerprint equals
   `fd117eb142807ac982808bf3cd30f96009884b3c66366489875693e44103cabd`;
4. descriptor count = 18;
5. Production schema readiness for W04/W05/W07 is independently certified;
6. exact Production project/environment/database named;
7. exact read-only role named;
8. write incapability independently proven;
9. explicit credential injection path reviewed;
10. exact W01 shadow grant artifact/fingerprint supplied;
11. grant site ID fixed to the canonical Diamond Shelf site;
12. external evidence destination approved;
13. no provider credential is loaded for the run;
14. no public-write/policy-execution gate is opened;
15. no scheduler/worker/runtime route is activated;
16. one-shot authorization text exactly matches the certified packet.

Any false/missing item means no connection.

## 15. Execution abort conditions

Once connected, abort immediately on:

- Q00 database identity mismatch;
- Q00 role identity mismatch;
- transaction read-only != on;
- isolation != repeatable read;
- Q01 schema mismatch;
- site cardinality != 1;
- site ID mismatch;
- canonical origin/domain/platform mismatch;
- query-set fingerprint mismatch;
- unexpected query;
- row-cap overflow requiring semantic truncation;
- Product GID ambiguity;
- package integrity mismatch;
- timeout;
- lock/writer anomaly;
- any attempted DML/DDL;
- any provider/public-site network activity;
- any persistence attempt;
- any W03–W07 authority creation;
- any runtime activation.

Do not broaden access to recover.

## 16. Post-acquisition gate

Before BE3 translation:

- database transaction must be closed;
- Production connection must be closed;
- package integrity must pass;
- package site ID must equal the canonical site ID;
- grant site ID must equal package site ID;
- package policy identity must equal grant policy identity;
- safety markers must remain non-authorizing.

Only `complete_for_w09a` candidates proceed.

## 17. Allowed result states

### `w09c_real_shadow_complete`

Requires:
- at least one complete candidate;
- package integrity valid;
- site/grant/policy binding exact;
- BE3 deterministic;
- W09-A deterministic;
- zero Production write;
- zero provider/public-site network access;
- zero persistence;
- zero runtime activation.

### `w09c_real_shadow_incomplete`

Examples:
- no persisted provider-authoritative W06 before-state;
- insufficient Product GID evidence;
- incomplete upstream lineage;
- incomplete quota/cooldown/history state;
- no complete candidates.

This is evidence, not authorization to expand access.

### `w09c_real_shadow_aborted`

Examples:
- identity mismatch;
- schema mismatch;
- read-only proof failure;
- integrity failure;
- timeout;
- unexpected network/write/runtime activity.

## 18. Post-run certification package

A successful or incomplete run must record, without secrets:

- exact Git SHA/tree;
- exact query-set version/fingerprint;
- exact site ID/domain/origin/platform;
- exact policy/grant fingerprint;
- exact database name;
- exact role identity;
- transaction read-only/isolation evidence;
- transaction reference timestamp;
- executed query IDs;
- per-query row counts and result fingerprints;
- acquisition package ID/fingerprint;
- candidate completeness counts/reasons;
- translation ID/fingerprint;
- W09-A session ID/fingerprint;
- zero-write/no-network/no-persistence attestations;
- external evidence artifact hash/location descriptor;
- final state.

No raw credential or secret material may appear.

## 19. Current readiness verdict

**W09-C is not ready for real Production execution.**

Known blockers from current canonical project state:

1. Production is recorded at 34 tables while BE2 requires the full W07 schema including migrations 0005/0006/0007.
2. Exact Production project/environment/database identity has not been bound into a W09-C authorization.
3. Exact read-only role and write-incapability proof are unresolved.
4. Exact external evidence destination/retention policy is unresolved.
5. Exact W01 shadow grant artifact/fingerprint is unresolved.
6. Grant-site/package-site equality is not internally enforced by BE3 and must be certified in the operator path or hardened before execution.

These blockers must be resolved without performing a Production connection under this review.

## 20. Next safe engineering/review boundary

The immediate next safe milestone is:

**W09-C1 — Production schema readiness review for P8.8 migrations 0005/0006/0007.**

That review must:
- verify migration contents/checksums against merged source;
- establish exact current Production schema state from existing certified records first;
- define additive/non-destructive DDL expectations;
- define backup/rollback and post-migration verification requirements;
- define whether applying 0005/0006/0007 can be authorized safely;
- perform no Production DDL until separately authorized.

In parallel, W09-C authorization still needs the exact DB/role/evidence-destination/grant fields above.

## 21. Explicit non-authorization

This review authorizes no:

- Production DB connection;
- Production schema inspection;
- Production SELECT;
- migration/DDL;
- provider/public-site read/write;
- Production persistence;
- W03–W07 materialization/mutation;
- Task #51/#53/#54 execution;
- scheduler/worker/startup activation;
- credential/scope/config/gate change;
- deployment/publication;
- real Stage 0 run;
- provider-read addendum;
- W10.

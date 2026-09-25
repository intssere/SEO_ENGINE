# P8.8 W09-C2 — Production Pre-DDL Authorization / Readiness Gate

**Issue:** #515  
**Status:** REVIEW / SPECIFICATION ONLY — NO PRODUCTION CONNECTION OR DDL AUTHORIZED

## 1. Purpose

W09-C2 converts the merged W09-C1 schema-readiness review into a fail-closed authorization packet for a possible future Production migration session. This milestone does not connect to Production, inspect the live catalog, read secrets, or execute SQL.

Canonical review baseline: `0a11915e2758cb6ecf47a852d8e26b492d4a4c72`.

## 2. Frozen migration set

Only these exact Git blobs are eligible, in this exact order:

1. `0005_p8_8_policy_mutation_reservations.sql` — `b25d111af1610ea1a13333b6fbdaf4f521aea131`
2. `0006_p8_8_policy_mutation_controls.sql` — `1079b9687472abf387cb67421efa7d1f1ffcbc35`
3. `0007_p8_8_policy_mutation_dispatch.sql` — `a98ca47f9735d7fe4f53feebde38562102cbf6f2`

Any blob/content drift invalidates this packet.

The source-level expectation remains six additive public base tables. An independently proven exact pre-state of 34 therefore implies an expected post-state of 40.

## 3. Gate A — current Production identity and lineage

Before any Production DB connection for migration execution, separately authorized evidence must establish the exact current:

- Neon project;
- Production branch/timeline;
- database name;
- writable compute/endpoint used only for the bounded migration session;
- lineage relationship to the certified Production database rather than preview/development;
- operator identity and credential-injection path.

Do not record credential values in GitHub evidence.

Historical P3.6 identifiers are hints only and cannot satisfy this gate.

## 4. Gate B — recovery capability

Before DDL, independently prove current recovery capability, including:

- PITR/restore capability is enabled for the exact Production lineage;
- current usable recovery window;
- a recovery point can cover the proposed migration window;
- the decision owner for a committed partial installation;
- evidence timestamp and destination.

If recovery cannot be proved current and usable, DDL is blocked.

## 5. Gate C — pre-schema/no-drift evidence

A separate explicit authorization is required before opening a Production connection to obtain catalog evidence.

That read-only preflight must prove, at minimum:

- exact public base-table count is 34;
- `sites` exists and its `id` key satisfies the frozen migration prerequisites;
- none of the six W04/W05/W07 tables exists;
- none of the frozen index/constraint names from 0005/0006/0007 exists unexpectedly;
- there is no partial 0005/0006/0007 installation;
- the certified baseline has no unexplained schema drift;
- there is no conflicting migration/DDL session.

Any mismatch blocks execution. No repair SQL is authorized.

## 6. Gate D — runtime and write fences

Immediately before a future DDL session, evidence must show the required application/public-write, policy, scheduler and worker gates remain in their approved disabled/non-executing state.

The migration authorization must not grant provider/public-site access, application persistence, Task #51/#53/#54 execution, W03–W07 runtime execution, scheduler/worker activation, deployment, publication, or config/gate mutation.

## 7. Gate E — bounded migration session

A future explicit DDL authorization must bind:

- the exact Production identity proved by Gate A;
- the three exact migration blobs;
- fixed order 0005 → 0006 → 0007;
- one bounded writable migration session;
- fail-fast / `ON_ERROR_STOP` behavior;
- each migration file's own BEGIN/COMMIT boundary;
- no ad hoc SQL;
- no seed/backfill/application DML;
- exact start/end evidence capture;
- exact external evidence destination and retention;
- named recovery decision owner.

A failure stops the sequence immediately.

## 8. Partial-install failure policy

Failure before a file COMMIT relies on PostgreSQL transaction rollback of that file's uncommitted DDL.

If one or more files have committed and a later file fails:

1. stop;
2. preserve evidence;
3. classify Production as a committed partial installation;
4. do not run DROP/repair SQL;
5. do not continue to later migrations;
6. require a separate recovery/corrective authorization.

No destructive rollback is pre-authorized.

## 9. Independent post-DDL verification

After a separately authorized successful migration session, a fresh read-only verification path must prove:

- public base-table count is exactly 40 when the certified pre-state was exactly 34;
- all six expected tables exist;
- exact columns, types, nullability and defaults;
- exact PK/FK relationships and ON DELETE behavior;
- exact CHECK constraints;
- exact indexes and partial predicates;
- all six new tables contain zero rows immediately after schema-only installation;
- no pre-existing object was unexpectedly removed or altered;
- no runtime/public-write gate changed;
- no provider/public-site request occurred.

Zero unexplained mismatches is required for schema-installation certification.

## 10. Evidence packet

The future authorization record must bind together:

- canonical Git SHA/tree at authorization time;
- the three migration blobs;
- Production identity/lineage evidence;
- recovery evidence;
- pre-schema/no-drift evidence;
- runtime/write-fence evidence;
- operator/session identity;
- exact execution command/runbook;
- evidence destination/retention;
- recovery decision owner;
- independent post-DDL verification plan.

Evidence must exclude secrets.

## 11. Authorization boundaries

### A. Production preflight evidence authorization

A future instruction authorizing only the live read-only preflight should explicitly name W09-C2 and authorize Production identity/recovery/schema catalog verification only, while preserving zero DDL/DML/provider/public-site/runtime mutation.

### B. Production DDL authorization

DDL must remain blocked until Gate A through Gate E evidence is complete and reviewed. A later instruction must explicitly authorize applying only migrations 0005/0006/0007 to the exact certified Production target under this packet.

Authorization to perform the read-only preflight is not authorization to execute DDL.

Authorization to execute DDL is not authorization for the W09-C real Stage 0 Production read.

## 12. W09-C relationship

Even a successful schema migration/certification resolves only the schema blocker. W09-C still separately requires the exact read-only role, evidence destination/retention, W01 shadow grant/fingerprint, site/grant/package equality, frozen query-set fingerprint and explicit one-shot Stage 0 read authorization.

## 13. Current verdict

**Pre-DDL packet design: READY FOR REVIEW.**

**Live Production evidence acquisition: BLOCKED pending separate explicit authorization.**

**Production DDL: BLOCKED pending successful live preflight evidence, review, and separate explicit DDL authorization.**

## 14. Explicit non-authorization

This W09-C2 review authorizes no Production connection, Production SELECT/catalog inspection, DDL/migration execution, DML/persistence, provider/public-site access, credential/config/gate change, deployment/publication, scheduler/worker/runtime activation, W03–W07 runtime execution, Task #51/#53/#54 execution, real W09-C Stage 0 run, provider-read addendum, or W10.

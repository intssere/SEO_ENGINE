# PILOT-01 RT01-A11.3 — Unexecuted migration contract and security acceptance matrix

**Baseline:** `main` at `bdcc4836b4d4c87bff8c2b9740a390803708647b`; upstream RT01-A11.2 post-merge CI must be `SUCCESS` before this follow-on can be certified.
**Nature:** design-only evidence. This file is **not** SQL, a migration, a test execution, an approved runtime adapter or a deployment request. Nothing here authorizes connecting to staging/Production, installing extensions, modifying canonical tables, exercising a provider, launching a worker or enabling any flag.

## Preconditions / decisions to close before implementing DDL

| ID | Decision required | Acceptance standard |
| --- | --- | --- |
| D01 | Database ownership and migration ledger | Independently identify authorized isolated database, migration runner, exact applied versions/checksums, active role and schema; stop if lineage/drift unknown |
| D02 | Tenant and site identity | Use `organizations.id`, `sites.id` UUIDs; prove each `site_id` is owned by the **same** organization as the grant, job and receipt. Independent unrelated FKs are insufficient |
| D03 | Server-side subject/membership | Map `auth_sessions.subject` (text), session UUID/role/revocation to organization membership using independently trusted source. An injected `source:server_verified_session` string alone is not proof |
| D04 | Issuer custody | Record server-owned issuer identity, provenance and permission for exact site and operation; do not allow a user-supplied issuer ID to create authority |
| D05 | Isolation | Choose additive `pilot01`-owned namespace and least-privileged schema roles; no legacy `public.jobs` or P8.8 dispatch changes in first migration |
| D06 | Retention and immutable audit | Decide receipt/event retention, role privileges, append-only enforcement, backup/recovery, incident response; do not CASCADE DELETE evidence on tenant removal |
| D07 | Worker boundaries | Worker lease TTL maximum, DB-time clock semantics, generation increment, cancellation versus grant revocation and outbox deliverability |
| D08 | Runtime cutover | Must remain explicitly disabled until full independent certification. No automatic fallback to signed-cookie legacy pilot route |

## Conceptual migration acceptance contracts (not executable schema)

**C01 — Identity and referential integrity.** Grants have immutable canonical organization/site UUIDs and server-verified actor/issuer; the organization/site pair must be enforced by a composite FK or equivalent authoritative database constraint. Every job, receipt and event is linked to the same verified pair. Cross-tenant joins or insert/update spoofing must be impossible for the permitted role.

**C02 — Single grant outcome.** One grant may transition `issued → consumed` OR `issued → revoked`, at most once, with an immutable transactionally written event. Expiration is checked against PostgreSQL authoritative time while serializing on the grant; expired/revoked grants cannot admit a new job. Revocation after consumption is not job cancellation.

**C03 — Atomic admission.** Consume grant, insert exactly one job, append immutable admission receipt and audit in **one** transaction. Any failure—including receipt/audit write failure—rolls back all. Successful response must be backed by durable committed state, never mock or memory. Lost response/COMMIT acknowledgement is ambiguous until independently reconciled.

**C04 — Idempotency.** Exact-scope replay (grant, tenant, site, actor, issuer, operation, request fingerprint and idempotency key) returns the **identical** committed receipt without creating another job/event. Same key with inconsistent scope denies, even in concurrent transactions. Define and enforce whether keys are globally unique or tenant-scoped, with explicit cross-tenant collision behavior.

**C05 — Fenced lease.** Job claim, renew, progress, completion and cancellation checks always require tenant/site/job, owner, strictly increasing database generation and unexpired DB-clock lease. A superseded/expired generation cannot create state, outcome, receipt or deliverable outbox intent. No in-memory stale-run timer is equivalent to fencing.

**C06 — Transactional outbox.** In one transaction with authorized fenced job transition, record read-only intent plus immutable audit and deduplication identity. Delivery must recheck current authorization, fencing and cancellation. An outbox committed at an earlier generation must not remain unconditionally deliverable. Exactly-once *external* effects cannot be promised solely by transactional admission.

**C07 — Privileges and RLS.** Explicitly test app role, authenticated resolver, worker role, migration role and unauthorized role. Prove no cross-tenant reads/writes, prohibited direct receipt mutation, unrestricted issuer issue, RLS bypass or unsafe SECURITY DEFINER path. Role variables from HTTP must not be trusted without an independently enforced identity boundary.

**C08 — Fail-closed availability.** DB unavailable, unknown migration version, missing issuer/membership evidence, disabled auth, flag divergence, malformed receipt, unknown commit outcome, expired grant, or untrusted worker must return denied/unavailable **without operational dispatch**. Default remains `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`.

**C09 — Legacy separation.** Canonical `public.jobs` remains unmodified, and legacy `pilot_ingestion_v1` queue cannot be selected as a downgrade when pilot01 admission is denied. The specialized Shopify `policy_mutation_dispatches` path cannot authorize PILOT-01 reads or writes.

## Isolated PostgreSQL test matrix — future execution requires distinct approval

| Test | Fault/attack | Expected evidence |
| --- | --- | --- |
| T01 | Legitimate trusted issued grant | Exactly one consumed grant, one job, one immutable receipt and audit, identical scoped UUIDs |
| T02 | Two concurrent admissions same grant | Exactly one committed job; second identical request only replays its original committed receipt |
| T03 | Same idempotency key different actor/site/operation/issuer/grant | Denied; no extra job or receipt |
| T04 | Revocation versus consumption race | Serialized winner, no both-revoked-and-consumed outcome |
| T05 | Expiry boundary and DB-clock drift | Expired grant/lease denied regardless of caller clock |
| T06 | Injected fault after grant, job or receipt/audit writes | Whole transaction rolls back; zero partial state |
| T07 | Lost COMMIT response / process interruption | Reconciliation decides committed versus not; no unconditional retry or duplicate |
| T08 | Fake membership, disabled auth, forged issuer or revoked session | Denied before durable admission; zero worker launch |
| T09 | Cross-organization site FK and RLS attacks | Insert/update/read denied; no disclosure or cross-tenant linkage |
| T10 | Worker A paused; B claims newer generation; A resumes | A's renew/progress/complete/outbox rejected |
| T11 | Expired lease / wrong owner / wrong site | Fenced, with immutable denial or outcome audit as policy requires |
| T12 | Cancellation after admission and queued outbox | Explicit cancel semantics; no unauthorized delivery |
| T13 | Receipt/event UPDATE or DELETE by app and worker role | Denied; append-only audit remains intact |
| T14 | DB disconnect, schema drift, permission denied | Fail closed; no fallback to legacy queue or provider calls |
| T15 | Restart with two processes; repeated outbox delivery attempt | Durable dedupe and explicit outcome-unknown handling; no claimed exactly-once provider effect |
| T16 | Existing canonical queue and P8.8 controls | No behavior/schema regression; existing tests pass unchanged |

### Evidence quality gate

For each future test: capture exact authorized isolated DB resource identity, PostgreSQL version, image/container digest, migration checksum and installed ledger, execution command, synthetic-only fixture provenance, independent process count, fault injection point, normalized transaction trace, outcome and cleanup proof. **No test result is claimed by this document.**

## Future rollout and rollback stop rules

1. **M0 — inventory only, separately authorized:** obtain resource and installed-migration evidence without mutation. Stop on unexpected drift, unclear identity or permissions.
2. **M1 — reviewed migration diff:** explicitly version additive DDL, validate constraint strategy, permission/RLS proofs, retention and rollback with independent technical review. This document does not contain DDL.
3. **M2 — disposable DB trial, separately authorized:** no external connections; run T01–T16 with evidence/cleanup. Failures block any staging progression.
4. **M3 — staging migration, separately authorized:** back up, attest resource identity and apply only approved versioned change. No automatic worker activation or flag changes.
5. **M4 — runtime wiring and worker proofs, separately authorized:** verify real server identity and issuer, queue-to-worker admission, fenced progress and cancellation, read-only provider boundaries.
6. **M5 — bounded pilot release, separately authorized:** independent operator verification, owner approval and reproducible rollback playbook; public writes/AI proposals remain disabled.

Destructive rollback of **populated** grant/job/receipt/outbox structures is forbidden by default; isolate/freeze and forward-repair after review. No silent reversion to the legacy unsecured operational path.

## Review checklist

- [ ] Canonical organization/site FK and actual membership source resolved
- [ ] Issuer custody and RLS/privilege model independently approved
- [ ] Full transactional atomicity and immutable receipt mechanism specified
- [ ] Fencing/outbox/cancellation race semantics approved
- [ ] T01–T16 mapped to test harness and evidence format
- [ ] Migration ownership/ledger/drift and retention plan approved
- [ ] CI `SUCCESS`, formal Tahseen `APPROVED`, distinct owner authorization at exact PR HEAD before merge

**No SQL, DDL, database connection, migration, deploy, provider operation, operational worker or public-site write is authorized or performed by this design.**

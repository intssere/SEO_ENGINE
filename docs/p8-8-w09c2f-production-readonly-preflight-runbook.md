# P8.8 W09-C2F — Production read-only preflight runbook

**Issue:** #594  
**Status:** SPECIFICATION / OFFLINE CERTIFICATION ONLY — NO LIVE PRODUCTION PREFLIGHT AUTHORIZED

## 1. Purpose

W09-C2F defines the single fail-closed procedure by which a future, separately authorized operator may acquire the current evidence required for W09-C2 Gates A–D before any Production DDL decision.

The successful W09-C2E-R4 P3 binding attestation is prerequisite evidence only. It does not itself establish the Neon control-plane lineage, recovery capability, live schema state, or runtime/write fences.

This runbook grants no Production connection, SQL, DDL/DML, provider/public-site access, credential read/change, deployment/publication, scheduler/worker activation, Railway/UGP action, migration, or W09-C Stage 0 authority.

## 2. Frozen source identity

A future execution authorization must name the then-current canonical Git commit/tree and revalidate that the following migration blobs are unchanged:

1. `0005_p8_8_policy_mutation_reservations.sql` — `b25d111af1610ea1a13333b6fbdaf4f521aea131`
2. `0006_p8_8_policy_mutation_controls.sql` — `1079b9687472abf387cb67421efa7d1f1ffcbc35`
3. `0007_p8_8_policy_mutation_dispatch.sql` — `a98ca47f9735d7fe4f53feebde38562102cbf6f2`

Any source, migration, or authority drift fails closed.

## 3. One-shot evidence phases

A future authorized preflight is one bounded logical operation with four ordered phases. Failure or ambiguity in any phase stops the operation and makes Gates A–D ineligible for a combined PASS.

### A — Production identity and lineage

Obtain current provider control-plane evidence sufficient to identify only the non-secret:

- Neon project identity/name;
- exact Production branch/timeline identity;
- exact database name;
- writable compute/endpoint identity intended only for a later bounded migration session;
- lineage relationship proving the branch/endpoint belongs to the certified Production database rather than preview/development;
- operator identity;
- credential-injection mechanism/name, never the credential value.

Compare the database name and endpoint identity to the sanitized W09-C2E-R4/P3 result where applicable. Historical identifiers and caller assertions are not substitutes for current provider evidence.

Gate A fails closed on missing, ambiguous, stale, preview/development, or contradictory identity evidence.

### B — Recovery capability

For the exact Gate A lineage, obtain current non-secret provider evidence proving:

- PITR/restore capability is enabled;
- the current usable recovery-window start/end or duration;
- the proposed future migration window would be covered;
- recovery destination/mechanism is available;
- a named recovery decision owner is recorded in the authorization packet.

Gate B fails closed if recovery capability or coverage cannot be proven current.

No restore, branch creation, PITR operation, or recovery mutation is part of this preflight.

### C — exact pre-schema/no-drift catalog

Only after A and B pass may the separately authorized preflight open one bounded read-only Production database session. It must set transaction/session semantics that prevent writes and execute only the allowlisted catalog observations below. No application-table row data may be selected.

The allowlisted logical observations are:

1. current database identity equals the Gate A database name;
2. current schema is `public`;
3. count of public ordinary/base tables is exactly **34**;
4. `public.sites` exists;
5. the `sites.id` column and its key/constraint properties satisfy the exact FK prerequisites referenced by frozen migrations 0005/0006/0007;
6. all six expected new tables are absent:
   - `policy_mutation_reservations`;
   - `policy_mutation_reservation_events`;
   - `policy_mutation_controls`;
   - `policy_mutation_control_events`;
   - `policy_mutation_dispatches`;
   - `policy_mutation_dispatch_events`;
7. every index/constraint name introduced by frozen 0005/0006/0007 is absent;
8. no migration marker or catalog evidence indicates a partial 0005/0006/0007 installation;
9. no conflicting active DDL/migration session is observed;
10. no unexplained catalog difference exists relative to the certified 34-table baseline.

The future implementation/execution packet must freeze the exact SELECT-only SQL text before authorization. Queries must target only PostgreSQL identity/catalog/activity metadata required above. They must not select application/business rows, invoke volatile mutation functions, create temporary objects, change schema, acquire advisory locks, or execute DDL/DML.

Any count other than 34, unexpected object, partial installation, prerequisite mismatch, conflicting DDL, query error, timeout, or ambiguity fails Gate C closed. No repair SQL is authorized.

### D — runtime and write fences

Using only current non-secret configuration/status evidence from the approved Production control plane and application configuration surface, prove immediately before any later DDL authorization that:

- application/public-write capability relevant to this migration remains disabled/non-executing;
- policy execution remains disabled/non-executing;
- scheduler remains disabled/non-executing;
- worker/recurring dispatch remains disabled/non-executing;
- Task #51/#53/#54 execution is not activated;
- W03–W07 runtime execution is not activated;
- no migration or preflight action changed those gates.

Observation is read-only. W09-C2F does not authorize changing a gate to make it pass.

## 4. Sanitized evidence record

A future preflight may retain only non-secret evidence needed for review:

- runbook version;
- canonical commit/tree;
- migration blob identities;
- UTC observation timestamps;
- provider project/branch/endpoint identifiers that are non-secret;
- database name;
- lineage verdict and evidence reference;
- recovery-enabled verdict/window and evidence reference;
- catalog observation names, expected values, observed sanitized values and PASS/FAIL;
- runtime/write-fence names and sanitized states;
- operator identity;
- credential-injection path/name without value;
- read-only session identifier if non-secret;
- query-set fingerprint once exact SQL is frozen;
- overall Gate A/B/C/D verdicts;
- evidence destination/retention;
- safety counters/flags.

Never retain connection strings, usernames where treated as credentials, passwords, tokens, secret environment values, query parameters/fragments containing secrets, or application/business row data.

## 5. Execution safety invariants

A future live preflight authorization must enforce:

- one logical attempt; no automatic retry;
- Gate order A → B → C → D;
- zero DDL/DML and zero migration execution;
- zero application/provider/public-site writes;
- zero deployment/publication/restart;
- zero config/credential/gate mutation;
- zero scheduler/worker/autonomous activation;
- zero Railway staging or UGP action;
- zero W09-C Stage 0;
- at most one bounded read-only database session, opened only after A and B pass;
- fail closed on transport ambiguity or incomplete evidence.

The attempt being authorized for evidence acquisition does not authorize a later DDL attempt.

## 6. Gate-E separation

Gate E remains blocked until A–D have independently passed and their evidence packet has been reviewed.

A later Gate-E engineering milestone must freeze the exact migration execution command/runbook around only 0005 → 0006 → 0007, including `ON_ERROR_STOP`, each file's existing transaction boundary, evidence destination/retention, recovery decision owner, stop-on-first-failure semantics, and independent post-DDL verification.

W09-C2F must not contain or execute the writable migration command.

## 7. Future authorization boundary

A future live W09-C2F authorization must explicitly bind:

- exact canonical commit/tree;
- this runbook version;
- exact migration blobs;
- exact Production application/environment;
- approved provider control-plane observation scope for A/B/D;
- exact frozen SELECT-only Gate-C query-set version/fingerprint;
- one bounded read-only database session;
- evidence destination/retention;
- operator identity;
- zero-write and no-retry constraints.

If exact SELECT-only SQL has not yet been frozen and certified, Gate C remains ineligible for live execution.

## 8. Certification criteria

This specification is merge-certifiable only when:

- its branch starts from the exact canonical main at creation;
- only W09-C2F specification/static or synthetic certification material changes;
- exact-head required CI passes;
- zero unresolved review threads remain;
- no Production/Replit runtime action, provider observation, database session, SQL, secret access, migration, Railway mutation, UGP action, or Stage 0 occurred.

Merge requires separate explicit authorization. Merge does not authorize live preflight, DDL, or Stage 0.

## 9. Current verdict

**W09-C2F runbook design:** ready for offline review/certification.

**Live Gates A–D evidence acquisition:** blocked pending exact Gate-C SELECT-only query-set certification and separate explicit Production preflight authorization.

**Gate E / Production DDL:** blocked pending A–D PASS, review, a separately certified bounded migration runbook, and separate explicit DDL authorization.

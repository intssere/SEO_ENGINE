# P8.8 W09-C2H — Live Production read-only preflight authorization packet

**Issue:** #603  
**Status:** OFFLINE CERTIFIED AUTHORIZATION TEMPLATE — NO LIVE PRODUCTION ACCESS AUTHORIZED BY THIS FILE

## 1. Immutable prerequisites

A live authorization is valid only if, immediately before execution, all identities below are revalidated unchanged:

- canonical source commit: `79789588c987ac2f5f561f920290e5db34686b4f`
- W09-C2F runbook blob: `bb7661db92313c73087445bd3ff94be00f41ca3a`
- W09-C2G query-set blob: `fb38cf9d8adf7cd8fa3b88d3ec73a590816defd3`
- W09-C2G version: `p8-8-w09c2g-gate-c-query-set-v1`
- migration 0005 blob: `b25d111af1610ea1a13333b6fbdaf4f521aea131`
- migration 0006 blob: `1079b9687472abf387cb67421efa7d1f1ffcbc35`
- migration 0007 blob: `a98ca47f9735d7fe4f53feebde38562102cbf6f2`

Any mismatch consumes no broader authority and blocks execution pending a newly certified packet.

## 2. Exact future authorization text

A future operator may proceed only after the user explicitly authorizes the following bounded operation (with the then-current operator/evidence destination fields resolved without exposing secrets):

> **AUTHORIZE W09-C2H LIVE PRODUCTION READ-ONLY PREFLIGHT —** execute exactly one bounded W09-C2F Production read-only preflight for Gates A→B→C→D against canonical source `79789588c987ac2f5f561f920290e5db34686b4f`; require exact W09-C2F blob `bb7661db92313c73087445bd3ff94be00f41ca3a`, W09-C2G blob `fb38cf9d8adf7cd8fa3b88d3ec73a590816defd3` / version `p8-8-w09c2g-gate-c-query-set-v1`, and migration blobs 0005 `b25d111af1610ea1a13333b6fbdaf4f521aea131`, 0006 `1079b9687472abf387cb67421efa7d1f1ffcbc35`, 0007 `a98ca47f9735d7fe4f53feebde38562102cbf6f2`; Gate A may perform current non-secret Production provider-control-plane identity/lineage observations only; Gate B may perform current non-secret PITR/recovery-capability observations only and no restore/branch/recovery mutation; only if A and B PASS, Gate C may open at most one bounded Production database session, establish `REPEATABLE READ READ ONLY`, execute exactly W09-C2G Q00–Q09 once each in order, and `ROLLBACK`; Gate D may perform current non-secret Production runtime/write-fence status observations only; retain only sanitized evidence and no raw connection string/token/password/secret/application-row data/query text from pg_stat_activity; fail closed and stop on any mismatch, ambiguity, error, timeout, or failed gate; no automatic retry; zero DDL/DML/migration execution, repair SQL, application/provider/public-site writes, configuration/credential/gate changes, deployment/publication/restart, scheduler/worker/autonomous activation, Task #51/#53/#54 execution, W03–W07 execution, Railway/UGP action, or W09-C Stage 0.

The literal authorization may additionally identify the operator and sanitized evidence destination. It must not weaken or omit any constraint above.

## 3. Ordered execution

### Preflight P0 — immutable identity
Before any Production observation:
1. verify canonical GitHub source commit;
2. verify W09-C2F and W09-C2G exact blobs/version;
3. verify 0005/0006/0007 exact blobs;
4. verify the live authorization text names these exact identities.

Failure stops before Production access.

### Gate A — identity/lineage
Read current non-secret provider control-plane metadata only. Establish exact Production project, branch/timeline, database, intended future writable compute/endpoint identity, lineage, operator identity, and credential-injection path/name without reading credential values.

If identity is ambiguous, stale, preview/development, contradictory, or cannot be tied to the certified Production binding, stop. Do not open a database session.

### Gate B — recovery
For exactly Gate A's lineage, read current non-secret recovery metadata only. Establish PITR/restore enabled state, usable recovery window, coverage of a prospective migration window, available recovery destination/mechanism, evidence timestamp, and named recovery decision owner.

If current recovery capability/coverage is not proven, stop. Do not open a database session. Do not create a restore point/branch or perform recovery.

### Gate C — catalog/no-drift
Only after A=PASS and B=PASS:
1. open at most one database session through the exact Gate-A Production binding;
2. establish `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;`;
3. execute exactly W09-C2G Q00–Q09 once each and in order;
4. collect only the sanitized outputs allowed by W09-C2F/C2G;
5. execute `ROLLBACK;` on PASS or failure when the session remains usable;
6. close the session.

No fallback/repair/expanded query is authorized. A SQL error, permission error, timeout, transport ambiguity, count/object/prerequisite mismatch, conflicting DDL sentinel, baseline mismatch, or read-only/isolation mismatch fails Gate C.

### Gate D — runtime/write fences
Only non-mutating status/configuration observations are allowed. Establish that the Production application/public-write capability relevant to the migration, policy execution, scheduler, worker/recurring dispatch, Task #51/#53/#54 execution, and W03–W07 runtime execution remain disabled/non-executing as required by W09-C2F.

If a fence is not in the required state, fail. Do not change it.

## 4. Attempt and retry semantics

- The authorization grants one logical attempt.
- No automatic retry is allowed.
- A failure before Gate C must not open a DB session.
- A Gate-C failure must stop after safe `ROLLBACK`/session close where possible.
- A Gate-D failure does not authorize returning to C.
- Transport ambiguity is failure, not permission to repeat.
- A second attempt requires a fresh explicit authorization after evidence review.

## 5. Sanitized receipt

Record only:
- packet/runbook/query versions and blobs;
- canonical commit;
- migration blobs;
- UTC timestamps;
- non-secret project/branch/endpoint/database identifiers;
- lineage/recovery/fence verdicts and non-secret evidence references;
- Q00–Q09 sanitized expected/observed verdicts;
- database-session count;
- per-query invocation count;
- rollback attempted/completed flags;
- operator identity;
- credential-injection path/name without credential value;
- evidence destination/retention;
- overall A/B/C/D verdict;
- prohibited-operation counters/flags.

Never retain or print raw connection strings, passwords, tokens, secret environment values, application/business row data, or the `pg_stat_activity.query` text used internally by Q07 filtering.

## 6. Authority exclusions

This packet grants no authority until the exact explicit authorization is supplied. Even then it never grants:
- DDL/DML or migrations 0005/0006/0007;
- repair/backfill/seed SQL;
- provider/public-site/application writes;
- restore/PITR/branch creation;
- credential/config/gate mutation;
- deployment/publication/restart;
- scheduler/worker/policy/autonomous activation;
- Task #51/#53/#54 or W03–W07 execution;
- Railway staging mutation;
- UGP work;
- W09-C Stage 0;
- Gate-E migration execution.

## 7. PASS consequence

A combined A/B/C/D PASS produces reviewable evidence only. It does not authorize Gate E or any Production mutation.

Gate E remains a separate engineering/certification milestone followed by a separate explicit DDL authorization.

# PILOT-01 RT01-A12.17 — disposable PostgreSQL 17 custody integrity certification

## Exact owner authority and execution boundary
Only a **freshly created, empty, loopback PostgreSQL 17 GitHub Actions database** named `pilot01_disposable_rt01a12_17_ci` with synthetic `postgres` CI credentials and explicit A12.17 arming sentinel. The test refuses unarmed or non-loopback URLs, incorrect port/user/database and unexpected schemas, roles, public tables, PostgreSQL version or extensions **before DDL**. Work must not use existing, restored, staging, Railway, production, customer, or external databases.

## File-by-file reuse ledger
| Already merged | Reused unchanged | A12.17 delta |
| --- | --- | --- |
| Canonical `0001–0011` SQL | Fresh replay in disposable service, no operational migrations | Require complete lineage before candidate installation |
| A12.1 SQL candidate | Existing pilot tables and `pilot01.reject_immutable_mutation()` | Load exactly as authored, no new grant/job schema |
| A12.14 SQL candidate | Existing membership, issuer and event tables | Load exactly as authored, no duplicate table |
| A12.15 guarded PG17 test | New empty target attestation, replay pattern, test-only role isolation | New separate disposable job/database to avoid fixture collision |
| A12.16 SQL candidate | Existing transition and event triggers | Exercise the exact candidate, do not edit or install operationally |
| A12.7–A12.13 contracts/design | Existing authorization/revocation principles | No new resolver/adapter, runtime, worker, issuance, or provider wiring |

## New database-behavior probes
- Verify actual A12.16 trigger installation and FORCE RLS on all custody tables.
- Reject revision downgrades, skips, incomplete revocations, identity/scope mutation, DELETE and reactivation after revocation.
- Demonstrate that a failed synthetic event INSERT rolls back a permitted custody UPDATE with no committed event.
- Demonstrate precisely one membership and one issuer revocation event from valid protected transitions, with revision increment.
- Reject UPDATE and DELETE of event history by the active triggers.
- Verify default-deny SELECT and write behavior under synthetic NOLOGIN NOSUPERUSER NOBYPASSRLS principals, then test-only read policy isolation using role identity rather than spoofable tenant settings.

## Non-proofs and residual risks
A disposable test is **not operational certification**. A PostgreSQL superuser/table owner may disable triggers, modify functions, TRUNCATE/ALTER objects or bypass policy. Test-only role/policy setup is not a trusted authentication integration. There is no authorized issuance API, signed custody provenance, genuine human actor binding, audited writer privilege allocation, operational RLS policy, migration-ledger attestation, production-scale concurrency certification, or worker fencing. A12.16's `current_user` and SHA-256 are technical correlation only. No real providers, queues or public-site writes.

## Governance
Keep PR draft and unmerged until exact-HEAD Standard CI SUCCESS + dedicated A12.17 disposable PG17 CI SUCCESS, Tahseen formal GitHub APPROVED review, zero unresolved review threads and separate exact-HEAD owner merge authorization. A merge never authorizes operational SQL, migration, runtime, worker, provider or deployment changes.

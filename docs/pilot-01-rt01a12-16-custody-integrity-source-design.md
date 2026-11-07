# PILOT-01 RT01-A12.16 — Source-only custody integrity enforcement candidate

## Authorization boundary
**UNEXECUTED SQL CANDIDATE.** This stage may add source files, documentation, mock/offline static negative tests and CI. It may not access existing or disposable databases, execute SQL, apply migrations, wire API/worker runtime, contact providers, write public sites, deploy or merge. The candidate is stored in `docs/sql-candidates/`, not `lib/db/migrations/`.

## Exact reuse ledger
| Already merged | Reused as-is | New A12.16 delta |
| --- | --- | --- |
| A12.1 additive candidate | Five pilot01 tables and `pilot01.reject_immutable_mutation()` | Reuse trigger function; do **not** copy admissions/jobs/jobs-event tables |
| A12.7 | Trusted session, membership and issuer evidence contracts | No second resolver or principal token |
| A12.8–A12.10 | Transaction revocation/revision fencing and RLS role blueprints | Add SQL-only transition constraint mechanisms, no transaction adapter |
| A12.12 | Disposable PG17 revocation/tenant tests | No PG execution or redundant synthetic role tests |
| A12.13 | Legacy route/queue and security cutover call graph | No runtime wiring |
| A12.14 | `tenant_memberships`, `issuer_custody`, `custody_revocation_events` candidate tables | No new tables, constrain these three only |
| A12.15 | Proven gap: revision rollback, privilege-driven revival and event deletion possible | Precisely target documented gaps, no new PostgreSQL harness |

## Proposed unexecuted enforcement SQL
`docs/sql-candidates/rt01-a12-16-custody-integrity-enforcement-additive.sql`:

1. Reuse A12.1's `reject_immutable_mutation()` for DELETE attempts against membership/issuer and UPDATE/DELETE against custody revocation evidence.
2. An **invoker-security** BEFORE UPDATE trigger restricts existing active custody rows to a single irreversible revocation transition, positive revision increment of exactly one and unchanged tenant/actor/issuer identity, scoped role, expiry and provenance. It refuses a second mutation of an inactive/revoked row. **Renewal, role updates and reissuance are intentionally disabled**, not silently implemented.
3. A matching AFTER UPDATE trigger inserts the custody revocation event inside the same PostgreSQL transaction; a failed insert rolls back the update. The record uses technical `current_user` and deterministic digest as **correlation**, not authenticated issuer proof, tamper-proof signature, or independently proven human identity.
4. Both new functions are `SECURITY INVOKER`, have restricted `search_path`, explicit pgcrypto `public.digest`, and revoke PUBLIC execute. No role creation, new policy, grant, runtime privilege or deployment is included.

## Threats not closed by this candidate
- The table owner/superuser can still disable triggers, alter their functions or change table ownership. An immutable trigger is *not* WORM evidence or independently attested audit.
- `TRUNCATE` and DDL are outside DELETE triggers. Real writer roles must have no TRUNCATE/ALTER/owner/BYPASSRLS rights.
- No trusted issuance, reissuance, renewal, authority verification, authorized actor custody, signature, issuance-receipt verification, or proof that `current_user` maps to a real authenticated person is provided.
- The current candidate intentionally allows only **revocation** of already issued records. Server-controlled initial issuance and all modifications beyond revocation require separately reviewed contracts.
- Qualified pgcrypto function resolution depends on canonical `0001_core.sql` installing the extension to `public` in the tested environment. Installation location/drift in an existing DB is not verified.
- RLS FORCE without approved runtime policies leaves app access denied; any future grant/policy/worker activation needs separate authorization and independent PostgreSQL validation.
- Matching trigger transitions plus evidence INSERT are candidate SQL until tested in newly authorized disposable PostgreSQL. Static regex checks are not SQL parsing or behavioral certification.
- The prior canonical migration ledger, historical 0008–0015 compatibility, operational DB ownership, backfill safety, lock cost, old records and rollback/forward controls remain unresolved.

## New offline nonredundant tests
`lib/db/src/pilot-01-rt01a12-16-integrity-source-audit.ts` and its negative mutation tests inspect only injected source text. They detect removal of guard/append/immutability triggers, missing A12.1 and A12.14 dependencies, weakened revision and reactivation predicates, missing tenant/issuer immutable scope, absence of atomic event insert, missing SECURITY INVOKER and PUBLIC revocation, and unauthorized CREATE TABLE/ROLE/POLICY/GRANT statements. These tests **do not execute SQL, connect to databases or verify trigger behavior**.

## Required merge governance
Exact-HEAD Standard CI SUCCESS + A12.16 offline CI SUCCESS, Tahseen formal GitHub APPROVED review, then separate owner exact-PR/HEAD merge authorization. Merging these static files does **not** authorize any database operation or operational integration.

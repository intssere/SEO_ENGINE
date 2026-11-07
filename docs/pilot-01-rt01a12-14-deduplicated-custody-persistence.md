# PILOT-01 RT01-A12.14 — deduplicated canonical custody persistence gap closure

**Owner authorization:** SOURCE ONLY. All SQL candidates remain outside `lib/db/migrations`, unexecuted. No connection to any existing or disposable database, no SQL execution, migration application, runtime wiring, worker activation, provider operation, deployment, public-site write, or merge.

## Reuse ledger (no duplicate implementations)
| Existing verified source | Reused capability | A12.14 delta |
| --- | --- | --- |
| `lib/db/src/pilot-01-rt01a12-7-disconnected-custody.ts` | Trusted evidence ports, membership and issuer scopes, active/revoked/expiry/revision checks | No new custody resolver |
| `lib/db/src/pilot-01-rt01a12-8-disconnected-transaction.ts` | Commit-time evidence fences, transaction and reconciliation contracts | No second admission port |
| `docs/pilot-01-rt01a12-10-canonical-postgresql-security-blueprint.md` | Role/RLS design, revocation ordering and canonical migration sequencing | Only missing proposed table shapes |
| `lib/db/src/pilot-01-rt01a12-12-pg17-security.ephemeral.test.ts` | Fresh PG17 role/RLS, concurrency, synthetic membership/issuer fixtures | No PG17 execution or duplicated fixture harness |
| `docs/pilot-01-rt01a12-13-production-security-integration-readiness.md` | Route-to-worker map, legacy-queue bypass and migration authority ledger | No new route or runtime map |
| `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql` | Existing five `pilot01` grant/job/admission/event/outbox candidates and composite site index | Add **only** `tenant_memberships`, `issuer_custody`, `custody_revocation_events` |
| `lib/db/migrations/0001_core.sql`, `0002_auth.sql` | Canonical organization/site UUID, global session role and session revocation | Preserve unchanged |

## New candidate: constraints and dependency chain
`docs/sql-candidates/rt01-a12-14-canonical-membership-issuer-revocation-additive.sql` proposes three new `pilot01` tables, **not operational DDL**.

1. `tenant_memberships`: authoritative `organization_id + subject` key, independent scoped role, active/expiry/revocation, positive revision. No self-grant or global-admin implicit membership.
2. `issuer_custody`: issuer identity scoped to org + site + subject + read-only operation, expiry, revocation and revision, SHA-256 **fingerprint only**. Composite org/site FK requires the separately reviewed existing A12.1 composite unique index.
3. `custody_revocation_events`: independent event ID, org, subject, optional issuer (for issuer events), positive version, actor, event kind and authorization-receipt fingerprint. Schema declares no UPDATE/DELETE permissions. This is **not** cryptographically authenticated issuance or proof of immutable owner/admin behavior.

**Source dependencies:** canonical `public.organizations`, `public.sites` and `public.auth_sessions`; A12.1 schema and composite site index candidate. `pilot01` is not an installed operational migration. No operational migration number is assigned because historical 0008–0015 lineage and installed target are unverified.

**Future design limitations:** 
- SQL `CHECK (revision > 0)` does not enforce *monotonic* increments; a future narrowly privileged DB-owned mutation API, audited revision transition checks and serialization are required.
- `active` and `revoked_at` checks do not prevent revival by a powerful writer; no writer is granted authority in this candidate.
- Revocation event rows remain mutable by table owners/superusers despite application privileges/RLS; genuine append-only retention and immutability need separately reviewed enforcement and recovery testing.
- SHA-256 fingerprints are not issuer signatures. Actual issuance authority, provenance attestation, actor RBAC and anti-forgery must be independently established.
- FKs and RLS **do not** by themselves serialize revocation vs admission. A12.12's advisory tenant locks are cooperative. Future transaction authority must guarantee shared protocol and trusted DB time.
- No PostgreSQL RLS policies or runtime grants are added. `ENABLE` + `FORCE ROW LEVEL SECURITY` still require independently certified policies under proper non-superuser roles.
- No effects, outbox dispatch, provider reads, legacy queue changes or worker activation are included.

## New offline checks (non-redundant with A12.7–A12.13)
`lib/db/src/pilot-01-rt01a12-14-custody-candidate-audit.ts` reads only injected source **text**, detects absent/duplicate tables, loss of canonical dependencies, missing composite org/site FK, missing revision checks, missing ENABLE/FORCE RLS or PUBLIC revocation, and forbidden operational grants/policies/destructive statements. Tests inject negative SQL source mutations. They do not run SQL, validate actual database syntax/constraints, authenticate principals or test runtime worker fences.

## Required release chain
- A12.14 draft PR: Standard CI SUCCESS and dedicated offline source-only CI SUCCESS at the **same exact HEAD**; Tahseen official GitHub `APPROVED`; separately authorized owner exact PR+HEAD merge.
- Merge of this unexecuted candidate must never be interpreted as approval to run SQL, access a DB, install RLS, wire production auth, start workers, use providers, change websites or deploy.
- Later stage may request a **separate explicit owner authorization** for fresh disposable PostgreSQL 17 testing, then another separate authorization for existing resource authority and operational rollout.

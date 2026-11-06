# PILOT-01 RT01-A12.10 — canonical PostgreSQL security integration blueprint

## Scope and explicit no-go
Source-only technical specification, disconnected contracts, in-memory negative tests and dedicated offline CI. NOT a database implementation, migration, executable SQL, deployed RLS configuration, authenticated issuer or production-ready capability. Never connect to existing/disposable databases, run SQL, apply migrations, wire runtime, activate workers/providers, deploy, write public sites or merge without separate authority.

## Canonical baseline and dependencies
- A12.7: independently injected session, site, tenant membership and issuer evidence; synthetic principal is not authentic proof.
- A12.8: the transaction-boundary contract requires revision fencing, commit-time rechecks, serialized revocation and read-only commit reconciliation; test-only mock is not PostgreSQL isolation.
- A12.9: pure role/RLS readiness checks and a conceptual lock order; not permission or policy certification.
- `lib/db/migrations/0001_core.sql`: public `organizations(id uuid)`, `sites(id uuid,organization_id uuid)`; uniqueness is `(organization_id,domain)`, not `(organization_id,id)`.
- `lib/db/migrations/0002_auth.sql`: `auth_sessions` has subject, global role, expiry and revocation; **no canonical tenant membership or issuer custody**.
- `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql`: unexecuted pilot01 grants/jobs/admissions/job_events/outbox candidate, ENABLE/FORCE RLS but no policies or runtime role grants.

## Proposed persistence specification — not DDL
1. Tenant memberships: key by authoritative organization UUID + session subject; record scoped role, state, expiry, revocation timestamp, positive monotonically incrementing revision and immutable audit events. Global admin role cannot grant itself tenant membership. Define an explicit membership issuance/revocation authority and audit custody.
2. Issuer registry: server-owned issuer identity, organization UUID, site UUID, actor subject, read-only operation (`analyze`/`recommend`), expiry, revocation, positive revision and a provenance verification method. A SHA-256-shaped digest is only a fingerprint, never an authentication signature. Bind grants to independently verified issuer record, not client-provided identifiers.
3. Session: use enforced server-side token/session resolution and compare session subject, expiry and revoked state. Treat caller-provided source markers and types as untrusted until the session identity is proved independently.
4. Sites: derive organization from trusted site record, verify active state; plan composite `(organization_id,site_id)` foreign-key relationships, including migration/backfill/locking implications.

## Future PostgreSQL roles and RLS requirements
| Principal | Intended minimum authority | Prohibitions |
|---|---|---|
| NOLOGIN owner | Schema ownership through controlled migration lane | Never application session |
| Migration operator | Separately authorized, ephemeral schema changes | No permanent app credentials |
| API identity | Bounded scoped reads only | No BYPASSRLS, superuser, ownership |
| Admission identity | Narrow atomic admission path only | No untrusted GUC/session context, unchecked issuance |
| Worker identity | Fenced claim/renew/complete/cancel operations only | Cannot issue grants or mutate membership |
| Auditor | Redacted constrained read access | No write or privileged definer functions |

Review complete `USING`/`WITH CHECK` policies on each affected table, restrictive semantics, GRANT/REVOKE and PUBLIC privileges, owner vs nonowner behavior, SECURITY DEFINER/search_path hazards and role inheritance. Require ENABLE+FORCE RLS and explicit tenant isolation under actual *non-superuser*, *NOBYPASSRLS* test roles. Do not trust arbitrary client-set tenant settings; server-owned identity must bind transaction-scoped context and be cleared on pooled-connection reuse.

## Transaction protocol / race acceptance
One atomic admission must resolve and fence session, site, membership and issuer in a documented consistent lock order (A12.9 proposes session → site → membership → issuer → grant → idempotency), then consume grant, reserve scoped idempotency, create job, immutable admission and audit event, with outbox default blocked. Every revocation writer must follow compatible locks or equivalent provable CAS. Verify under concurrent transactions that revocation winning first denies admission and admission winning first is ordered before revocation. Validate expiry against a trusted DB clock at the transactional decision point; a standalone precheck or a snapshot alone is insufficient.

Loss of COMMIT response must produce `commit_unknown`, never presumed failure/success. Reconcile read-only against exact tenant, site, actor, issuer, request fingerprint and idempotency key, without an implicit second write. Treat deadlock/serialization aborts as no admitted receipt until independently reconciled. No provider/outbox external effect enabled in this phase.

## Canonical migration sequencing (assessment only)
1. Inventory canonical migration ledger/checksums `0001`–`0011`, current schema/index/ownership and drift through a separately approved read-only resource assessment.
2. Review additive membership/issuer custody schemas and revocation audit, with reversible and monotonic revision lifecycle.
3. Review `public.sites(organization_id,id)` uniqueness/index build and lock impact, then composite foreign keys and existing data compatibility.
4. Design separate NOLOGIN owner, runtime identities, RLS policies, least-privilege grants, default-deny behavior and migration rollback/roll-forward.
5. Reconcile A12.1 candidate semantics against canonical schema and A12.5 disposable adapter; certify under a **newly authorized isolated** PostgreSQL 17 environment only.
6. Maintain strict legacy `public.jobs` isolation: never fallback from protected pilot01 admission into the legacy queue. Outbox dispatch is blocked; preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.
7. Require separate owner authorizations for SQL execution, database roles/policies, migration application, runtime integration and deployment.

## Future disposable PostgreSQL acceptance matrix
Independent test harness must use fresh synthetic data and non-superuser roles. Test cross-organization/site and actor/issuer mismatch, revoked/expired sessions, membership and issuer, viewer denial, forged provenance, stale revisions, real simultaneous admit-vs-revoke outcomes, idempotency collisions, transport-loss COMMIT reconciliation, RLS read and write constraints, tenant context leaks under pooled connections, migration drift/rollback, legacy queue bypass and blocked outbox. Verify repeatability under multiple connections/processes, and fail closed on unavailable evidence. Mock-backed unit tests included here only prove the offline contract's rejection behavior, **not** DB isolation or security.

## Merge and operations gates
Exact HEAD Standard CI and A12.10 offline CI SUCCESS; Tahseen formal GitHub APPROVED; separate exact PR+HEAD owner merge authorization. Even source-only merge grants zero access to existing databases, SQL execution, operational migrations, runtime wiring, workers, deployment, provider operations or public site writes.

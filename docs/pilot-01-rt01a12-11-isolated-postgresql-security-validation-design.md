# PILOT-01 RT01-A12.11 — source-only isolated PostgreSQL security validation design

## Authorization and non-execution boundary
This milestone designs a future isolated PostgreSQL 17 security-validation harness. **No database access, SQL execution, disposable or operational migration, runtime connection, worker, provider, deployment, public-site write or merge** is authorized. New files contain documentation, pure TypeScript contracts, network-free tests and dedicated offline CI only. No DB driver/SQL connection is imported and no CI database service is provisioned. `eligible-plan` and `complete-plan` are **design review results**, not permissions, execution evidence or release certification.

## Source references and canonical replay sequence
- `lib/db/migrations/0001_core.sql`: `public.organizations(id UUID)`, `public.sites(id UUID, organization_id UUID)`. Existing uniqueness `(organization_id,domain)` is not `(organization_id,id)`. An additive composite unique index needs separate compatibility, lock, and rollback assessment.
- `lib/db/migrations/0002_auth.sql`: `auth_sessions` resolves subject/global role with expiration and revocation; does **not** establish tenant membership or issuer authority.
- Existing ordered canonical migration lineage **0001–0011** must be re-examined in source, including dependency ordering and ledger/checksum expectations. An actual replay must occur only on an explicitly authorized fresh, disposable, empty DB; this PR does not create or replay anything.
- `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql` remains **unexecuted**, outside auto-discovered migrations. Its FORCE RLS configuration has no complete tenant policies or role grants.
- A12.7–A12.10 specify disconnected custody, transaction fencing, least-privilege roles and negative tests; none authenticates live identity or certifies real PostgreSQL isolation.

### Future replay acceptance gates (not executed)
1. Independently confirm a future disposable target is PostgreSQL 17, loopback-only, empty and newly created with synthetic credentials; refuse existing/Railway/staging/production/restored/customer DBs.
2. Compare expected migration order, source checksums, dependency graph and schema metadata with a fresh replay ledger. Record exact baseline, ownership, indexes, relationships, and privilege changes.
3. Review proposed additive membership/issuer registry, immutable audit, monotonically incremented revision and composite site FK requirements; assess lock cost, existing-row/backfill dependencies, reversible steps and schema drift.
4. Under a **separately authorized later milestone**, replay only into an isolated test DB. Never claim that static tests or minimal A12.5 synthetic fixtures establish full canonical compatibility.
5. Clean up disposable resources and retain test-only evidence without secrets; no runtime adapters, package exports or credential retrieval.

## Future least-privilege role/RLS acceptance matrix
| Future test identity | Positive path to verify | Mandatory negative path |
|---|---|---|
| NOLOGIN schema owner | Explicit object ownership without application login | No authenticated application session as owner |
| Migration operator | Scoped separately authorized migration-only operation | Cannot operate as persistent application identity |
| API reader | Allowed same-tenant, read-only query | Cross-tenant SELECT and INSERT/UPDATE/DELETE denied |
| Admission service | Exact same-tenant scoped admission transaction | No superuser/BYPASSRLS, arbitrary tenant GUC, grant issuance bypass or unscoped DML |
| Fenced worker | Only allowed owner/generation/lease transitions | Cannot issue grants, mutate membership, or dispatch providers |
| Auditor | Explicitly reviewed redacted tenant-scoped SELECT | No mutation or cross-tenant visibility |

All five PILOT-01 candidate tables must be independently checked for ENABLE + FORCE RLS, reviewed per-role `USING` and `WITH CHECK`, no unsafe PUBLIC grants, no SECURITY DEFINER/search_path or role inheritance privilege escalation. Positive and negative queries **must use NOBYPASSRLS non-superuser test roles**; privileged fixture setup is not proof. Check existing session ownership and trusted tenant derivation from site independently of any untrusted client-set session variable.

## Revocation, tenant-context and transport fault scenarios
| Scenario | Required future observation |
|---|---|
| Membership revocation commits before admission decision | Admission denied; no new job/admission/outbox |
| Issuer revocation commits before admission decision | Admission denied even if grant/session previously valid |
| Admission commits before revocation | Exactly one admission ordered before revocation; later admissions denied |
| Membership or issuer revision increments during race | Stale-version admission conflicts or denies; no TOCTOU bypass |
| Revoked/expired session; viewer role | Deny under trusted DB clock and server-owned identity |
| Two tenants share a pooled connection sequentially | No retained tenant context; no cross-tenant SELECT or write |
| Client tampers with tenant GUC or issuer fingerprint | No privilege elevation or trusted issuer construction |
| Concurrent identical idempotency keys | Exactly one durable tenant-scoped receipt; fingerprint conflict denied |
| COMMIT reply lost | Return `commit_unknown`; read-only scoped reconciliation, no automatic second write |
| Legacy queue reachable | No protected-admission fallback into `public.jobs` |
| Outbox eligible/dispatch attempted | Blocked, no provider/public-site writes |

Proposed concurrency test harness must use separate database sessions and deterministic barriers rather than time sleeps, cover both winning orders, lock/CAS ordering, serialization/deadlock behavior, missing rows and connection interruption. Test results must distinguish rollback from transport-indeterminate COMMIT, preserve immutable evidence, and explicitly refuse external effects. Future test role configuration must be reconciled with canonical migrations and real RLS policies; do not retrofit A12.5 superuser-only proof into a production-readiness claim.

## Negative tests in this PR
`lib/db/src/pilot-01-rt01a12-11-validation-plan.ts` enumerates the future acceptance matrix and design-only sandbox and race rules. `pilot-01-rt01a12-11-validation-plan.test.ts` rejects missing test coverage, missing role identities, cross-tenant/privilege safeguards, incomplete isolation prerequisites, unauthorized database access, armed execution, and unsafe retry/effects. They do not connect to PostgreSQL or simulate SQL locks and cannot certify production behavior.

## Future milestones and governance
A later milestone may seek **explicit independent approval** to implement and execute a disposable-only PostgreSQL harness with a newly created database, actual role/RLS checks and tested migration replay. That authorization must identify the specific disposable resource boundary and permitted SQL scope. Existing database access, runtime wiring, operational migration, workers, providers, deployments and public-site writes remain separately blocked. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

PR merge gates: exact-HEAD Standard CI SUCCESS and dedicated A12.11 offline CI SUCCESS, Tahseen's formal GitHub `APPROVED` review and separate owner exact PR+HEAD merge authorization. Source-only merge is not operational approval.

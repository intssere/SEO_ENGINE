# PILOT-01 RT01-A12.13 — Production security integration readiness (source-only)

## Authorized boundaries
Source-only route/worker inventory, migration lineage/compatibility assessment, disconnected contracts, mock negative tests and offline CI. **No** existing/disposable DB access, SQL execution, migration application, runtime wiring, workers, providers, deployments, public-site writes or merge. No code in this PR is imported by any operational route, DB entrypoint, middleware, runner or job. Synthetic `trusted_server_port` is a design marker and **never** evidence of actual authentication.

## Exact observed route → queue → provider call graph
Source references were inspected against `main` after A12.12 merge.

```text
artifacts/api-server/src/app.ts
  -> routes/index.ts: health, provenance, auth; requireApiAuthentication [config-dependent]
       -> mutation rate limit -> pilotRouter
    -> routes/pilot.ts GET /pilot/authorization
         -> isSameOriginRequest -> createPilotAuthorization(secret)
         -> five-minute signed nonce cookie + response
    -> routes/pilot.ts POST /pilot/run
         -> same origin + header/cookie equality + verifyPilotAuthorization(signature, age)
         -> clearCookie [does NOT revoke nonce across processes]
         -> enqueueProductionPilot() [no durable grant consumed at this boundary]
           -> lib/pilot-orchestration.ts requestPilotRun()
               -> validateProductionPilotPreflight() [pilot-runner.ts]
               -> enqueue(siteId): canonical public.jobs, advisory site/active-job dedup
               -> launchQueuedPilot(runId): setImmediate()
                  -> runQueuedPilot(runId)
                     -> public.jobs pending -> active UPDATE [no owner/generation fencing]
                     -> runProductionPilot(runId) [pilot-runner.ts]
                        -> executePilot()
                           -> loadContext and create/progress run
                           -> parallel readShopify/readGsc/readGa4/readCrawl
                           -> persist observations; evaluate/reconcile; update run state
               OR resumeQueuedPilots(): stale active marked failed at 20 minutes,
                  re-launches oldest pending legacy public.jobs
```

Source evidence:
- `routes/index.ts` lines 19–35: auth middleware before pilot router.
- `middlewares/auth-security.ts` line 70: authentication middleware returns `next()` if config not enabled; this is conditional source behavior, not evidence of current production env flags.
- `routes/pilot.ts` lines 10–40: cookie/header signed token followed by `enqueueProductionPilot` without a durable grant.
- `lib/pilot-authorization.ts` signs issue time+nonce; clearing cookie is not durable single-use nonce invalidation.
- `lib/pilot-orchestration.ts` lines 36–94: `requestPilotRun`, `runQueuedPilot`, `launchQueuedPilot`, `enqueueProductionPilot`, `resumeQueuedPilots`.
- `lib/pilot-runner.ts` line 226 onward: `executePilot` uses provider reads and subsequent persistence. Read-only acquisition is **still external network activity** and demands independent authorization.
- `pilot-01-rt01a11-trusted-runtime-boundary.ts`, A12.7–A12.12 contracts and test adapters are **disconnected** from the above route/queue path.

## Required trusted integration interfaces (no wiring here)
| Proposed future port | Authoritative source | Must deny |
| --- | --- | --- |
| `SessionResolver` | Live enforced server-side auth session, active/revoked/expiry check | disabled auth, forged principal, expired/revoked session, global-role-only tenant assumption |
| `MembershipResolver` | Canonical org + subject membership, DB-owned role/revision/expiry/revocation | cross-tenant actor/site, viewer, stale revision, membership revoke |
| `SiteResolver` | Trusted `sites(id,organization_id,is_active)` | requested site from another org, inactive site |
| `IssuerCustody` | Verified server-owned issuer registry/provenance and operation | caller-supplied issuer, fingerprint-as-signature, revoked/expired issuer, operation escalation |
| `ScopedAdmission` | Atomic grant consume + job + immutable receipt/event with idempotency and revision fence | duplicate/conflicting key, revoked membership/issuer, unknown COMMIT interpreted as success |
| `FencedWorker` | DB owner/generation/lease + immutable transitions and cancel | stale worker continuation, legacy queue bypass, unverified external provider reads |
| `TenantRlsContext` | DB-owned least-privilege role and trusted scoped transaction context | client-set tenant GUC, pool role/context leakage, BYPASSRLS and owner session |
| `MigrationAuthority` | Independently attested installed-history ledger, drift, owner and resource scope | table-count-only equivalence, inferred historical execution, ad hoc SQL, auto `drizzle push` |

The disconnected A12.13 TypeScript `assessTrustedBoundary` is **not** an authentication or runtime port. Its positive synthetic outcome only checks mock evidence agreement, never issues a grant.

## Canonical migration compatibility / authority ledger
| Source lineage | Observed evidence | Unresolved authority | Safe next gate |
| --- | --- | --- | --- |
| Main `0001_core.sql` | `organizations`, `sites` UUIDs, generic `public.jobs` | Installed-state/version/lock/owner unknown | Target-bound historical receipts in separately approved read-only assessment |
| Main `0002_auth.sql` | Session/global role/expiry/revocation, no tenant membership/issuer custody | Real tenant authorization absent | Separately reviewed additive custody design and migration |
| Main `0003`–`0011` | Canonical source replayed successfully in empty A12.12 PG17 CI | Existing DB ledger/checksums/data drift unknown | Independent installed-history and SHA-256 mapping |
| Historical UGP `0008`–`0011` vs integration `0012`–`0015` | INT-01/INT-02C source audit records semantic namespace collision/renumbering | Which existing resource, if any, has which historical DDL is unknown | Reconcile authority evidence before production migration numbering |
| `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql` | Five protected `pilot01` candidate tables, composite site index, FORCE RLS | Outside operational migrations; no production tenant policies or grants | Separate reviewed migration lane; source-only until authority attested |
| A12.12 test fixtures | PG17 empty replay + synthetic role membership/issuer and RLS | No installed resource schema comparison; no live authentic issuer | Treat as disposable evidence only |

Do NOT assume `runtime-bootstrap.ts` public-table counts or `lib/db/package.json` `push`/`push-force` are a historical migration ledger or a PILOT-01 deployment authorization.

## PostgreSQL role/RLS integration transition (design only)
1. Independently attest live migration history and canonical DB identity in **separately authorized** read-only lane, without inferring Production identity from repository architecture documents.
2. Define separate NOLOGIN ownership, migration operator, NOBYPASSRLS API read, fenced admission, worker and auditor identities. Confirm PUBLIC grants, inheritance, default privileges, SECURITY DEFINER and search_path restrictions.
3. Review table-by-table USING/WITH CHECK for membership, issuer, grants, jobs, admission, events and blocked outbox. Demonstrate cross-tenant read/write denial, role switch/pool reset and no arbitrary tenant GUC spoofing with actual non-superuser clients.
4. Design revocation mutations through a DB-authoritative protocol. A12.12's tenant advisory hash lock is **cooperative**; uncoordinated writes may bypass it. Require independently verified serialized grant issuance/admission/revocation, strict revisions and trusted DB clock.
5. Plan additive migrations, composite site uniqueness/FKs, backfill, rollback and index lock costs without modifying canonical migration source or applying any SQL now.
6. Keep the original `public.jobs` route and worker unable to bypass PILOT-01 admission; do not silently enable/redirect either queue. Preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

## Fail-closed negative acceptance before any runtime approval
- Missing or disabled auth, missing session evidence or missing/cross-tenant site/membership/issuer must deny.
- Untrusted caller-authority markers, expired/revoked/stale records, viewer, wrong operation, identity mismatch must deny.
- Signed pilot nonce replay/CSRF success must **not** be treated as durable membership or one-time grant.
- Both API route and queue-resume must fail closed if secured admission unavailable; no legacy fallback on error/timeout.
- Worker may not perform provider reads or progress/evidence writes without fresh revocation + generation-fenced authority; restart/stale-worker races must fail closed.
- COMMIT acknowledgement ambiguity must be read-only reconciled against the exact scoped idempotency receipt; no speculative replay or external effect.
- Untrusted tenant GUC, cross-tenant role reads/writes, pool context reuse and privileged role escalation must fail.
- Existing migration lineage conflict or missing installed-state receipts must block operational migrations.

## Governance
A12.13 remains source-only; an exact-HEAD Standard CI SUCCESS + dedicated A12.13 offline CI SUCCESS + Tahseen GitHub APPROVED review + separate exact PR/HEAD owner authorization are prerequisites for merge. Even merged source-only artifacts grant **zero** database, SQL, runtime, worker, provider, deployment or public-site authority.

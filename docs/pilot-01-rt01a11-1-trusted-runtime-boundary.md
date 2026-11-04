# PILOT-01 RT01-A11.1 — Disconnected trusted runtime identity boundary

**Base:** `main` at `8b3e3166d966d752706ddf303d1e40ca90eda431`. **Scope:** source-only mock-backed contract and negative test coverage. This is neither a runtime integration nor deployment authorization.

## Finding and purpose

The existing `artifacts/api-server/src/routes/pilot.ts` authorizes a run with a signed, short-lived token/cookie then calls `enqueueProductionPilot()`; it does not consume the RT01 durable grant. `auth-security.ts` permits unauthenticated API requests when `AUTH_ENFORCEMENT_ENABLED` is false. Merely setting the source marker `server_verified_session` cannot establish a real session. The generic `jobs` table in `lib/db/migrations/0001_core.sql` has no grant/issuer/admission receipt/worker generation fields; the RT01-A7–A10 tests use explicitly disposable schema fixtures, not this canonical table.

## Disconnected contract

`pilot-01-rt01a11-trusted-runtime-boundary.ts` models a future server-**owned** session binding (subject, session ID, role, session expiry) to independently supplied session, site, membership and issuer evidence. Auth enforcement must be true. This is a pure injected-port model and must **never** accept a caller-authored principal as an authenticated fact. It reuses `resolveTrustedPilotContext`, preserves its fail-closed denial/unavailable behavior, and returns the existing frozen scope context only on exact match. `siteId`, `issuerId`, and operation are *candidate lookup keys*, never a permission grant. There are **no** imports into routes, worker, scheduler, storage, or production startup.

Mock-backed tests reject disabled auth, absent/viewer session, forged actor/session/role, incorrect expiry, revoked or stale session, cross-tenant membership, inactive or mismatched site, issuer forgery, wrong operation, write intent, and injected store errors.

## Release-blocking work not performed

1. Identify authoritative principal creation, cookie/session cryptography, and **enforced** authentication configuration in actual runtime. This contract itself does not verify the authenticity of an `AuthPrincipal` object.
2. Identify live tenant membership, site ownership and issuer authority tables and custody; develop a server-owned context adapter and negative HTTP tests. Keep `AUTH_ENFORCEMENT_ENABLED` disabled paths from issuing pilot permissions regardless of route configuration.
3. Reconcile UGP/CVI migration provenance, installed schema, tenancy/FK/index/constraints and least-privilege data access with a separately approved migration plan; do not treat the random fixture schema as an installed schema.
4. Atomically bind grant consumption to pending job and immutable receipt in an authorized real adapter, and explicitly prevent runtime dispatch without those facts.
5. Design and certify generation-fenced worker lease, cancellation, outbox and provider-effects authorization independently. The current legacy queue is separate.
6. Independently certify exact runtime image, secrets and environment bindings before any deployment or provider reads.

## Governance

No live DB access, migrations, provider operations, operational worker execution, deployment, merge, public-site write, or change to `AUTH_ENFORCEMENT_ENABLED`, `PUBLIC_SITE_WRITES_ENABLED=false`, or `AI_PROPOSAL_GENERATION_ENABLED=false`. The mock's `verified` result is **not** a runtime admission/dispatch permit. Keep PR draft until Standard CI SUCCESS and independent technical review; request separate owner exact-HEAD merge authorization.

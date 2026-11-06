# PILOT-01 RT01-A12.8 — disconnected transaction custody and revocation fences

## Authority and isolation
Owner-authorized source-only contracts, mock-backed concurrency/tenant negative tests, documentation and offline CI. No database access, SQL, migrations, connection strings, runtime import, worker activation, provider operation, deployment, public-site writes or merge. New files only; no runtime entrypoints.

## The unresolved A12.7 risk
A12.7 independently verifies session/site/membership/issuer evidence but cannot guarantee authority between a check and the durable admission commit. A type-level `ServerVerifiedPrincipal` marker is not authenticating proof and must not be accepted from any request body. A formatted SHA-256 value is not a signature or evidence of authentic issuer ownership.

## Proposed future transaction boundary (not implemented)
* Resolve the session via enforced server-side auth; derive organization from independently trusted site ownership. Require active tenant membership and server-owned issuer custody.
* In the **same** transaction as grant consumption, idempotency reservation, job creation, admission receipt, audit event and outbox entry, re-read and lock/version-fence authority and verify request scope plus strictly matching positive membership and issuer revisions.
* Revocation must serialize against admission: a revocation committed before the admission authorization boundary must deny; an admission committed first is ordered before revocation. A plain preflight SELECT or READ COMMITTED snapshot without suitable row locks/version CAS is insufficient. Database isolation and lock order require independent design and validation.
* Validate expiry against trusted database time at the transactional decision point. Expiry and revocation changes must invalidate authority consistently. Cover sites, sessions, tenants, issuer, grants and idempotency keys.
* On transport uncertainty return `commit_unknown` and reconcile read-only by exact tenant, site, idempotency key and request fingerprint. Never automatically issue a second admission write. Workers/outbox cannot dispatch providers under this authorization.
* Role policy must be least privilege; global admin cannot grant itself tenant membership. Deny a viewer role and any cross-organization, cross-site, issuer or actor mismatch.

## What the new mock actually proves
`pilot-01-rt01a12-8-disconnected-transaction.ts` defines a future port and pure request/evidence validation. In-memory tests illustrate denial on mismatch, stale revisions, expiry and revocation; deterministic scheduling demonstrates the ordering required from a future atomic implementation. The synchronous mock is **not** a lock, database transaction, concurrency stress test, authenticated adapter or production-safe authorization system. It does not eliminate TOCTOU in any live system.

## Acceptance gates
Standard CI and dedicated offline A12.8 CI at exact PR HEAD, Tahseen formal GitHub APPROVED review, and separate owner authorization for exact PR + HEAD merge. Merging source-only contracts would not authorize operational adoption. Future durable database implementation, RLS/role grants, migration application, real concurrency testing and deployment all require separate authorization. Preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

# PILOT-01 — RT01-A12.4 disconnected admission and durable persistence contract

**Authorization:** source-only contracts, mock-backed negative tests and security documentation, draft PR only. Base `main` `ed70bc347eac9a8ab853b2179b158dab07e67d72`.

## Scope and exact semantics

The new TypeScript module `lib/db/src/pilot-01-rt01a12-4-disconnected-admission-contract.ts` is **not exported through a runtime entrypoint** and does not import SQL, networking or production authentication. Its companion Node tests supply an in-memory mock implementing `DurableAdmissionPort`. A dedicated CI workflow runs only these disconnected mocks.

A future real database adapter MUST satisfy all of the following **in one transaction**, without runtime fallback:

1. Independently establish an active server-authenticated session, tenant/site membership and issuer authority. The `source: server_verified_principal` property in this contract is **not proof of identity** and can be forged by callers. Production must instantiate it only inside a trusted authentication boundary; external requests may not provide this object.
2. Verify matching grant, organization, site, actor, session, issuer, provenance SHA-256, read-only operation, current non-revoked state and DB-clock expiry.
3. Atomically consume the grant, reserve the idempotency key with exact request fingerprint, create the job, and append immutable admission and event evidence. All writes commit together or roll back together. No committed result on partial evidence.
4. For a replay, read and compare the entire scope and request fingerprint. An exact committed replay may return its pre-existing receipt; a mismatch must be `conflict` or `denied`, never reuse another tenant's receipt.
5. An unknown transaction outcome is `commit_unknown`, not success. Do not automatically repeat admission; read-only reconciliation may subsequently return a matching durable receipt. Unknown reconciliation must not be treated as denied or authorization to retry writes.
6. Every job/lease/renewal/completion/cancellation and outbox eligibility mutation must compare exact organization, site, job, worker owner, generation, and **database-clock** unexpired lease. Worker generation changes only through authorized atomic CAS. State change + immutable event evidence must be in the same commit; an expired/stale owner is always fenced.
7. Outbox payloads remain blocked by default. Even a successful `outbox_eligible` mutation is **not authorization for a provider or public-site write**.

## What mock-backed tests verify

- Missing/expired/unsigned principal markers, mismatched tenant/site/actor/issuer, unsupported write operation, blank/malformed IDs and fingerprints are rejected before mock adapter calls.
- Committed receipts with wrong grant, request hash, session, tenant/site, issuer, operation, transaction ID or timestamp are not accepted.
- Commit exceptions yield `commit_unknown`, reconciliation is separate and read-only, and no implicit admission replay takes place.
- Invalid lease generations, missing owner, malformed lease timestamps, unsupported provider dispatch and forged result evidence are rejected.
- Explicit durable-port failures preserve denied/conflict/unavailable/fenced/commit_unknown results without upgrading them to success.

## Limits and mandatory next gates

The facade **does not establish database atomicity, prevent concurrent calls, validate lease expiration against DB time, independently authenticate principals, verify issuer custody, enforce tenant RLS, or implement a transaction**. In particular, a mock returning `applied` or `committed` is not durable proof; this interface describes invariants the separately authorized adapter must implement. A future integration requires source review and negative tests with fault injection for COMMIT uncertainty, concurrent replay, session revocation, issuer revocation, stale generations, receipt pairing and RLS role enforcement.

No database connections, SQL execution, migration application, runtime wiring, worker activation, deployments, provider operations, public-site writes or merge are authorized. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

**Merge gates:** successful Standard CI and offline-contract CI on exact HEAD, formal GitHub `APPROVED` by Tahseen, then a separate explicit owner authorization for that PR and exact full HEAD SHA.

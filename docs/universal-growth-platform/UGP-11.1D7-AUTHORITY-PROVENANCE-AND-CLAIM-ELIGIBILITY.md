# UGP-11.1D7 — Durable P9 Authority Provenance and Claim Eligibility Contract

**Status:** design and fail-closed review only; no grant of runtime claim authority.  
**Source:** `initiative-universal-growth-platform` at `a2c7e3919fb68225b6c9edbf9979186ab4049453`.

## Finding

Existing P9.6 pause/drain/kill/resume transitions are *deterministic proposed reviews*, not authenticated durable control decisions. D5 stores only `source='fixture_only'`, enforced by a SQL CHECK. D6 explicitly requires `source='certified_p9'`; therefore it cannot claim any job under the current database schema. The current separation is intentional.

## Minimum independent authority chain (NOT YET IMPLEMENTED)

1. An identified, authenticated, separately governed P9 control operator must submit a signed or otherwise independently authenticated decision under a defined authorization policy. A caller-supplied snapshot or arbitrary database insert must never count as authority.
2. Persist immutable decision lineage (tenant, site, principal/role, policy version and fingerprint, action, prior revision/fingerprint, effective time, expiry, nonce, cryptographic binding, issuance evidence) into an append-only auditable record. Credentials, cryptographic verification and reconciliation are future work.
3. Monotonically sequence control revisions per tenant/site. Reject replay, conflicting history, missing predecessor, gap, noncanonical timestamps, tampering, and cross-tenant references; kill latches require separate recovery review.
4. Materialize current control projection only from validated lineage with atomic revision monotonicity. `running` cannot be inferred from an absent row or a stale observation. The immutable lineage and projection must share transaction boundaries.
5. Atomically lock the authority projection and selected queued job, verify admission provenance and existing job-bound control revision/fingerprint, recheck database-clock work windows and P9.5 retry eligibility, then increment claim fence and attempts. The order of locks and isolation properties must be tested for races and deadlocks.
6. A successful queue claim is **never** an external execution or publishing grant. Provider-specific execution preflight must re-evaluate separate independent policy/scope/consent and side-effect idempotency.
7. Lease timeouts do not imply safe retry. Crash, lost receipt, conflicting settlement, expired leases and unknown remote outcomes must produce manual intervention until corroborating non-execution evidence exists.
8. Evidence must include forged-origin, stale/replayed decision, control-change racing a claim, interrupted commit, cross-tenant access, and concurrent workers on a dedicated disposable DB.

## D7 acceptance boundary

The implemented increment is solely a pure *denial-focused provenance precheck* plus tests. It must reject the existing `fixture_only` source, any absent/expired/untrusted credential evidence, invalid lineage and every purported `certified_p9` label without an independently implemented verification mechanism.

**No production schema changes, provider access, scheduler/worker, outbound send, or live claim are permitted.** Neither the existing P9.6 control reviews nor `D6` can be promoted to authority by changing SQL CHECK constraints. The release decision remains **NOT_GRANTED**.

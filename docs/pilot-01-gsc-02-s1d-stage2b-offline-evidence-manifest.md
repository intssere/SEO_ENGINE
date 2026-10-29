# PILOT-01 / GSC-02 — S1D Stage 2B offline execution-evidence manifest (proposal only)

**Status:** UNEXECUTED, UNAUTHORIZED, source-only review packet. **Baseline:** main `1a55c3e2a020366edef112e90d6221217f3c09af`, PR #1219 complete, post-merge CI #40860388409 SUCCESS. This document is neither a credential, a runnable script, an execution permission, nor proof of PostgreSQL properties.

## Source of truth and immutable inputs

- Candidate DDL, insert and consume statement definitions: `artifacts/api-server/src/lib/gsc-s1c-postgres-atomic-proposal.ts` at the pinned baseline above. Its `gsc_s1c_proposal_only` schema is intentionally absent.
- Prior Stage 2A contract: `docs/pilot-01-gsc-02-s1d-disposable-postgres-stage2a-readiness.md`.
- SQL manifest must be independently generated from **exact bytes** of three SQL constants (`GSC_S1C_SCHEMA_PROPOSAL`, `GSC_S1C_INSERT_PROPOSAL`, `GSC_S1C_CONSUME_PROPOSAL`), with distinct SHA-256 digests for each statement, aggregate ordered-manifest digest, encoding, byte count, source blob SHA, commit SHA and reviewed parameters. **No hashes are asserted here before independent calculation.** Reject any runtime SQL that differs byte-for-byte from separately approved statements.
- Candidate bind types: `$1 bytea(32)` state digest; `$2–$4 uuid` organization/site/principal; `$5–$8 bytea(32)` session/client generation/redirect/PKCE-challenge digests. Only synthetic values. Never interpolate identifiers or untrusted SQL.

## Required pre-authorization fields (currently UNVERIFIED)

| Field | Mandatory independent evidence | Status |
|---|---|---|
| Disposable fixture identity | New uniquely named local instance, owner, process/container identity, data directory/volume identity, isolation proof and no reused app bindings | MISSING |
| Network isolation | Loopback-only endpoint or independently proven equivalent; zero remote forwarding / Production reachability | MISSING |
| Credential boundary | Newly generated disposable least-privilege test credentials; no inherited `DATABASE_URL`, Railway secrets, customer snapshots or Replit credentials | MISSING |
| SQL and harness | Exact code SHA, separate DDL/insert/consume SHA-256s, aggregate ordered manifest digest, fixed named test cases and argument types | MISSING |
| Bounds | Max elapsed time, connections, rows, lock timeout, statement timeout, startup/restart limits and failure stop conditions | MISSING |
| Custody | Named operator, independent PostgreSQL/security reviewer, evidence destination, timestamp, redaction and retention rules | MISSING |
| Owner approval | Separate exact-target signed-off authorization naming permitted fixture provision, SQL, tests and disposal as distinct actions | MISSING |

An operator must not infer affirmative fields from source code, CI results, labels or tool availability. If any field is missing, **STOP** before connecting or executing.

## Twelve independently evidenced cases

| Case ID | Capture minimum evidence | PASS boundary |
|---|---|---|
| unique_state_insert | SQL fingerprint; issued/expires DB timestamps; inserted row count and profile, issuer and scope | One row; exact GSC-only constants; valid DB-owned TTL |
| duplicate_issue_never_resets | Before/after immutable digest, actor/client binding and consumption timestamp; second insertion row count | Duplicate returns zero and does not overwrite/reopen |
| two_connection_same_state_race | Two distinct backend sessions, transaction isolation, barrier/lock chronology, individual RETURNING counts, commit status | No more than one committed consume |
| wrong_org_site_principal_session_denied | Four independent mismatch cases with distinct synthetic bindings; unchanged before/after state | Zero returned; valid original path remains eligible |
| wrong_client_redirect_pkce_denied | Three independent mismatch cases, no generic-Google fallback, unchanged original state | Zero returned, original eligibility intact |
| expired_and_early_state_denied | DB clock and row validity boundaries, transaction timing, returned count | Early and expired deny; valid state accepts only once |
| row_lock_wait_past_expiry_denied | Two physical connections; A row lock; B started before expiry, lock obtained after expiry; clock and update result | B must not consume after expiry |
| rollback_and_connection_loss | Explicit rollback; committed receipt; disconnect before/after commit acknowledgment and authoritative follow-up using approved read-only evidence | State is not fabricated from client uncertainty; no automated token exchange/retry |
| post_restart_replay_denied | Before restart committed tombstone; approved local process restart; verified same data directory; replay count | Consumed state still denies after restart |
| cross_transaction_tenant_isolation | Tenant-specific roles and schema grants; access-denial outcomes; safe redacted evidence, RLS decisions if used | No unauthorized read or consume; no leakage via error |
| failed_token_exchange_does_not_reopen_state | Synthetic downstream failure after committed consume, replay attempt | Tombstone unchanged; no reopening |
| schema_privilege_and_retention_boundaries | Role privilege snapshot; denied unrelated schemas; deletion policy and retention window versus replay threat model | Least privilege and replay-safe retention evidenced |

The 12 cases are **PLANNED**, not PASS. The term “two connections” means independently opened backend connections/transactions, not concurrent promises sharing one session.

## Technical caveats requiring explicit specialist disposition

1. **PostgreSQL clocks:** `statement_timestamp()` in issuance and `clock_timestamp()` in consume have different semantics. Prove with actual row-lock timing that the consume condition is evaluated after the wait. Check the stored `consumed_at` is a defensible event time and verify no post-expiry row is committed. A SQL inspection alone cannot certify it.
2. **Crash ambiguity:** Connection loss during commit acknowledgment is indeterminate to the caller. Never treat a timeout as proven rollback; never automatically retry external OAuth token exchange on an uncertain result.
3. **Tenancy:** WHERE equality restrictions are not a substitute for grants/RLS, independent trusted bind provenance or non-disclosure. Do not grant generic table inspection to an application role by default.
4. **Clock/expiry boundary:** Capture DB clock samples with uncertainty and use a deterministic gate rather than timing assumptions; clarify if SQL needs amendment after experiments.
5. **Replay recovery:** A restored earlier snapshot may resurrect unused state. Define recovery authority/tombstone lineage separately; process-restart evidence alone cannot prove all restore behaviors.
6. **PKCE verifier custody:** The database contains only digest bindings, not the trusted PKCE verifier or authenticated session. These remain separate production architecture gates.
7. **SQL least privilege:** DDL belongs to an isolated test owner, not the eventual consume-only app role. Independent specialist reviews `search_path`, qualified names, privileges, retention and row-security coverage.

## Execution contract template (leave unfilled until independent verification)

- Fixture immutable ID / isolation witness: **UNSET**
- Approved disposable backend host and role: **UNSET**
- Source commit, tree/blob SHA and three statement digests: **UNSET**
- Approved parameter corpus and case list: **UNSET**
- Maximum time / rows / connections / locks: **UNSET**
- Operator / independent specialist / evidence receipt path: **UNSET**
- Separate owner authorization reference: **NONE**
- Fixture disposal authorization: **NONE**

**Stop conditions:** unexpected hostname or role, inherited application secret, any customer data, query-hash mismatch, unidentified connection, timeout without authoritative state, tenant leakage, early/late state acceptance, unrecognized SQL or schema, unexpected permissions, or missing independent operator witness. Stop and preserve *redacted* evidence without attempting Production remediation.

## Later gates unchanged

Issue #1159 Production PostgreSQL G1–G5 and recovery remain OPEN. No real Google consent, token exchange, credential persistence, `sites.list`, Search Analytics, provider writes, Railway/Replit deployment, main merge or Shopify mutation follows automatically from a disposable success. `PUBLIC_SITE_WRITES_ENABLED=false`; `AI_PROPOSAL_GENERATION_ENABLED=false`. Stage 2B execution requires a **new, specific owner authorization** after actual fixture identity and independently checked statement hashes are supplied.

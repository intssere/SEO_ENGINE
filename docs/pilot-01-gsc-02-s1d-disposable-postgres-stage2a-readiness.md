# GSC-02 S1D — Disposable PostgreSQL certification, Stage 2A readiness packet

**Classification:** Source-only, offline preparation. **No database creation, connection, SQL execution, migration, network traffic, provider request, consent, deployment or secret access.**

## Immutable prerequisite

- GitHub canonical main / certified S1C source baseline: 3523d7913707c52a0bd91b7fee0117850c2218f9.
- S1C exact main post-merge CI: https://github.com/intssere/SEO_ENGINE/actions/runs/40754466603 — SUCCESS, not proof of PostgreSQL semantics.
- S1C candidate files: artifacts/api-server/src/lib/gsc-s1c-postgres-atomic-proposal.ts and its offline tests. Their proposed schema gsc_s1c_proposal_only is **intentionally nonexistent**.
- Production DB certification issue #1159: **OPEN**. G1 binding, G2 private least-privilege SQL channel, G3 authorization, G4 identity, G5 migration ledger and recovery evidence cannot be inferred from S1C.
- This S1D document and test-plan code are nonexecuting evidence; a syntactically conformant plan has **zero authority** to use any database.

## Objective: prove real transaction behavior only in a new disposable local PostgreSQL fixture

The earliest contemplated execution stage is **S1D Stage 2B**, independently approved after Stage 2A review. The test database must be newly created for this experiment, contain synthetic rows only, and be locally accessible over loopback or an equivalently proven isolated mechanism. It **must not** be a Railway production/staging database, remote endpoint, network-forwarded Production database, restored customer data instance, existing app database, Replit workspace target, or application credential. No inherited DATABASE_URL or provider secret is ever acceptable. The exact test DB and role must be independently identified before any SQL statement, and its lifecycle/disposal must be recorded without secret material.

**No Stage 2B execution adapter is provided here.** The authorized operator must first prove the disposable environment, exact query fingerprints, and a controlled connection method. A future adapter requires its own independently reviewed source and test PR; do not connect the S1C proposal strings to an existing SQL helper or production migration runner.

## S1D conformance matrix — twelve real-engine cases to execute only after separate authorization

| ID | Minimum expected evidence |
|---|---|
| unique_state_insert | New synthetic SHA-256 state digest inserts one row; correct GSC profile/scope/issuer; 10-minute DB-owned expiry |
| duplicate_issue_never_resets | Duplicate insert returns no row; never resets consumed_at or changes actor/generation binding |
| two_connection_same_state_race | Two independently opened PostgreSQL sessions coordinate on the same digest; at most one conditional UPDATE returns consumed; other returns no row |
| wrong_org_site_principal_session_denied | Each foreign actor/site/session combination independently returns zero rows; valid original attempt remains possible |
| wrong_client_redirect_pkce_denied | Client generation, redirect and PKCE-challenge digest mismatch cannot consume; no generic-Google fallback |
| expired_and_early_state_denied | Exact validity boundaries deny early and expired attempts; only an unexpired committed state may be consumed |
| row_lock_wait_past_expiry_denied | Session A holds lock until after expiry while B waits; B cannot consume after expiry; examine DB clock sampling and row recheck |
| rollback_and_connection_loss | Rolled-back consumption is not treated as committed; connection loss is **indeterminate** to client and never safely auto-retried as OAuth grant |
| post_restart_replay_denied | A committed consumed row remains consumed after approved disposable DB process restart; replay cannot succeed |
| cross_transaction_tenant_isolation | Tenant/site binding cannot be crossed or introspected; future role/RLS design requires independent attestation |
| failed_token_exchange_does_not_reopen_state | Simulated post-consumption exchange failure never reopens the spent state; fresh explicit consent required |
| schema_privilege_and_retention_boundaries | Candidate role cannot touch unrelated schemas, runtime credentials or customer data; spent-state retention and cleanup safety recorded |

## Fail-closed acceptance and evidence requirements

1. **Pre-execution:** cite the source-pinned S1C SQL exact commit and fingerprints; demonstrate no Production app/client secrets; identify isolated fixture and permitted operator, role, loopback address class and time-bounded single experiment. Approval must specify the concrete fixture and allowed statements. Do not print actual connection URIs or auth data.
2. **Test run:** record PostgreSQL version, isolation level (begin with READ COMMITTED), two independent backend/session IDs with redacted safe identifiers, exact sequencing, lock timing, affected-row counts, errors and an independently reproduced verdict. Use synthetic UUIDs/digests only. Reject arbitrary SQL parameters, unknown statements, uncontrolled retries, remote connections and unexpected schema.
3. **Concurrency:** enforce barriers so the race is real. Parallel promises within one JavaScript process do **not** prove two PostgreSQL transactions. In particular verify PostgreSQL rechecks a row after lock wait and that clock comparisons are evaluated safely at expiry boundaries.
4. **Adversarial:** test duplicate issue after consume, mismatched tenant/site/principal/session/client/redirect/PKCE, late callbacks, rollback, commit, restart and connection loss. A generic error message or claimed transaction result does not establish durable state.
5. **Recovery/retention:** distinguish committed vs rolled-back state and assess backup/restore rollback risk. Do not delete consumed tombstones before the replay-risk window. A restored snapshot that permits replay is a fail, not a pass.
6. **Review:** independent database/security specialist signs the full evidence packet and outstanding defects; Tahseen then reviews the exact source PR if code changes. The reviewer must explicitly distinguish a certified *disposable fixture* from #1159 Production authority and Google OAuth readiness.
7. **Cleanup:** only the independently identified disposable test resources may be disposed of under a separate precise authorization. Never use generic DROP/DELETE on Production or a reused service. A cleanup instruction is not implied by permission to run the test.

## Precise future Stage 2B execution contract — NOT CURRENTLY AUTHORIZED

Any operator request must specify: **(a)** exact isolated fixture identity and proof of isolation; **(b)** externally approved ephemeral role and allowed single test database; **(c)** test-script/git SHA and SHA-256 SQL manifest; **(d)** all twelve numbered cases; **(e)** narrow allowed DDL/DML on the disposable schema only; **(f)** maximum duration, rows, connections and lock timeout; **(g)** named independent reviewer, evidence destination and redaction policy; **(h)** stop/cleanup behavior; **(i)** separately recorded owner authorization for the exact target. Without every field, **STOP**.

This Stage 2A preparation may be code-reviewed and merged, but merging it authorizes **none** of Stage 2B. The current implementation neither creates, connects to nor touches a PostgreSQL database.

## Later hard stops that Stage 2B cannot resolve by itself

Production database issue #1159 G1–G5; schema/migration ledger collision; application-to-database provider binding; production role grants; real authenticated principal/session trust; OAuth issuer/PKCE verifier and nonce custody; refresh-token encryption/revocation; exact Google Cloud client/redirect attestation; independent approvals for consent, token exchange, credential persistence, discovery and Search Analytics. Even perfect disposable replay tests do not open these gates.

## Evidence status

**S1D Stage 2A prepared / Stage 2B not authorized or run.** All eleven structured certification and authorization flags in the source assessment remain FALSE, even for a syntactically complete planning packet.

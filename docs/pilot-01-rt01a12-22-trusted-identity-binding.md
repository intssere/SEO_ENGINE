# PILOT-01 RT01-A12.22 — disconnected trusted tenant identity binding

## Source-only purpose
Adds one new, **unexported** application-neutral binding facade between the existing A12.7 server-owned custody resolver, A12.8 transaction contract and A12.20 atomic adapter. It accepts only site, issuer, operation, grant and request fingerprints as untrusted lookup intents; it **never** accepts organization, actor subject, role, session, issuer provenance, revisions or tenant GUC as authority. All custody facts originate in injected server-owned ports, then A12.20 **must independently revalidate and lock them within the single PostgreSQL admission transaction**.

## Reuse ledger
- A12.4 `AdmissionIntent` and server-verified principal types; A12.7 `resolveDisconnectedCustody` and custody ports.
- A12.8 `TransactionRequest`, revision fences and `DisconnectedTransactionContract` fail-closed receipt checks.
- A12.20 single-transaction row-locked authoritative custody admission and fail-closed unknown-commit behavior, not modified.
- A12.21 NOLOGIN/NOINHERIT/NOBYPASSRLS role candidates and default-deny FORCE RLS; not modified.
- Canonical 0001–0011 and A12.1/A12.14/A12.16 schema candidates are replayed **only** through previously attested A12.20 and A12.21 disposable PG17 harnesses.

## Test design
A12.22 mock-backed tests: forged organization/session/revision and role claims ignored; cross-tenant site rejection; missing, expired, viewer and revoked sessions; inactive/revoked tenant membership; wrong tenant, actor, provenance or expiry issuer; malformed request denial; trusted source outage; revocation between preliminary verification and authoritative transaction check; ambiguous transaction response never retried.

The dedicated CI workflow re-executes existing **A12.20** PG17 concurrent admission-versus-revocation, rollback, stale revision and cross-tenant tests in a brand-new, attested loopback `pilot01_disposable_rt01a12_20_ci` container. A separate independent job re-executes **A12.21** role/RLS, forged GUC, non-superuser SET ROLE escalation, cross-tenant and connection pool reset tests against its own fresh, attested `pilot01_disposable_rt01a12_21_ci` PostgreSQL 17 container.

## Invariants and open security risks
- No SQL candidate was required: A12.21 intentionally leaves both shared service roles default-denied; adding a caller-settable tenant policy or granting authority here would create a bypass. A12.22 does **not** grant operational database authorization.
- Types alone are not security. Production must prove trusted session authentication independently of client headers/cookies, CSRF, token signature and provenance; the injected mock `session.current()` does NOT supply that proof.
- Preliminary A12.7 evidence is stale immediately after resolution. Only A12.20's transactional DB-time lock/fence checks provide the asserted revocation serialization, and the adapter has not been integrated with restricted roles, production credentials or the public API.
- The A12.20 adapter currently uses a privileged disposable test connection; A12.21 API/worker roles intentionally see zero rows and cannot invoke it. No SECURITY DEFINER entrypoint, privileged tenant authorization RPC, operational migration or cryptographic token issuance has been introduced.
- No evidence of production migration ledger compatibility, authenticated issuer provenance, arbitrary malicious privileged DB activity, production connection pool identity safety, worker activation, provider access or deployed security readiness is asserted.
- `commit_unknown` is returned on ambiguous transaction failures. There is no automatic retry; read-only reconciliation still requires independent historical revision evidence and is not certified here.

## Absolute restrictions
No existing database access, SQL execution against operational databases, production roles, runtime wiring, worker activation, provider operations, public-site writes, deployment or merge. No operational migration application. Only GitHub Actions service PostgreSQL 17 with synthetic credentials and exact arming/empty-target attestation may execute the reused SQL candidates.

## Governance gates
Require exact-HEAD Standard CI SUCCESS and dedicated PG17 CI SUCCESS (both jobs), Tahseen formal GitHub APPROVED review, zero unresolved review threads, and separate owner exact-HEAD merge authorization. This draft PR is **not** an authorization to change database roles or deploy.

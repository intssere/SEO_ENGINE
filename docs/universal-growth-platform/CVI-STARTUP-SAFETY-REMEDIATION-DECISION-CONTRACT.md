# CVI Startup Safety — Remediation Decision and Acceptance Contract

**Status:** PROPOSAL ONLY. No production policy approved, no runtime change authorized.  
**Baseline:** UGP `329c430e216666819a6b9f1e04b57ee7235d18b9` (GitHub Actions #40900436419 succeeded).  
**Governance:** [#1152](https://github.com/intssere/SEO_ENGINE/issues/1152) and [#1143](https://github.com/intssere/SEO_ENGINE/issues/1143).

## Source-level gap and evidence limitations

At the inspected UGP baseline, `artifacts/api-server/src/index.ts` reads `process.env.DATABASE_URL`. When nonblank, it awaits `ensureDiamondShelfIdentity()` and throws unless identity is `ready`. When missing or blank, it logs a blocked identity status but then calls `app.listen(port, ...)`. No process-level security guarantee for a DB-free production deployment follows from the informational log. This is **source-level evidence**, not verification that a public production deployment is vulnerable.

The merged `cvi-offline-startup-policy-contract.ts` is **unwired** and operates on fixture values; its unit tests do not test `index.ts`, actual HTTP serving, Railway variables, or database connectivity.

## Decisions required from Platform + Security

1. **Deployment classification:** Define trusted, immutable production/staging/offline-test mode selection. An HTTP request, caller header, or environment variable alone without deployment attestation must not elevate offline execution to an operational server.
2. **DB-required policy:** Agree that production/staging serving without a configured, reachable, correctly identified database fails before `app.listen` (proposed, not yet approved).
3. **Offline behavior:** Define exactly which test-only endpoints, if any, may listen without a DB; no credentials, GSC, cross-tenant data, CVI read/write/execute/publish, queues, or background tasks. A stricter no-listen offline execution is preferable unless a real offline listener is necessary.
4. **Route/readiness matrix:** Decide whether unauthenticated liveness remains accessible versus protected readiness and API routes; define 503 and error-body privacy semantics. If no listener starts, HTTP 503 cannot be promised by the application process itself.
5. **Rollback and operations:** Define staging binding attestation, immutable deployment revision, reversible change/rollback gates, and owner signoff; never trigger `db:bootstrap` implicitly.
6. **Authority separation:** DB identity readiness is not tenant authorization. #1143 remains independently blocking CVI mutation and nonce-write activation.

## Candidate implementation — NOT authorized by this document

- Validate deployment mode and normalize DB binding presence before network listening.
- For production/staging: fail before `app.listen` on absent/blank DB, failed connection, inactive or unexpected identity, or indeterminate attestation.
- For explicit offline mode: allow only the approved isolated harness, with no live provider, queue, mutation, database, or publishing reachability.
- Keep failure logging redacted; do not print `DATABASE_URL` or credentials.
- Do not alter unrelated authentication paths or silently change existing production traffic.

## Real acceptance evidence required (not yet executed)

| ID | Process-level scenario | Required observation (conditional on approval) |
| --- | --- | --- |
| P-01 | Production `DATABASE_URL` missing | Process terminates or does not bind; no API serving |
| P-02 | Production `DATABASE_URL` empty / whitespace | Same as P-01 |
| P-03 | Invalid/unreachable DB / timeout | No API serving, bounded failure, redacted logs |
| P-04 | Identity check blocked / inactive site | No API serving |
| P-05 | Correct DB identity | Server can bind; does **not** imply tenant authorization |
| P-06 | Offline mode absent, forged, or enabled in prod | No offline-mode escape from production policy |
| P-07 | Sanctioned isolated offline harness | No CVI execution, publication, queues or provider access |
| P-08 | Startup after validation, then DB becomes unavailable | Readiness unavailable; protected operations fail closed; no stale authority |
| P-09 | Bootstrap/migration attempt during startup | No implicit mutations |
| P-10 | Staging revision/DB binding attestation and rollback | Independent reviewer records evidence before release |

For each test retain: exact commit, command/environment classification (redacted), process exit code, port binding observation, HTTP result when applicable, logs, fixtures, expected/observed result, and reviewer signoff.

## Explicit stop gates

- **No migration, database access, provider request, secrets, live OAuth, staging/production deployment, or merge to `main`** is approved by this contract.
- Real process/DB tests require a separately approved disposable environment and safety plan.
- Do not close #1152 without owner-approved policy, implemented enforcement, real process-level tests, and operational evidence.
- Do not close #1143 without transaction, tenancy, locking, auth and revocation decisions and independently reviewed tests.

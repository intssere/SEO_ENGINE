# PILOT-01 RT01-A12.19 — isolated custody integration certification

## Execution and governance boundary
Only the newly created, empty, loopback GitHub Actions PostgreSQL 17 database `pilot01_disposable_rt01a12_19_ci` with synthetic CI credentials, exact arming sentinel, canonical version/schema/extension/role/table attestation, and disconnected test imports. Nothing here is loaded by production app routes, providers, jobs, or workers. Operational SQL, existing DB access, migrations, deployments, public-site writes, external provider operations and merge remain prohibited.

## Deduplicated exact reuse ledger
| Existing component | A12.19 reuse | Remaining trust boundary |
| --- | --- | --- |
| A12.4 | `DisconnectedAdmissionContract` and admission receipt/fence validations | Static principal markers do not prove server custody |
| A12.5 | Existing `DisposablePgTransactionalAdapter` only, no duplicate grant/job/event implementation | **Does not revalidate membership/issuer inside its grant-consumption transaction** |
| A12.7 | `resolveDisconnectedCustody` and `TrustedCustodyPorts` with test-only PG fixtures | External per-request evidence is susceptible to time-of-check/time-of-use races |
| A12.8 | `DisconnectedTransactionContract` and revision-fenced request shape | Test-only port recomputes evidence BEFORE separate A12.5 transaction, NOT atomically |
| A12.13/A12.18 | Fail-closed cutover blueprint and source mapping unchanged | Not connected to production routes |
| A12.1/A12.14/A12.16 | Exact existing SQL candidates installed only in disposable CI replay | Never operationally deployed or granted |
| A12.12/A12.15/A12.17 | Loopback, fresh empty PG17 attestation/replay and synthetic tenant/revocation tests | No new schema or production role setup |

## Integration probes and scope of conclusions
The guarded CI replays canonical `0001–0011` and the three existing SQL candidates on a new synthetic PG17 instance. Test-only ports resolve canonical session, site, tenant membership and issuer from the disposable DB. Tests cover cross-tenant/wrong-operation/unknown-issuer admission rejection; positive synthetic grant -> job -> admission receipt -> event and read-only reconciliation; ambiguous commit fail closed; membership revocation trigger event and subsequent admission denial; stale worker generation/owner rejection; denied legacy queue recovery; revoked/unavailable worker denial. The disconnected composition imports zero runtime routes and does not dispatch providers.

## Critical security limitation — not a production-ready custody transaction
**A12.19 does NOT certify atomic revocation/admission serialization.** The A12.8 test port checks custody before A12.5 executes its independent grant-consumption transaction; no DB row lock or version fence spans both phases. A concurrent revocation can occur between preflight and admission. A12.5's existing adapter enforces grant idempotency and worker generation for the synthetic job, but does not recheck server-owned session, tenant membership and issuer custody in that same transaction. The A12.19 wrapper must NEVER be imported into the app as an authorization or provider-dispatch entrypoint. Worker guard here accepts the test's custody state flag; real workers must requery authoritative state and serialize revocation. This is a narrowly bounded compatibility/integration proof, **not full end-to-end security certification**.

## Additional unmet production gates
- Trusted operational session resolver, independent tenant/site/issuer provenance, audited identity binding and server-controlled issuance.
- Attested installed migration ledger and ownership mapping, reconciliation of competing 0008–0015 histories, reviewed schema rollout/backfill.
- Security-invoker RLS policy and least-privilege grant design, isolated owner/migrator/API/worker roles, audit append privileges, pool context isolation.
- DB-atomic custody check + grant consumption and cancellation/revocation serialization, verified unknown-COMMIT reconciliation and worker continuation fencing.
- Operational route and resume queue fail-closed wiring, no legacy `public.jobs` bypass, provider access independently authorized.
- Separate targeted authorization for all operational changes.

## Governance
PR stays **draft, unmerged** until exact-HEAD Standard CI SUCCESS, dedicated A12.19 PostgreSQL 17 CI SUCCESS, Tahseen formal GitHub APPROVED, zero unresolved review threads, and separate owner exact-HEAD merge authorization. Merge of this PR grants no operational authority.

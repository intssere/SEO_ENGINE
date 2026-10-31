# PILOT-01 — Disposable PostgreSQL durable authorization and fencing contract

Status: **SOURCE-ONLY DESIGN / NO LIVE EXECUTION AUTHORIZED**
Baseline: canonical main `5e59fbff2b19bad50bf8028dfb4639e6cb34dd56` (post-merge CI #41108396303 SUCCESS).
Relevant UGP source inspection: `initiative-universal-growth-platform` at `b7a92f7568c25be46dbe6de306b8193a2ea9d2b7`; this is not an approval to cherry-pick or modify that branch.
Tracking: #1181, #1143, #1159, #1061. Prior offline rehearsals: #1252–#1255.

## Safety and scope
- This file is a design/acceptance contract only. Do not install dependencies, provision/connect to a database, run SQL, migrate, start workers, access credentials, call providers, deploy, activate automated pilot runs, or change DiamondShelf.us.
- No Railway Production database or restored Production copy. Disposable, owner-approved, isolated PostgreSQL only; fake tenant/site identifiers and synthetic data; credentials and infrastructure must be separately authorized.
- Keep public-site writes and AI proposal generation disabled. Analysis grants never confer publication rights; every future public-site mutation requires new exact-action owner approval.
- Fail closed on unavailable storage, ambiguous ownership, missing authorization or invalid audit evidence.

## Required persistent model (proposal; schema not authorized)
**Grant ledger**: opaque grant id, authenticated issuer/actor, tenant, site, operation, optional exact diff digest, issued/expiry/revocation timestamps, state, single consumption id, audit version. Untrusted client fields must never define actor, tenant or site. Persist issuance/consumption/revocation with immutable audit events. A consumed grant cannot be reused, even following restart. Store only minimal synthetic metadata during rehearsal.

**Worker lease**: durable job id, tenant/site, status, owner identity, monotonically increasing fencing generation, lease expiry, attempts, idempotency key and last committed checkpoint. An atomic claim increments generation. A lease timeout alone is insufficient: **all subsequent durable progress, artifacts, completion and external-effect preparation must be conditional on the current generation, owner and valid lease**, within one transaction where applicable. Late-worker writes must affect zero rows. No external effect may occur before its authorization and idempotency/fencing proof is checked.

**Audit**: append-only events binding grant decision, current worker generation, operation and result digest; record transaction ids/sequence and rejection reason without sensitive secrets. Audit write failure must prevent successful authorization/commit.

## Isolated acceptance matrix
| ID | Concurrent/restart case | Required observation |
| --- | --- | --- |
| F01 | Two workers simultaneously claim one pending job | Exactly one current owner; a strictly increasing generation on later takeover |
| F02 | Worker A lease expires, B claims, then A writes progress/results | A's transaction affects zero rows; B retains ownership |
| F03 | A and B race completion after takeover | Exactly one valid terminal completion; never overwrite later generation |
| F04 | Process crashes after claim before checkpoint | Restart recovers deterministically without duplicate committed output |
| F05 | Identical idempotency key is retried or request replayed | One durable accepted effect; immutable receipt for replay rejection/deduplication |
| G01 | Two workers consume one grant simultaneously | Exactly one successful consume, one deny |
| G02 | Revoke and consume race | Serializable deterministic order; revocation wins if committed first; never both valid |
| G03 | Grant expires during queued/leased run | Expiry tested at action boundary; fail closed when required |
| G04 | Actor/tenant/site mismatch; analysis grant used for publish | Denied before claim/effect; no cross-tenant artifact writes |
| G05 | Site-write exact-diff hash differs | Denied; hash and grant never broadened by caller |
| R01 | Database unavailable, transaction abort, audit insert fails | No accepted grant use or successful final commit |
| R02 | Lease heartbeat delayed and duplicate recovery triggered | Old generation fenced; only one canonical result and audit chain |

## Evidence gates
1. Record exact code commit, PostgreSQL version, test harness, disposable DB identity (redacted), and clean isolation declaration.
2. Assert real DB constraints, lock/transaction behavior, unique indexes, row counts, and resulting audit records, not only mocked function responses.
3. Independently verify race schedule and injected failures; deterministic repeated runs must report actual failure counts.
4. Prove no unauthorized publication path, external provider calls, production connection string or actual Diamond Shelf content.
5. Obtain independent technical approval at exact PR head, CI success and explicit owner merge authorization.
6. Separately authorize disposable infrastructure creation, any migrations or SQL, and any subsequent UGP runtime integration. Passing this contract does NOT authorize them.
7. Before any live autonomous read-only pilot, resolve CVI fail-closed startup, #1159 G2–G5 Production DB gates, GSC OAuth/proxy policy, and owner-scoped pilot limits.

## Open architecture decisions
- Transaction isolation and retry discipline (document whether READ COMMITTED with conditional updates is sufficient or SERIALIZABLE required for each invariant).
- Monotonic generation source, lease clock authority, renewal frequency and maximum recovery window.
- Whether artifacts and completion share a transaction, or require a transactional outbox and explicit idempotency protocol.
- Tenant-scoped role/RLS enforcement, evidence retention and immutable audit verification.
- How pre-existing UGP pilot job states and CVI grant records migrate without unsafe automatic activation.

**No code or Production schema change is included in this contract.**

# PILOT-01 RT01-A3a — Trusted Grant Contract (source-only)

Baseline: `f5b4955110f40f9b3d5d121903cb75e12afa4d44` (merged PR #1290).

## Added contract

`pilot-01-trusted-grant-contract.ts` introduces `ServerAuthenticatedContextProvider` and `AtomicGrantReceiptStore` interfaces, `VerifiedGrantContext`, `DurableGrantReceipt`, and a fail-closed **synthetic rehearsal** guard.

The guard validates a restricted `analyze|recommend` intent, then requests a server-side principal from an injected provider. The principal must include actor/tenant/site, issuer, session ID, analyst/admin role and an explicit source marker. It sends a frozen snapshot to an injected store. A consumed response is accepted only when its immutable receipt includes a nonempty receipt and transaction identity, parseable commit time, and exact grant/actor/tenant/site/issuer/operation correspondence. Errors and malformed responses return `unavailable`; invalid scopes or missing identity return `denied`. No worker, database, provider, queue or route is called here.

## Security limitations

A string marker `server_verified_session` is **not cryptographic proof** of authentication. A caller can fabricate a context and inject a mock provider or return a fabricated receipt. This module cannot independently verify user membership, issuer authenticity, replay resistance, transaction commits, receipt signatures, DB clock, or existence of a real PostgreSQL row. The return value `consumed` is a **fixture classification only**, never execution or live authorization. The eventual authenticator/adapter must be instantiated exclusively by reviewed server code; never instantiate it from HTTP-supplied principal fields or from user-provided booleans. The final result must be independently reconciled with DB-authoritative receipt custody before any work may run.

The contract deliberately does not expose `site_write`. An analysis grant never enables a public website modification. No queue dispatch API exists.

## Test coverage

Tests cover matching synthetic receipt, missing/spoofed context, invalid roles, empty grant, unsupported operation, receipt subject/scope/issuer/transaction mismatches, invalid commit time, persistence exception, malformed adapter outcome, and an inert denied call. They do not certify a real database or security boundary.

## Later independent gates

Before any operational binding: reconcile actual UGP/CVI schema and migration provenance, implement trusted authenticated session/site membership and signer custody, write a separately reviewed transactional SQL adapter, and prove durable replay/revocation/audit atomicity with two disposable PostgreSQL sessions plus process restart. Require approval for the exact test database, then independent review/CI and separate owner authorization for migration, deployment, provider access and pilot activation.

No production access, SQL, migration, OAuth, Shopify/GSC/GA4 use, autonomous worker, AI proposal generation, or public-site write is authorized. Maintain `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

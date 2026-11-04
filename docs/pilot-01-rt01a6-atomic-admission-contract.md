# PILOT-01 RT01-A6 — Atomic grant consumption and job admission contract

## Authorization
Owner-approved GitHub-only source engineering with Railway as an intended, **not yet certified**, deployment target. Replit stays unchanged. Baseline `3cbb85047baf3989594ce6a92d9da5cce068512a`. No Production/staging database access, SQL execution, schema migration, runtime routes, workers, deployments, providers, or public-site writes.

## Why A5 is insufficient
`pilot-01-offline-queue-admission.ts` deliberately calls two independent ports: consume grant and then admit job. A successful grant consume followed by failed job insertion can spend the grant without creating a job. A lost commit acknowledgement also makes the result ambiguous. **No amount of callback-level receipt checking can prove atomic database admission.**

## RT01-A6 contract
`pilot-01-atomic-job-admission.ts` replaces the two-step conceptual sequence with a **single injected port**. A future adapter must:
1. Validate the server-authenticated principal, tenant/site membership, issuer delegation, grant operation and TTL using durable database evidence.
2. Serialize concurrent attempts; atomically transition only the authorized unconsumed grant, insert exactly one scoped pending job and insert an immutable audit/admission receipt, all within a **single database transaction**.
3. Enforce uniqueness and scope binding of `idempotencyKey`, `grantId`, `siteId`, `tenantId`, actor and operation. Identical replay may retrieve the **same committed receipt** without a second job. Conflicting replay must deny.
4. Treat connection loss or a lost COMMIT acknowledgement as **unavailable/ambiguous** until durable same-key reconciliation; never issue a new grant or enqueue another job speculatively.
5. Ensure durable worker ownership, fencing generation and outbox effects have independent certification. A job admission receipt is not itself worker execution authority.

The module checks all source-only gates, derives a frozen context from an injected provider and validates the port's returned receipt. It cannot prove that an injected store used a real transaction. Its successful status **`recorded_for_rehearsal`** is synthetic and never authorizes dispatch.

## Current evidence
`pilot-01-atomic-job-admission.test.ts` is a disconnected synthetic matrix of disabled gates, invalid identity, forbidden write operations, malformed/cross-scope receipts, identical idempotent retry, conflicting replay, port failures and lost COMMIT acknowledgement. No SQL, network, scheduler, route or provider access occurs.

## Gates before real implementation
- Canonical UGP/CVI schema provenance, installed migrations and tenancy need independent source-of-truth certification. Current `jobs` schema lacks grant, generation, issuer and immutable receipt fields.
- Trusted membership/issuer persistence and an enforcement-on server session adapter must be independently reviewed; the context source marker remains synthetic.
- Future disposable PostgreSQL testing needs separate authorization for transactional DDL and two-session/process crash tests; a mock fixture is **not** database proof.
- Review permissions, isolation levels, row policies, transaction retries, unique indexes, COMMIT acknowledgement reconciliation, job lease/outbox fencing and operational observability.
- Require Standard CI, Tahseen's formal exact-HEAD approval, owner exact-HEAD merge authorization, and separately authorized infrastructure access and runtime integration.

Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false` effective. No Production connection, migration, deployment, provider operation or site write is authorized by this document or test suite.

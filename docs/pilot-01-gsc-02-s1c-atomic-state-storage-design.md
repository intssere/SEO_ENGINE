# GSC-02 S1C — durable single-use OAuth state design (source-only proposal)

**Date:** 2026-10-28  
**Baseline:** canonical `main` `3552f37bfb0b6b6e537cd592f69fb7a51b4b6ae5` (S1B PR #1208 merged; post-merge CI #40203482863 completed SUCCESS).  
**Classification:** OFFLINE DESIGN / NEGATIVE TESTS ONLY. **No schema, migration, SQL operation, database connection, OAuth request, provider operation, deployment or credentials authorized or executed.**

## Why S1C exists

S0C, S0D, S1A and S1B established fail-closed shape and disposable simulation contracts, but their test doubles can be incorrect or non-shared. A syntactically valid state packet or a fake `consumed` receipt is not authority. S1C makes a candidate **PostgreSQL** storage specification explicit for subsequent *separately authorized* disposable tests and independent engineering review. It **does not implement a real adapter**.

The proposed SQL strings live in `artifacts/api-server/src/lib/gsc-s1c-postgres-atomic-proposal.ts`; the deliberately nonexistent schema is `gsc_s1c_proposal_only`, preventing accidental use in normal environments. They are **not migration files**, and no code imports them into a live route, worker or SQL executor. A future approved migration must receive a new identifier after resolving historical `0008–0011` collision and actual Production ledger evidence.

## Candidate state lifecycle

1. **Preflight, before redirect:** authenticated owner/admin principal, organization, exact certified site UUID, dedicated Google/GSC client generation, redirect origin and narrowly defined `webmasters.readonly` scope must be independently trusted and bound. The historical Diamond Shelf site UUID is only a candidate, **not Production proof**. CSRF state must have strong server-issued entropy; use a hash-only database lookup and enforce the same browser session. Generate a transaction-unique PKCE S256 challenge; encrypted/verifier custody is a distinct separately reviewed obligation.
2. **One-time issuance:** `INSERT ... ON CONFLICT (state_digest) DO NOTHING`, never reset or upsert a consumed row. Untrusted callback time cannot set TTL; candidate SQL stamps DB-owned issuance and 10-minute expiry. Storage must succeed **before** any consent redirect.
3. **One-time callback consume:** a **single conditional UPDATE** matches SHA-256 state digest, tenant/site/principal/session, client generation, redirect, PKCE challenge digest, exact provider/profile/scope, `consumed_at IS NULL`, and current database-clock time. `RETURNING 1 AS consumed` is solely a candidate row-count signal. Zero rows must yield a **generic denied** callback, not a diagnosis that leaks presence or status. No automatic retries.
4. **After consumption:** token exchange is a **separate** authorization and transport boundary. The state-consumption return cannot be used as proof of consent, confidential-client credentials, live session identity, Google issuer/mix-up checks, PKCE verifier security, or permission to persist encrypted tokens. Discovery (`sites.list`) requires separate approval; no implicit advancement.
5. **Retention and recovery:** must preserve spent-state tombstones at least for the full replay-risk window. Do not delete or recycle state digests early; prove restore and restart behavior against a durable transactional store. No cleanup/retention worker is authorized by this stage.

## Proof obligations before a real adapter or migration

| Gate | Evidence required | Current disposition |
|---|---|---|
| Current DB identity and binding | #1159 G1–G5, provider-origin structural binding, least-privilege private session, catalog and ledger, independent corroboration, recovery identity | **BLOCKED** |
| Schema authority | Dedicated migration number, conflict-free ledger and hash provenance, least-privilege roles and privileges, RLS/tenant isolation, retention policy | **NOT AUTHORIZED** |
| Atomic replay resistance | Disposable PostgreSQL two-connection race with same digest, max one row won; second request zero rows; cross-tenant and wrong session never update | **NOT EXECUTED** |
| Expiry under lock waits | PostgreSQL conditional recheck and actual DB clock; no late consumption after delayed row lock; boundary tests for expiry | **NOT EXECUTED** |
| Failure and crash behavior | Rollback, lost connection, abrupt restart, backup/restore, duplicate issue, replay after restart, opaque error handling | **NOT EXECUTED** |
| OAuth security | Server-issued unpredictable state, PKCE S256 and verifier custody, CSRF/session binding, precise redirect, Google authorization-server identification and mix-up defense, browser-cookie concurrency | **NOT CERTIFIED** |
| Credential custody | Independent encryption/key lifecycle, exact GSC external account, scoped write authority, no generic Google/GA4 fallback | **NOT AUTHORIZED** |
| Provider operations | Separate consents, token exchange, discovery, selection, Search Analytics and evidence-write grants | **NOT AUTHORIZED** |

**Important interpretation:** one SQL statement with `consumed_at IS NULL` is a promising design, not a proof until tested on the actual database engine under adverse concurrency, isolation, clock and crash conditions. No test in this PR connects to PostgreSQL. Source test assertions verify only that the proposed SQL text retains intended safeguards.

## Explicit blocked actions

No `DATABASE_URL`, Railway secret resolution, real SQL, new migration, DDL, DML, OAuth state/cookie/consent, Google token exchange, credential write, `sites.list`, Search Analytics, Replit/Railway deploy, scheduler or public-site changes. An OAuth read-only scope does **not** eliminate database writes or credential risk.

Source references: RFC 9700 OAuth Security BCP, https://www.rfc-editor.org/rfc/rfc9700.html ; PostgreSQL transaction semantics, https://www.postgresql.org/docs/current/transaction-iso.html . These references guide future review; the present change makes no live-provider security claim.

## Next decision

Run the isolated PR through exact-head full CI and independent review. Merge **only** following separate owner exact-SHA authorization, then certify post-merge `main` CI. Advance next to a **disposable PostgreSQL certification plan** after explicitly authorizing only a disposable environment and proving no Production database/secret reference is reachable; this approval would **not** include Production schema, OAuth, credential, provider or deployment authority. Resolve #1159 separately before considering any live activation.

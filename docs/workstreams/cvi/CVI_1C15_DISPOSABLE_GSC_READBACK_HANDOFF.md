# CVI-1C.15 — Disposable PostgreSQL execution of GSC readback contract

Date: 2026-10-09. Status: draft/unmerged; full exact-head CI pending.

## Predecessor
- CVI-1C.14 PR #997 exact head 62fb481b47a5fab2de827f89c9a419bfc99847eb: terminal complete GitHub CI SUCCESS run 37969323769.
- All CVI implementation PRs remain open, draft and unmerged.

## New increment
- Draft PR #1001: https://github.com/intssere/SEO_ENGINE/pull/1001
- Branch workstream/cvi-1c15-disposable-gsc-readback-pr997-dependent
- Base workstream/cvi-1c14-ledger-receipt-readback-pr996-dependent
- Exact initial HEAD 388b1e79cd78a81b98e2da97303c9fc28aecec16
- Gated proof branch ugp-cvi-1b4e-ci-proof-20261009-s
- Run 37971763785, disposable CVI database certification step SUCCESS; complete CI pending.

## Implementation and proof
- Appends CVI-1C.15 integration test to lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts.
- Uses canonical exact exported parameterized SQL for source acquisition INSERT (CVI-1C.7) and read-only GSC acquisition tombstone SELECT (CVI-1C.14) extracted from application source text.
- Executes on isolated localhost seo_engine_cvi_disposable after migrations 0014/0015 and dormant 0016.
- Checks one actual recorded_untrusted row with correct acquisition ID, tenant/site/connection, subject/session, request nonce, resource and raw observation fingerprint.
- Rejects readback of nonexistent acquisition IDs; checks historic tombstone remains after site-grant revocation.
- Database is created and dropped exclusively by the pre-existing CI proof-branch step.

## Security caveat (important)
- The readback SQL uses acquisition_id only and has **no tenant filter**. It is a locator query, not an authorization mechanism. An untrusted requester able to invoke it on another tenant's acquisition ID could see data. Production integration must enforce authenticated session/tenant/site authorization at DB operation time, preferably in a single transaction/statement with row-level authorization checks.
- Existing offline CVI-1C.14 reconciliation checks caller-expected identity against the row but must not treat caller-declared IDs as independently authenticated.
- Revocation does not erase immutable historical nonce tombstones. Reading them is a separate permission check from admission; the test does not certify safe production access after revocation.
- This is not a real Google transport, verified provider-origin acquisition, factual truth certification or publisher authorization. No live provider calls, CMS publication, secret placement, production migration, merge or deployment.

## Next
1. Verify full terminal CI for exact head #1001.
2. Design and prove a tenant-scoped, session/grant-checked readback query using disposable PostgreSQL, preventing post-revocation and cross-tenant readback.
3. Only after trusted server-owned session and provider OAuth transport are integrated can source-origin claims be elevated beyond untrusted review.

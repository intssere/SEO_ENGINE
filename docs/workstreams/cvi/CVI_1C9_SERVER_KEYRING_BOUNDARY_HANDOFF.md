# CVI-1C.9 — Bounded server keyring contract

Date: 2026-10-09
Status: Draft; exact-head CI pending; no live key provision or provider use.

## Verified predecessor and dependency
- CVI-1C.7 PR #981 at `382705fc749469d2ddd5bae3668f0eb93d697154`: complete GitHub CI SUCCESS, run 37962742594 (following readonly string[] TypeScript fix).
- CVI-1C.8 PR #985 at `3ba57d60e31ad46a5ff1557a2de8f6cdc298d6c9`: disposable PostgreSQL tests passed, complete CI running at checkpoint.
- All CVI PRs remain draft/unmerged.

## New implementation
- Draft PR #986: https://github.com/intssere/SEO_ENGINE/pull/986
- Work branch `workstream/cvi-1c9-server-keyring-boundary-pr985-dependent`
- Base `workstream/cvi-1c8-atomic-sql-disposable-proof-pr981-dependent`
- Initial HEAD `4a41f63756c0125624a3e3024545b6a98a639b6b`
- Proof branch `ugp-cvi-1c9-ci-proof-20261009`, run 37963531337.
- Sources `artifacts/api-server/src/lib/cvi-server-keyring-custody.ts` and `.test.ts`.

## Scope
- Offline bounded in-memory keyring constructed by a trusted server operator (not wired to runtime) from 1 to 8 distinct >=32-byte key secrets.
- IDs are canonical and strictly formatted. Duplicate key identifiers and duplicated symmetric secret material rejected. Buffer material copied on construction.
- Key states: issuing (issue/verify), verify_only (verify existing receipts but no issuance), revoked (neither).
- Domain-separated HMAC binds keyId and inner HMAC signature to defend swapping key aliases or associated receipt signature without a matching secret.
- Enforces the existing short-lived receipt tenant/site/subject/session/nonce/acquisition/nested-evidence verification at the library boundary.
- Tests active issuance and review-only verification; verify-only rotation; revoked/unknown IDs; incorrect key binding; altered identity and external buffer mutation.

## Strict limits
- **No real KMS, secret manager, trusted boot-time configuration, authenticated runtime access, provider origin attestation or durable nonce verification** has been connected.
- Secret protection requires a trusted server process. A keyring initialized with request-supplied config would be insecure.
- Cryptographic signatures are not proof of factual accuracy, source licensing, tenant permissions, provider ownership or human editorial approval.
- No output confers execution or publication authorization, and a signature-valid packet still returns PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK.
- No production DB migration, deployment, provider call, CMS write or merge.

## Next
1. Check full CI of #985 and #986 exact-head. Repair any failing test and rerun proof as needed.
2. Separately implement trusted boot-only secret acquisition and binding to a real authenticated session and provider read origin. No runtime integration without separate authorization.
3. Ensure atomic signed-receipt/nonce DB integration and revocation fencing are tested end-to-end in a disposable environment.
4. Continue verified factual sources, licensing and editorial sign-off prior to any publication path.

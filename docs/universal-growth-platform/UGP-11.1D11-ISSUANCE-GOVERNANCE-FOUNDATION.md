# UGP-11.1D11 — Authenticated Control-Issuance Governance Foundation

**Source baseline:** `initiative-universal-growth-platform` at `7f7181fbf739016ee5fdfbc55cbf9efeea3ab787`.

**Status: REVIEW-ONLY / AUTHORITY NOT GRANTED.** The new pure TypeScript review records deny-only behavior for candidate control issuance. It adds no verifier, operator directory, key registry, credential, route, database migration, journal insertion, scheduler, worker or external action.

## Threat boundaries

Existing D8 HMAC fixtures are signed by test-supplied keys. D9 journal rows are fixture-only; D10 latest-decision projection is always non-authoritative. Consequently, caller-provided `assertedAuthenticated`, `assertedRole`, `assertedApproved`, and `assertedKeyState` must not be accepted as proof of identity, authorization, approval or key validity. D11 always returns `issuanceAllowed=false`, `authorityVerified=false`, `claimAllowed=false` and `dispatchAllowed=false`, including when every assertion appears valid.

## Requirements for actual authenticated issuance (not implemented)

1. Establish a governed operator identity service and explicit tenant/site-scoped permission model, using independently authenticated principal identities and durable role-policy versions.
2. Govern asymmetric signing keys or approved KMS/HSM-backed signatures, issuer ownership, per-key tenant/site binding, key validity intervals, rotation, revocation, and historical verification. Never ship a shared fixture key or self-asserted key status as authority.
3. Require authenticated issuance intent, exact policy grant, review/approval where policy requires, control-transition legality and immutable actor/evidence lineage.
4. Enforce monotonic revisions, nonce uniqueness, decision IDs and predecessor hashes atomically, with replay/conflict tests under concurrent issuers.
5. Verify and project authoritative decisions independently, including expiry/revocation, with kill/recovery controls and full audit trails. Do not modify D5's fixture-only source constraint or D6 claim-denial guard to simulate certification.
6. Separately certify queue claim, lease fencing, unknown side-effect reconciliation and provider-specific execution preflight before any activation.

## Safety and verification

The D11 unit tests exercise forged identity assertions, revoked/expired key labels, invalid revisions, and all four control actions. They certify **denial logic only**, not authentication or operational issuance. Production execution is **NOT_GRANTED**; no provider/site writes, production DDL, scheduling, workers, deployment, or external sending are authorized.

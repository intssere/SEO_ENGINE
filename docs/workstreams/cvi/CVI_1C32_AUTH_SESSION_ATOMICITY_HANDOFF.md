# CVI-1C.32 — Atomic Session Validation and Rotation

Parent CVI-1C.31 draft PR #1050. Full CI initially passed at 06f25c85da5789b2550095a1a85d33f2a60428fc; documentation-inclusive verification run 38057846187 was in progress at branch creation.

Changes: replace separate SELECT then UPDATE in loadAuthSession with conditional UPDATE RETURNING, ensuring that revocation, absolute expiry and idle expiry are re-evaluated atomically when refreshing session. rotateAuthSessionToken now requires a matched unrevoked, unexpired, non-idle session and throws on missing or ineligible rows. Disposable CVI proof covers revoked and missing session rotation failure, in addition to historical session lifecycle and private read authorization checks.

Scope limitations: no production migration, new public route, real OAuth credential, CMS or provider action. Auth code modifications are in a stacked draft for CI and review; no merge or deployment. Independent security review of role behavior and session concurrency is required before integration.

CI certification pending.

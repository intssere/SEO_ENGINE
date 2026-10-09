# CVI-1B.4H — read-only ACL preflight handoff

Date: 2026-10-09. Status: DRAFT, CI PENDING; not runtime-connected, no auth granted.

## Chain
Draft PRs #923 > #928 > #931 > #932 > #935 > #937 > #939 > #940 > #943 > #945 > #949 > #950 are independently stacked, not merged. PR #949 exact head `7c4e60f6c2385c50b39ff12ee2fd97f4797a1246` completed full GitHub validate successfully (run 37901741643). PR #950 depends on #949 and HEAD `615cb80ffdb46fa6213ed597acf816a0ce0b983d` at creation. GitHub CI triggered from `ugp-cvi-1b4h-ci-proof-20261009` at matching SHA. Recheck status and fix failures before certification.

## Files
- `artifacts/api-server/src/lib/cvi-trusted-read-preflight.ts`: typed read-only SQL parameterized for auth_sessions, cvi_organization_memberships, sites, cvi_site_read_grants, connections. SQL requires exact session UUID and subject, expiry and revoked state, membership organization/time and status, site organization/activity, site grant permission/time and status, connected site connection with nonempty scopes.
- `artifacts/api-server/src/lib/cvi-trusted-read-preflight.test.ts`: negative/positive scope checks and fixed SQL safety checks.

## Assurance envelope
**This increment does not implement a trusted resolver**. It exposes a pure preflight accepting an injected reader and the SQL statement that a trusted server adapter *may* eventually execute. The injected reader can be forged and must never be accepted from request JSON or from LLM output. Its strongest result is `PENDING_INDEPENDENT_SITE_BINDING` with `authorizationGranted=false`, `publicationAuthorized=false`, `executionAuthorized=false`. No `VERIFIED_READ`, API endpoint, DB runtime call, provider operation or persisted access decision is implemented.

A connection with any nonempty scope is **not** independently verified site ownership or a validated capability. The statement does not yet prove a provider resource maps to the target site, verify the recognized read-scope set, prove authenticated principal provenance, or fence revocation races across concurrent execution. It should be refined before a trusted adapter can be used.

## Next increment
1. Verify PR #950 exact-head CI outcome and repair without reducing security.
2. Investigate live authenticated `req.auth` middleware, session rotation/revocation and canonical site identity binding.
3. Implement an internal, non-public, parameterized DB reader in a controlled disposable environment; verify exact SQL against seeded tenant cases.
4. Replace any-nonempty-connection-scopes with provider-specific required scopes and separately authenticated property/resource binding.
5. Define short-lived, revocation-aware access decision semantics and origin-bound audit proof.
6. Only after schema rollout authorization and end-to-end evidence trust certification consider production read access.
7. CVI content provenance, expert review and actual UGP integration remain independent workstreams.

No merges, provider mutation, schema deployment, production or CMS publishing occurred.

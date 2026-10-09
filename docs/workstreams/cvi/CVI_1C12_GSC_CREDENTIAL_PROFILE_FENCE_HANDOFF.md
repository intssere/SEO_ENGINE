# CVI-1C.12 — GSC-only credential profile preflight handoff

Date: 2026-10-09. Status: draft; exact-head CI pending; no provider calls or production operations.

## Verified predecessor
- PR #991 CVI-1C.11, exact HEAD 9905e6365badec4b55952d18ccd5a9ac28ee1f83, full GitHub CI SUCCESS run 37966604835.
- All CVI implementation PRs remain open, draft and unmerged.

## Current
- PR #993 https://github.com/intssere/SEO_ENGINE/pull/993
- Branch workstream/cvi-1c12-gsc-credential-profile-fence-pr991-dependent
- Base workstream/cvi-1c11-gsc-raw-response-custody-pr988-dependent
- Exact HEAD f7f46c0c284bc92107e204d07a2b23a28241880e
- Proof-only branch ugp-cvi-1c12-ci-proof-20261009.

## Implementation
- artifacts/api-server/src/lib/cvi-gsc-credential-profile-fence.ts
- artifacts/api-server/src/lib/cvi-gsc-credential-profile-fence.test.ts
- Reuses Task #72 gsc-readonly constants and helpers. Requires provider google, isolated gsc_read_only_v1 profile, google#gsc-read-only-v1 connection identity and *exact single* webmasters.readonly scope (no GA4 scope).
- Requires claimed provider OAuth source, connected/non-revoked metadata, exact site/selected property, current expiry and a structurally ready, explicitly non-authorizing CVI-1C.11 response envelope.
- Rejects generic Google OAuth fallback, scope widening, wrong connection provider, wrong site/property, revoked or expired credentials, and raw responses that claim authority.
- Even apparently passing metadata only yields PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION; execution/publication authorization always false.

## Security and operational limitations
- OAuth metadata and provider response remain caller-supplied. No trusted token provenance, exact-scope introspection, TLS peer attestation or live provider transport exists in this increment.
- Existing generic Google legacy callback must not be used as an implicit replacement for dedicated GSC read-only profile. See docs/task74-gsc-oauth-client-config-binding-architecture.md.
- Real secret manager binding, authenticated connection/session checks, live provider reads and publishing require separately governed authorization and implementation.
- No production DB migrations, provider requests, CMS writes, merges or deployments.

# CVI-1B.4N — Provider observation custody review handoff

Date: 2026-10-09
Status: DRAFT PR #962; exact-head CI running; no live provider or production activity.

## Verified predecessors
- PR #957 CVI-1B.4L at head cdcff6ecce0225dcbed61add31fdcd7f72cb5e41: GitHub validate SUCCESS, run 37910584730.
- PR #959 CVI-1B.4M at head 34924b89725c4af194fa99b659f5d1b4e0705de5: GitHub validate SUCCESS, run 37910589255.
- Both are still open and draft; all ancestor CVI PRs remain unmerged.

## Current increment
- PR #962: https://github.com/intssere/SEO_ENGINE/pull/962
- Branch: workstream/cvi-1b4n-provider-evidence-custody-pr959-dependent
- Base: workstream/cvi-1b4m-gsc-read-transport-boundary-pr957-dependent
- Exact HEAD at creation: ced67f2b0d2e379ac201d85b9c72942a9245176a
- Validation-only branch: ugp-cvi-1b4n-ci-proof-20261009
- Exact-head GitHub run: 37911406957, IN_PROGRESS at first check.
- No merges or deployment.

## New files and assurance
- artifacts/api-server/src/lib/cvi-provider-evidence-custody.ts
- artifacts/api-server/src/lib/cvi-provider-evidence-custody.test.ts
- Reviews claimed custody envelopes with tenant, subject, authentication session, UGP site identity, UGP connection identity, acquisition ID, request nonce, resource and provider, observation hash, observed/request timestamps.
- Rejects cross-tenant, other session/subject, provider/site drift, stale/future observations, invalid claim/rejected source, resource mismatch and malformed digests.
- Returns DENY or PENDING_TRUSTED_CUSTODY_AND_REPLAY_CERTIFICATION.
- Always independentlyAuthenticated=false, replayIndependentlyChecked=false, authorizationGranted=false, executionAuthorized=false, publicationAuthorized=false.

## Critical limitations and threats
- SHA-256 fingerprint is a deterministic identity, NOT a cryptographic signature or independently trusted content proof.
- The transportOrigin='server' field is a mere declaration and is trivially spoofed.
- The nonce has no first-party durable uniqueness ledger and is NOT anti-replay protection.
- The code has no runtime server-held credential binding, provider transport attestation, trusted issuer signature, authenticated tenant permission resolver, provider API call or customer route.
- No grant may be inferred from a matching envelope. A future trusted server-only acquisition gateway must authenticate/attest transport and principal, persist unique nonce under concurrency fencing, verify resource entitlement and revocation, then independently review rights, claims and editorial suitability.
- No production DB migration, provider send, CMS publishing, merge or deployment occurred.

## Next engineering steps
1. Check the exact-head CI result of PR #962; fix errors and restart proof on updated head if needed.
2. Design isolated append-only acquisition/nonce ledger in disposable PostgreSQL, with strict uniqueness and bounded TTL/capability; do NOT wire production.
3. Keep CVI factual source verification and editorial/UGP product integration on the critical path, rather than treating custody checks as a complete feature.

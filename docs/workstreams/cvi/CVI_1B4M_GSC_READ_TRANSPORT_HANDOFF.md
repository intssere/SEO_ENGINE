# CVI-1B.4M — bounded read-only provider transport boundary

Date: 2026-10-09
Status: DRAFT STACKED PR; EXACT-HEAD CI PENDING; NO LIVE PROVIDER INTEGRATION

## Branches and PRs
- Parent PR #957 CVI-1B.4L at HEAD a22869da5726d00f60e85c325695ef70da14eef8, GitHub validation run 37909931577. Recheck its terminal result.
- New PR #959: https://github.com/intssere/SEO_ENGINE/pull/959
- Implementation branch: workstream/cvi-1b4m-gsc-read-transport-boundary-pr957-dependent
- Base: workstream/cvi-1b4l-provider-attestation-freshness-pr956-dependent
- Exact implementation HEAD: 75ccb3b911678149a10e21d4d185a9bbd5f96b97
- Proof-only branch at same HEAD: ugp-cvi-1b4m-ci-proof-20261009
- Full upstream CVI implementation stack remains separate, draft and unmerged.

## New contracts and tests
- artifacts/api-server/src/lib/cvi-gsc-read-transport-boundary.ts
- artifacts/api-server/src/lib/cvi-gsc-read-transport-boundary.test.ts
- A bounded GSC read transport interface accepts an injected sites.list port. It checks UGP site/connection identity and Google provider before invoking it; rejects invalid max-age, provider errors, request-to-observation clock drift, malformed or underprivileged GSC response and unrelated properties.
- Reuses existing strict GSC observation review, and returns DENY or PENDING_TRUSTED_TRANSPORT_AND_TENANT_ATTESTATION.
- All outcomes declare independentlyVerified=false and authorizationGranted=false, publicationAuthorized=false, executionAuthorized=false.
- Offline tests use synthetic provider response fixtures only; there is NO live GSC call, OAuth token use, server route, connection custody, persistence or publishing permission.

## Critical outstanding trust work
1. This adapter accepts dependency-injected transport, so a caller could supply fraudulent results. It must not be exposed to public requests or treated as a verified attestation. No runtime trusted implementation exists yet.
2. A real, separately governed server-only provider client must bind OAuth subject, exact connection, tenant membership, GSC resource entitlement, revocation and bounded response freshness. Transport source must be trusted independently of input JSON.
3. The observedAt callback is injectable for tests. A future trusted runtime must supply its own time source and anti-replay receipt; this increment does not prove freshness of externally supplied evidence.
4. A passed observation review does not entitle a user to generate, execute, or publish content.
5. CVI independent business fact validation, licensed source evidence, expert/editorial review and end-to-end UGP integration remain incomplete.
6. Do not merge, run provider network, change production DB, deploy or publish without explicit authorization and audited scope.

## Exact next checks
- Check PR #957 exact HEAD validation and repair if needed.
- Check PR #959 exact HEAD CI via proof branch; repair TypeScript/runtime tests if any fail.
- Keep proof-only branches out of merge plans and retain dependency ordering.

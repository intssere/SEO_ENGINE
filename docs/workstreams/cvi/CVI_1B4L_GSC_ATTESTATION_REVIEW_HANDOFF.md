# CVI-1B.4L — GSC property attestation observation review

Date: 2026-10-09
Status: DRAFT / NO PROVIDER CALL / NOT AUTHORIZED

## Verified prior state
- PR #956 CVI-1B.4K HEAD 0cf039beeaebe48fed20f458842aaa5186c8edfb passed complete GitHub validate run 37906724434.
- PR #957: https://github.com/intssere/SEO_ENGINE/pull/957
- Work branch: workstream/cvi-1b4l-provider-attestation-freshness-pr956-dependent.
- Base: workstream/cvi-1b4k-recognized-read-scopes-pr954-dependent.
- Exact creation HEAD: a22869da5726d00f60e85c325695ef70da14eef8
- Proof branch: ugp-cvi-1b4l-ci-proof-20261009; GitHub CI pending.
- The entire CVI stack remains unmerged/draft; no provider or production changes.

## Implementation
- artifacts/api-server/src/lib/cvi-gsc-property-attestation-review.ts
- artifacts/api-server/src/lib/cvi-gsc-property-attestation-review.test.ts
- Existing strict GSC sites.list parser and accepted permission levels from @seo-engine/oauth-connection-manager/gsc-readonly are reused.
- Checks requested property matches exact canonical host sc-domain or canonical origin URL prefix, accepted site permission, exact GSC read-only scope, nonmissing connection fingerprint, strict ISO timestamps, freshness 1–3600 seconds, future data rejection and deterministic source observation hash.
- Returns DENY or PENDING_TRUSTED_TRANSPORT_ATTESTATION; independentlyVerified=false, authorizationGranted=false, publicationAuthorized=false, executionAuthorized=false in all cases.
- No actual provider transport, credential access, persist/write, route, worker or runtime authorization service added.

## Remaining essential requirements
1. Check exact HEAD CI and repair if needed. CI tests verify pure contract only.
2. Establish trusted server-side authenticated OAuth transport identity for the actual caller, provider connection and time-bounded observation, including revocation.
3. Independently attest the requested GSC property in a bounded real provider observation through separately authorized controlled read-only action.
4. Bind any provider attestation to the canonical site and organization under a separately governed database authorization model. Reject replay and cross-tenant drift.
5. CVI content necessity, real independent source corroboration, licensed evidence, human editorial review and UGP end-to-end integration remain outstanding.
6. Do not merge, deploy or activate actual read/publish authority without explicit authorization.

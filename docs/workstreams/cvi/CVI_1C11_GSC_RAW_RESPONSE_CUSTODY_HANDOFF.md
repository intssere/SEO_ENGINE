# CVI-1C.11 — GSC raw HTTP response custody envelope

Date: 2026-10-09
Status: DRAFT / exact-head CI pending / zero provider requests.

## Verified predecessor
- CVI-1C.10 PR #988 at d9eab0273c66793b4c6857f3f96a5516a1ff7f22 passed full CI, run 37964857280, including disposable PostgreSQL revocation serialization.
- CVI ancestors remain draft and unmerged.

## New PR
- Draft #991: https://github.com/intssere/SEO_ENGINE/pull/991
- Branch workstream/cvi-1c11-gsc-raw-response-custody-pr988-dependent
- Base workstream/cvi-1c10-revocation-serialization-pr986-dependent
- Initial HEAD 9905e6365badec4b55952d18ccd5a9ac28ee1f83
- Proof-only branch ugp-cvi-1c11-ci-proof-20261009; full exact-head CI must pass.

## Source
- artifacts/api-server/src/lib/cvi-gsc-raw-response-custody.ts
- artifacts/api-server/src/lib/cvi-gsc-raw-response-custody.test.ts
- Validates offline GSC sites.list raw-response envelope: GET exactly https://www.googleapis.com/webmasters/v3/sites, no redirects, exact final URL, 200 JSON response, strict UTF-8, bounded 2–65536 raw bytes and SHA-256, bounded request/observation time, matching site/connection, exact GSC property and accepted permission.
- Denies redirect, endpoint substitution, wrong method, MIME/status mismatch, oversized/binary/malformed JSON, domain suffix impersonation, clock drift, malformed nonce or wrong provider.
- Output status DENY or PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY; all origin, OAuth, tenant, execution, publication verification/authorization flags false.

## Limitations
- A caller can forge all request/response fields and raw content; the code is a byte-integrity/policy preflight, **not a real trusted provider transport**.
- SHA-256 of response bytes is not proof of Google's origin. No TLS peer certificate verification or server-owned OAuth credential custody is integrated.
- No actual provider access, CMS publishing, production migration, merge, deployment or secret reads.
- Trusted server-only transport, independently verified OAuth session/resource control, atomic replay admission and signed source receipt integration remain separate tasks.

## Next
1. Check exact-head CI, repair and rerun if needed.
2. Join a trusted server-owned GSC transport to raw byte custody with bounded responses and explicit credential identity; never treat injected client transport as trusted.
3. Continue independent first-party source truth, rights and reviewer authentication prior to any generated content publication.

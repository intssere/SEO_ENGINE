# CVI-1C.13 — GSC raw-byte nonce/acquisition lineage correlation

Date: 2026-10-09. Status: new stacked draft, exact-head CI pending. No production operations.

## Dependency
- CVI-1C.12 PR #993: f7f46c0c284bc92107e204d07a2b23a28241880e. Full CI run 37968038925 still in progress at last check.
- All CVI implementation PRs are draft, open and unmerged.

## Current PR
- PR #996: https://github.com/intssere/SEO_ENGINE/pull/996
- Head branch: workstream/cvi-1c13-gsc-raw-nonce-lineage-pr993-dependent
- Base branch: workstream/cvi-1c12-gsc-credential-profile-fence-pr991-dependent
- Initial HEAD: 796ce7ed265541af5dc0e4f37f2907e17df1940f
- Exact-head proof branch: ugp-cvi-1c13-ci-proof-20261009
- CI run 37968541203, pending at creation.

## Implementation
- artifacts/api-server/src/lib/cvi-gsc-acquisition-lineage.ts
- artifacts/api-server/src/lib/cvi-gsc-acquisition-lineage.test.ts
- Binds exact SHA-256 of captured GSC response bytes and source-attestation fingerprint to expected nonce, acquisition ID, requested resource, tenant/site/connection/principal/session identifiers and the CVI-1C.12 GSC-only OAuth-profile preflight.
- Rejects mismatched nonces, acquisition IDs, resources, raw checksums and unsafe upstream review results.
- Outcome is DENY or UNTRUSTED_CAPTURE_REVIEW_ONLY; no provider/tenant/OAuth origin is independently authenticated and no execution/publication rights granted.
- Negative tests include altered raw response checksum, swapped attestation identity, resource/nonce substitution, denied upstream state and attempted publication authority.

## Important security limitations
- Input identities, hashes and OAuth metadata are entirely caller-supplied. SHA-256 internal consistency does not prove the data came from Google or that the user controls the claimed property.
- The packet records tenant/site/session fields but does not authenticate them against durable server session/grants; a changed site ID may still yield a new nonauthorizing packet. Trusted tenant authorization remains separate.
- No HTTPS provider request, trusted server OAuth transport, secret manager, CMS write, database migration, merge or deploy.
- Before runtime use: server-derived authenticated identity, TLS peer verification, GSC exact-scope provider credential custody, trusted request-to-response byte binding, replay-resistant nonce ledger and revocation-safe admission must be enforced.

## Next
1. Verify terminal full CI PASS for PR #993 and #996 at exact heads, repair any failures.
2. Prioritize real server-side trusted transport/identity architecture and governance over further caller-declared attestations.
3. Preserve fail-closed execution and publication admission.

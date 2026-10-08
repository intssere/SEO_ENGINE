# CVI-1B.4 — authority admission implementation handoff

Date: 2026-10-08
Status: STACKED DRAFT PR; EXACT-HEAD CI PENDING; NO MERGE/DEPLOY
Repository: intssere/SEO_ENGINE

## Dependencies
- PR #923 CVI-1A, head 2f5b90d331093e584b100ccfcec8f8deb055ecca, CI PASS.
- PR #928 CVI-1B.1, head 930066cd5078c15896e41bfc0d3154e0ed192b81, CI PASS.
- PR #931 CVI-1B.2, head 71bf13d412d8da1bd4ce64628cc85477904696e6, CI PASS.
- PR #932 CVI-1B.3, head f3a5f09c6ebe84cb7cf81272133d38b77d6193a1, CI PASS (run 37813543003).
- PR #935 CVI-1B.4 new draft, head 1e1addf82dcfb6c960ff7ee56da419c1af15c325, target branch workstream/cvi-1b3-claim-provenance-pr931-dependent.
- Validation-only exact-head branch ugp-cvi-1b4-ci-proof-20261008, created at 1e1addf82dcfb6c960ff7ee56da419c1af15c325 to invoke existing push CI trigger. Latest-head final check not yet confirmed.

## Inspected auth sources and finding
- artifacts/api-server/src/lib/auth-foundation.ts: AuthPrincipal contains sessionId, subject, email, displayName, role, timestamps and CSRF hash, but no tenant membership/site grant.
- artifacts/api-server/src/auth-types.d.ts: Express Request.auth exposes AuthPrincipal.
- artifacts/api-server/src/lib/site-ownership-evidence-contract.ts: an observed crawl/query-page evidence projection, not a tenant membership authority.
- artifacts/api-server/src/lib/universal-site-resource-identity.ts: site, resource and connection identity/fingerprints; not authorization by itself.
- Any claim that CVI-1B.4 verifies live authenticated user access is unsupported until a separate trusted resolver is implemented and integrated.

## Implementation
- artifacts/api-server/src/lib/cvi-authority-admission-contract.ts
- artifacts/api-server/src/lib/cvi-authority-admission-contract.test.ts
- Pure deterministic gate verifies upstream claim/business report hashes and lineage, declared tenant/site scope, bounded session timestamps, access decision shape.
- A missing trusted access decision returns REQUEST_EVIDENCE, drift/expired session returns DENY, and declared verified read access still returns HUMAN_REVIEW_REQUIRED.
- Output never contains publication or execution authority; independently verified truth remains false.
- No public API route, trusted resolver, persisted receipt, cryptographic attestation, or provider call added.

## Critical security caveat
`CviAuthorityAccessEvaluation` is a data interface, NOT a nonforgeable capability. A caller can construct a value claiming trusted access. This cannot elevate beyond HUMAN_REVIEW_REQUIRED in current code, but must NEVER be exposed to a public JSON input or used as authorization. Next increment must build the actual backend trusted-context resolver using existing authenticated user + server-side tenant membership and verified connection records. An external signature/key-management plan is not yet certified. Until such evidence is available, use NOT_RESOLVED.

## Review and certification checklist
1. Reverify PR #935 exact HEAD, base, CI status, and changed file set.
2. Repair any CI typecheck/tests without suppressions; validate exact revised HEAD.
3. Add negative tests for authorization status spoofing and cross-artifact mismatches, including tenant reassignment, expired user session and mismatched site binding.
4. Review whether source-side `readOnly`, `performsNetworkOperation`, `persistence`, and trusted receipt fields need stronger runtime shape integrity checks.
5. Do not merge stacked branches in reverse order; do not merge to main without explicit exact-head approval.
6. Production, databases, P12.2, provider writes, CMS publication and schedulers remain untouched.

## Next work
CVI-1B.4B authenticated authority-context resolver investigation and trusted adapter, only after concrete session/member/site grant tables/services and their authorization test fixtures are mapped. No automatic research-generation or publishing binding.

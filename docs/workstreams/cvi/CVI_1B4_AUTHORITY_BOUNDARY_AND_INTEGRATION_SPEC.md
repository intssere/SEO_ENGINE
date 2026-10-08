# CVI-1B.4 — authenticated evidence authority: integration specification
Date: 2026-10-08
Status: DESIGN / SOURCE-INSPECTED; NO AUTHENTICATED RESOLVER IMPLEMENTED
Do not treat this specification as production certification, merge or provider authority.

## Critical finding
UGP `site-ownership-evidence-contract.ts` (initiative HEAD inspected d7326e6530646e71d73f8c8ac05b67a7a44f8a28) is a **search/crawl and query-page inventory** contract. Its `wholeSiteCertified` is false and its semantics include `grantsAuthorization: false`. It is NOT a customer tenant-ownership or OAuth permission attestation. Do not use its name as a substitute for an authenticated site binding.
UGP `universal-site-resource-identity.ts` defines canonical site/resource identities, stable fingerprints and connection identity, but these identity constructors also are not user authorization decisions.

## Dependency chain, frozen at inspection
- PR #923 CVI-1A: 2f5b90d331093e584b100ccfcec8f8deb055ecca, CI SUCCESS
- PR #928 CVI-1B.1: 930066cd5078c15896e41bfc0d3154e0ed192b81, CI SUCCESS
- PR #931 CVI-1B.2: 71bf13d412d8da1bd4ce64628cc85477904696e6, CI SUCCESS
- PR #932 CVI-1B.3: original CI FAILED because the static safety test contained an invalid escaped JavaScript regex. Corrected on PR branch at f3a5f09c6ebe84cb7cf81272133d38b77d6193a1; new exact-head CI run 37813543003 was IN_PROGRESS at writing. Recheck, do not infer success.
- All PRs remain draft; no merge or deployment.

## Trust authority partition
1. **Identity and tenancy** — resolved only through existing authenticated request/session and tenant/site membership service. Must provide principal ID, tenant ID, site ID, origin and permission scope. No caller-supplied strings accepted as permission.
2. **Site ownership and connection authorization** — must be established from existing verified connection/site-ownership state and resource bindings, separate from the UGP *observed crawl inventory*.
3. **Source acquisition custody** — canonical source URI, provenance, content digest, acquisition time, permitted usage and collection policy established by an approved capture service. A self-consistent ledger is not proof of authentic capture.
4. **Factual corroboration** — independent evaluation of claim text against multiple appropriate evidence records where needed; confidence alone cannot override contradictions.
5. **Original contribution custody** — human/organizational evidence, licensed dataset or firsthand testing lineage; `firstPartyOrOfficial` alone does not establish originality.
6. **Human approval authority** — reviewer role/membership validated by protected authorization service, and receipt bound to exact evidence/report revision.
7. **Execution** — separate governed publisher state machine, explicitly approved per action; nothing in CVI automatically permits a CMS write.

## Proposed interfaces
`AuthenticatedCviContext`: authenticated principal/organization, tenantId, siteId, siteIdentityFingerprint, verifiedConnectionFingerprint, authorizedReadCapability, issuer service/version, evaluatedAt, expiresAt, request correlation fingerprint. Construct only inside trusted backend, never from user JSON or LLM output.

`TrustedEvidenceReceipt`: ledgerFingerprint, source capture chain ID(s), independent acquisition verified status, rights policy status, tenant/site provenance fingerprint, fact corroboration status, originality-review status, reviewer approval if required, evidence expiry, issuing authority, policyVersion, revocation epoch, integrity protection.

`CviAuthorityDecision`:
- statuses: `DENY | REQUEST_EVIDENCE | HUMAN_REVIEW_REQUIRED | ELIGIBLE_FOR_RESEARCH`
- confidence data is advisory; no `PUBLISH_APPROVED` result.
- exact bindings to CVI-1A assessment fingerprint, 1B.1 ledger binding fingerprint, 1B.2 fact freshness fingerprint and 1B.3 claim provenance fingerprint.
- deny on mismatch, missing/expired evidence, tenant drift, invalid connection scopes, malformed signatures, claims of independent verification without trusted issuer, or unresolved conflict.
- output immutable audit fingerprint; safety fields `publishingAuthorized=false`, `executionAuthorized=false`, `providerMutation=false`.

## Trust failure modes and tests
- Spoofed tenantId/siteId with otherwise valid hashes -> DENY
- Site moved to different tenant since acquisition -> DENY
- Source ledger forged coherently with all UGP hashes -> evidence not independently captured => REQUEST_EVIDENCE
- Source with no permitted usage rights => DENY or explicit human legal review
- Connection revoked after evidence creation -> DENY
- User switches auth session mid-request -> DENY
- Source provenance expired or revoked -> REQUEST_EVIDENCE
- Reviewer not member of tenant or lacking protected-content privilege -> HUMAN_REVIEW_REQUIRED / DENY
- Evidence reports from different artifact revisions -> DENY
- Required YMYL expertise unverified -> HUMAN_REVIEW_REQUIRED
- Replayed signed proof with wrong site or later policy revision -> DENY
- Unknown external publishing outcome => reconciliation (not resend)
- Injection in source text must be inert; no tool permission granted

## Implementation sequence
A. Identify exact authenticated session, membership, connection and site-ownership read-only services in current UGP/server code with source lines/tests.
B. Define an *internal-only* resolver interface and non-forgeable construction boundary, with dependency injection for tests; no public route.
C. Add fail-closed authorization unit/integration fixtures for cross-tenant and revoked connections using existing test factories.
D. Add ledger acquisition/right-to-use attestation only when a trusted capture/rights authority is actually available; otherwise return REQUEST_EVIDENCE.
E. Wire to CVI advisory pipeline only after review, with no publication authority. The first implementation should perform no new external provider requests.
F. Run focused tests, typecheck, full relevant CI, exact-head verification, reviewer approval and explicit merge authorization.

## Operational notes
- The CI workflow triggers on PRs targeting main/initiative UGP and pushes to `ugp-*`. Stacked draft PRs need separate exact-head validation branches without modifying their actual targets.
- Never merge or deploy from a synthetic validation branch.
- Preserve UGP/P12.2 work; no main CI/prod claims based on test-only results.

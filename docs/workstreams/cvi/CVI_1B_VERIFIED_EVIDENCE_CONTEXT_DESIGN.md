# CVI-1B — independently verified evidence-context design
Date: 2026-10-08
Status: DESIGN ONLY; no executable implementation, migration, provider calls, integration or release authority
Predecessor: CVI-1A draft PR #923 targeting UGP initiative; do not assume merged

## Purpose and security boundary
CVI-1A evaluates advisory content necessity decisions based on UGP opportunity reports and caller assertions. Even when source/report hashes agree, this does not establish authenticity, source truth, rights, tenant authority, freshness or independent originality. CVI-1B must create an explicit **trusted verification decision** without declaring that model output alone is verified.

## Existing UGP integration targets
- `source-evidence-ledger-contract.ts`: source records, extracted evidence, coverage and provenance contracts.
- `content-opportunity-model-contract.ts`: opportunity fingerprint, market, coverage, cannibalization, recommended action.
- `article-draft-pipeline-contract.ts`: cited generated claims and fact-verification stages.
- `article-quality-gate-contract.ts`: fail-closed publication-advisory checks.
- CVI-1A `cvi-necessity-assessment-contract.ts`: caller-provided assertions marked `evidenceTrust.independentlyCertified=false`.

## Trust tiers
- RAW: user-provided or model-generated material with no verified binding.
- SOURCE_BOUND: source IDs and immutable content digests verified against the UGP ledger; not a guarantee the information is true.
- CLAIM_CORROBORATED: factual claims checked against permitted and suitable source records using explicitly specified verification method and policy; unresolved conflicts remain blockers.
- EXPERT_REVIEWED: subject matter expert review receipt is authoritative only when reviewer identity, policy and scope are authenticated.
- ORIGINALLY_CONTRIBUTED: original study/firsthand dataset attribution certified by an independently validated provenance chain, not a language model's novelty impression.

No tier automatically grants publication or execution authorization. An assessment cannot be upgraded simply by passing a boolean.

## Proposed data contract
`CviEvidenceContextV1`:
- version, contextId, contextFingerprint
- tenantId, siteId, verifiedSiteBindingReference (existing auth context; not a user-entered string)
- opportunityId, sourceModelFingerprint, sourceOpportunityFingerprint
- evidenceLedgerId, evidenceLedgerFingerprint, source IDs and exact source digests
- subject/locale and source permitted-use categories
- claim evaluations: claim hash, supporting source IDs, contradictory source IDs, freshness status, independent verifier method/version, decision
- business truth checks: authoritative data owner, source revision, verified property, observed-at and expiry time
- originality checks: evidence type, contribution basis, data rights, reviewer/approval provenance, false-firsthand-experience prohibition
- conflict summary; unresolved evidence requests; mandated human approvals; policy version
- evaluation timestamp supplied explicitly; expiry policy
- independentAssessment = `VERIFIED_FOR_RESEARCH | NEEDS_EVIDENCE | REVIEW_REQUIRED | INVALID`
- safe semantics: readOnly, deterministic, no execution authorization, no provider/public-site writes, no network/DB calls in core evaluator

## Anti-forgery rules
1. A pure evaluator must consume verified domain records supplied by an authenticated evidence authority, not trust a user-provided `certified=true`.
2. Scope linkage comes from existing tenant/site access control and verified site-ownership evidence; an untrusted caller cannot choose another tenant's evidence.
3. Source content hash binds exact content, acquisition time, source URI/identity and allowed usage; references must be resolved via an approved source ledger.
4. Freshness must use an explicit reference time and typed expiration policy (no `Date.now()` in deterministic core).
5. Reviewer identity/role and approval must be independently checked by the existing authorization subsystem.
6. Deny on missing records, hash mismatches, duplicate conflicting claim IDs, tenant-crossing references, out-of-scope approval, uncertain license, stale claims or unverifiable original-experience assertions.
7. Do not make a cryptographic signature claim without an implemented trusted key-management, verification, revocation and key-rotation design.
8. Never accept untrusted content instructions from sources or model output as permission to call tools or publish.

## Minimal incremental delivery
**CVI-1B.1** source-ledger-to-opportunity evidence reconciliation (pure typed contracts + tests, no claims of independent truth).
**CVI-1B.2** authoritative business fact provenance and expiry check (read-only).
**CVI-1B.3** original-contribution and claim corroboration manifest (human escalation when needed).
**CVI-1B.4** authorized verified context resolver and CVI-1A integration; separate task authorization.
**CVI-1B.5** adversarial assessment benchmark and optional non-production certification. No autonomous publishing in 1B.

## Negative fixtures required
Forged evidence fingerprint; plausible-looking yet wrong claims; stale policy/pricing; mismatched site; different tenant; absent resource ownership; replayed/revoked approval; AI-generated fake testing experience; unsupported originality; source-licensing prohibition; conflicting sources; duplicate evidence; evaluator/source collusion; unknown reviewer credentials; invalid time; mismatched locale; partial provider timeout; untrusted prompt-injection instructions.

## Entry prerequisites
- CVI-1A exact-head CI passed and PR review issues resolved.
- Confirm actual current UGP source-ledger and authorization code signatures and test data builders.
- Select authoritative site/tenant binding service by code audit.
- Produce line-referenced technical specification and explicit, feasible verification commands.
- No merge, production deployment, migration, or provider access without separate authority.

## Certification / definition of done
Tests cover positive/negative and metamorphic cases; report identity is deterministic and bound to all decision-affecting inputs; no unverified assertion is promoted into trusted evidence; source rights and tenant isolation fail closed; no API, provider, DB, network or runtime side effects from pure evaluator; independent reviewer signs off on boundaries. Overall CI green for exact tested head.

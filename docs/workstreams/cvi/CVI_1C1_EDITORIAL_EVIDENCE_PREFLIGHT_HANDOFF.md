# CVI-1C.1 — Editorial evidence and factual-claim preflight

Date: 2026-10-09
Status: NEW DRAFT PR, exact-head CI pending; no production integration.

## Existing validated security base
- CVI-1B.4N PR #962: completed full GitHub CI success run 37911406957 at ced67f2b0d2e379ac201d85b9c72942a9245176a.
- CVI-1B.4O PR #963: completed full GitHub CI success run 37911885274 at adff23a52e502f22fc69ce89b828d647b418746f.
- CVI-1B.4P PR #965: completed full GitHub CI success run 37912316845 at 8eff1c33c5be9bed5873a439c5b42e5a47d97ce5.
- All 20 earlier CVI PRs are still stacked, draft, open and unmerged.

## New PR
- PR #968: https://github.com/intssere/SEO_ENGINE/pull/968
- Branch: workstream/cvi-1c1-editorial-evidence-gate-pr965-dependent
- Base: workstream/cvi-1b4p-acquisition-membership-fence-pr963-dependent
- Initial HEAD: 5fd98b5469a599da17ac18e410ac1d5deb18f8da
- Proof branch: ugp-cvi-1c1-ci-proof-20261009

## New contract and tests
- artifacts/api-server/src/lib/cvi-editorial-evidence-gate.ts
- artifacts/api-server/src/lib/cvi-editorial-evidence-gate.test.ts
- Input: candidate identity/fingerprint, necessity, freshness, originality, claims, source metadata, declared rights, source publisher independence, human reviewer claim.
- Results: REJECT for contested claim, restricted license, stale fact, duplicate or broken provenance, explicit human rejection; NEEDS_HUMAN_REVIEW for unverified or insufficiently corroborated material claims, unknown licenses, unsupported necessity/originality, missing approval; READY_FOR_GOVERNED_INTEGRATION_REVIEW only for a fully declared passing packet.
- In every result: factualTruthIndependentlyProven=false, authorizationGranted=false, executionAuthorized=false, publicationAuthorized=false.
- No independent crawler/source fetching, provider attestation, actual plagiarism detection, editorial authentication, or content publishing implemented.

## Risks / next requirements
- This gate consumes caller-supplied statuses, can be spoofed, and must not be exposed as a trusted independent proof of factual accuracy or source ownership.
- A declared second independentPublisherId is not independently verified source independence or corroboration.
- An 'approved' reviewerId is not an authenticated human reviewer receipt.
- Integration with live research, immutable trusted source excerpts, source licensing, factual-claim graph, tenant identity, accountable human/editorial approval and UGP publishing admission all remain separate.
- CI at exact PR #968 HEAD must complete before code can be described as certified; no merge, deployment or publication was performed.

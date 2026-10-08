# CVI-1B.3 — Claim-to-source and contribution provenance handoff

Date: 2026-10-08
Status: DRAFT STACKED PR; HEAD CI RUNNING; NO MERGE OR DEPLOY

## Stack
- PR #923: CVI-1A, HEAD 2f5b90d331093e584b100ccfcec8f8deb055ecca, GitHub validate SUCCESS.
- PR #928: CVI-1B.1, HEAD 930066cd5078c15896e41bfc0d3154e0ed192b81, GitHub validate SUCCESS.
- PR #931: CVI-1B.2, HEAD 71bf13d412d8da1bd4ce64628cc85477904696e6, GitHub validate IN_PROGRESS at latest inspection, run 37811406646.
- PR #932: CVI-1B.3, branch workstream/cvi-1b3-claim-provenance-pr931-dependent, base workstream/cvi-1b2-business-truth-freshness-pr928-dependent.
- Current PR #932 HEAD: 5d783958febe890f5385522c4c04a6aa81cbd65d. GitHub validate IN_PROGRESS, run 37811919663.
- Exact-head CI proof branch: ugp-cvi-1b3-ci-proof-20261008-r2; do not confuse with older r1 at 8ce168e30d9ca898f29b380e8c4f499b38386d30.

## Source files
- artifacts/api-server/src/lib/cvi-claim-provenance-contract.ts
- artifacts/api-server/src/lib/cvi-claim-provenance-contract.test.ts

## Behavioral contract
- Reuses UGP source ledger, CVI-1B.1 source binding, deterministic hashes and declared opportunity/model lineage.
- Links each claimKey to requested evidence fingerprints and UGP evidence claimRefs.
- Missing references block; conflicts route to review; contribution candidates require source references from first-party or official sources.
- A first-party/official source alone is **not** independent proof of novelty or firsthand experience. The report explicitly sets claimsIndependentlyVerified=false, originalityIndependentlyVerified=false, licensingIndependentlyVerified=false, reviewerAuthorityVerified=false and tenantAuthorityVerified=false.
- Zero network, provider, persistence, scheduler, CMS, runtime caller or production effects.

## Trust limitations and follow-up
- The current pure core can verify internal consistency of objects presented to it, not cryptographic source authenticity, tenant ownership or independent expert approval.
- A coherent but fabricated ledger remains a threat. Never grant autonomous generation/publish rights from this result.
- Before approval: exact-head CI success; test fixture integrity; manual source-code review; no change in underlying PR bases; independent developer review of claimRefs/support tier semantics, unsupported factual claims, source rights and contradiction handling.
- Recommended next work: CVI-1B.4 authenticated authority/context adapter specifications and provider-free trust-boundary tests. Separate implementation branch and governance review. Do not implicitly merge all stacked PRs.

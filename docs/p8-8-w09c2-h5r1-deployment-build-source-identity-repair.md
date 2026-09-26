# P8.8 W09-C2 H5-R1 — Deployment build source-identity repair

## Failure being repaired

The first authorized H5 Replit publication failed closed in deployment build `4d7a1549-90c9-42fe-befa-bf493d117424` because W09-C2G received no complete `EXPECTED_CANONICAL_*` identity. Promotion/serving was not reached.

## Design

H5-R1 preserves the W09-C2F artifact schema/fingerprint and the W09-C2G bundle → provenance generation → verification ordering. It adds one fail-closed source-identity boundary:

1. If all three dedicated non-secret explicit inputs are present, use them exactly.
2. If only a subset is present, fail closed. Never mix explicit and inferred identity.
3. If none is present, resolve commit, tree and attached branch from the local Git source after requiring a clean tracked working tree.
4. If Git metadata, attached branch, or clean source cannot be established, fail closed.
5. The post-build verifier independently resolves the same admissible source identity and compares the generated artifact's exact commit/tree/branch/fingerprint.
6. No tracked file contains a release-specific commit or tree literal.

The Git-derived path is intentionally evidence-dependent: it does not assume Replit deployment builds contain Git metadata. If the deployment build lacks authoritative Git metadata, the next publication must fail closed rather than fabricate provenance.

## Forbidden identity sources

No identity may be derived from DATABASE_URL, runtime deployment IDs, historical Production IDs, provider state, Railway, UGP, hostnames, timestamps, or prior artifacts.

## Acceptance

- deterministic tests cover explicit identity, partial-explicit fail closure, clean Git-derived identity, dirty-tree rejection, and detached/unavailable Git rejection;
- static integration tests prove the generator crosses only the H5-R1 resolver and the verifier independently performs Git resolution;
- full exact-head CI passes;
- changed scope is limited to provenance source-resolution implementation/tests/specification;
- no Replit or Production mutation is part of this PR.

## Post-merge sequence

A merge does not authorize Production action. After merge: reconcile Replit source to the new canonical main under a new H3 authorization, perform a new H4 build/certification for that identity, then separately authorize one H5 retry. If Git metadata is unavailable in the deployment build, stop fail-closed and design a separately certified explicit build-input mechanism.

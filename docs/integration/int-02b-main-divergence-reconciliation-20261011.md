# INT-02B — Mainline divergence read-only reconciliation, 2026-10-11

**PR:** #1072 (Draft); **integration HEAD:** `1088605b045402cc31e2afc3283777a18537379a`; **main HEAD:** `f51c5dbddfa5af36f11b139dd0a24bd3bc06d3ff`; **merge base:** `93f457f9f00d1ef36c3c92dacef1ca42aa2c2b9e`.

## Verified GitHub compare evidence

- `main...integration/int-02-migration-authority-design`: integration ahead **104** commits and behind **27**.
- `integration/int-02-migration-authority-design...main`: 27 newer main commits touch **11** paths, exclusively the customer web application in `artifacts/seo-engine/` (App, layout, styles, onboarding page, navigation/accessibility tests and e2e).
- Integration changed **33** paths, limited to `docs/integration/`, `.github/workflows/int-02*`, and `lib/db/migrations/0012–0015`.
- **Exact changed-path intersection: empty.** This is not a three-way local merge simulation and does not certify runtime/API compatibility, tree content of other active branches, or CI at a hypothetical combined head.
- GitHub PR currently has no recorded reviews or review threads. Full CI of prior PR HEAD was still in progress at last observation; four migration-specific checks passed.

## Proposed safe merge-readiness procedure (not executed)

1. Freshly re-fetch main and PR exact SHA; identify other active integration branches and confirm no conflicting concurrent ownership.
2. Create a new **isolated** worktree/branch from latest main for a dry-run integration. Never reset, rewrite or auto-merge main.
3. Simulate merge of exact PR HEAD, capture file and semantic conflicts, assess SQL provenance; preserve P12.2 0008–0011 and UGP renumbered 0012–0015.
4. Run tests for **both** migration guardrails and customer UI integration, including changed mainline onboarding/navigation suites. Recheck runtime build with combined tree; do not infer safety solely from disjoint changed filenames.
5. Independently resolve Production database authority and historical installation receipts before any live migration authorization. Remaining INT-01 application-level conflict ledger still requires its own workstream.
6. Require named review and fresh exact-head approval before any merge/deploy.

**Disposition:** `DISJOINT_PATHS_PRELIMINARY_ONLY` — zero changed-file overlap; merge simulation, review, historical DB evidence and Production execution authority remain blocked/unperformed.

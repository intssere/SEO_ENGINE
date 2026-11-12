# INT-02B — exact-head engineering closeout and blockers

**Status:** Engineering verification complete for the disposable compatibility scope; **not** migration-authorized, Production-certified or approved to merge.
**PR:** #1072 Draft. **Verified PR head:** `a307e1efa14610833c5d76d6b24becfec6ef1399`. **Main reviewed:** `f51c5dbddfa5af36f11b139dd0a24bd3bc06d3ff`.

## Completed GitHub checks at verified head

- Full CI: SUCCESS (run 38147083722).
- Isolated mainline merge rehearsal: SUCCESS (run 38147083723). Combined tree tested customer app typecheck, contract tests and frontend build, with no merge pushed.
- Disposable PostgreSQL compatibility: SUCCESS (run 38147083737).
- Migration manifest tests: SUCCESS (run 38147083760).
- Immutable UGP SHA256 audit: SUCCESS (run 38147083721).
- Upstream source verification: SUCCESS (run 38147083725).

The green CI status does not prove any production schema/lineage or an authorized installer. A merge into main would require fresh exact-head review/approval and post-merge CI.

## Scope that is complete

1. Preserve mainline 0008–0011; renumber four pinned UGP migrations to 0012–0015 without changing original SQL bytes.
2. Verify reproducible 15-migration disposable PostgreSQL installation and completed trace evidence.
3. Detect catalog drift including trigger disablement, CHECK/FK changes, columns and indexes.
4. Keep migration admission fail-closed even with positive caller-supplied verification flags.
5. Verify receipt syntax, canonical migration names, SQL SHA256, complete 11/15 history and missing independent witness.
6. Validate latest-main integration in ephemeral CI including customer UI test, typecheck and build.

## External blocked gates

- **DB authority:** independently verify provider/project/environment/service/database resource and application's actual Production binding. Provider architecture documentation is not proof.
- **Historical receipts:** collect executed migration evidence from the specifically authorized target using scoped read-only access, independent source of trust, and reviewable provenance. Synthetic fixtures and matching SQL hashes cannot prove installation.
- **Installer:** separately design, review, and explicitly authorize a one-shot target-specific migration plan with prestate, rollback, lock and non-replay protections. None exists here.
- **Application integration:** INT-01 application conflicts and other workstreams are not automatically resolved by PR #1072's migration-only compatibility. Confirm current main and related active branches before future merges.

**Release disposition:** `DISPOSABLE_COMPATIBILITY_VALIDATED__EXTERNAL_EVIDENCE_BLOCKED`.

No Production access, DB writes, provider operations, merge, deployment, or public-site mutation is authorized by this document.

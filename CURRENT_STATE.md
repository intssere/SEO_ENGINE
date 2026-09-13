# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. It intentionally avoids claiming that a documentation merge SHA is the permanent `main` SHA, because merging the checkpoint itself necessarily advances `main`.

If this file conflicts with the exact-SHA wording in `PROJECT_HANDOFF.md`, use this file for **current release position** and use `PROJECT_HANDOFF.md` for the detailed historical/architectural context.

## Application baseline completed

Task #56 — Risk Semantics Alignment & Effective-Risk Diagnostics v1 — is merged into the application codebase.

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/62`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/63`
- Tested PR head: `115709335c5cd1fb118cdceda56b1a6740ae5be2`
- PR CI #131 / run `34751293138`: success
- Task #56 application merge SHA: `8d1c65e630253a4e0f052076bfc6bf21fbf5679f`
- Task #56 application tree: `11bc62ba2545769d78f29c41a268423b1350545f`
- Post-merge application main CI #132 / run `34751384367`: success

Task #56 adds explicit evaluator risk, plan-control risk, and effective execution risk diagnostics without changing Task #51 authorization policy.

## Repository continuity package

PR #64 added the repository-native continuity package:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `PROJECT_HANDOFF.md`
- `.agents/skills/seo-engine-project/SKILL.md`
- `.agents/memory/project-continuity.md`
- `.agents/memory/MEMORY.md` index update

Documentation PR #64 merged after Task #56. Its post-merge CI #137 / run `34752734232` succeeded.

Because documentation-only commits may continue to advance `main`, **the first action in every new chat is to fetch/read the current GitHub `main` SHA and tree instead of assuming a hard-coded docs merge SHA.**

## Replit position at handoff

The last read-only Replit inspection before the documentation-only `main` commits showed:

- branch: `main`
- HEAD: `8d1c65e630253a4e0f052076bfc6bf21fbf5679f`
- tree: `11bc62ba2545769d78f29c41a268423b1350545f`
- working tree: clean
- ahead/behind against then-known `origin/main`: `0/0`

This means the Replit workspace already contained the complete Task #56 **application code**, but it may be behind current GitHub `main` only by later documentation commits. Before validation, exact-sync to whatever GitHub `main` is at that time and re-confirm that no runtime code changed beyond the certified Task #56 tree.

## Production position at handoff

Production remains healthy but still serves the **pre-Task-56** application bundle. A safe bundle inspection found the new Task #56 frontend field names absent.

Therefore Task #56 is **merged but not yet published/certified in production**.

## Database/auth/safety state at handoff

Read-only certification immediately before this checkpoint showed:

- development DB: 31 public base tables
- production DB: 31 public base tables
- `auth_sessions`: present in both
- `auth_audit_events`: present in both
- authentication enforcement: enabled
- authentication configuration: complete
- Google OIDC: configured
- allowlist-only access: enabled
- public registration: disabled
- `PUBLIC_SITE_WRITES_ENABLED` effectively false
- `AI_PROPOSAL_GENERATION_ENABLED` effectively false
- Task #53/#54 provider-write dispatch: disabled
- Task #53/#54 scheduler/batch write capability: disabled

No Task #53/#54 execution, Shopify/provider mutation, public-site write, DB mutation, auth change, restart, or publish was performed during the handoff inspection.

## Exact next release step

The next chat should continue the **Task #56 release**, not begin a new provider-write task.

1. Read `AGENTS.md`, this file, `PROJECT_HANDOFF.md`, `ARCHITECTURE.md`, and `.agents/skills/seo-engine-project/SKILL.md`.
2. Resolve current GitHub `main` SHA/tree and identify whether commits after the Task #56 application baseline are documentation-only.
3. Inspect Replit Git state read-only.
4. Exact-sync Replit to current canonical `main` if needed.
5. Confirm the runtime-code tree still corresponds to the merged Task #56 application tree plus documentation-only changes.
6. Re-confirm development/production DB schema parity at 31/31.
7. Run merged-main Replit validation: API tests, focused Task #56 frontend risk tests, API/frontend typechecks, API/frontend builds, OpenAPI/generated-client consistency, production-bundle safety markers, and diff/working-tree checks as applicable.
8. Re-confirm auth enabled/configured and all write/AI/Task #53/#54 scheduler/dispatch gates remain closed.
9. If validation is green and production still lacks Task #56, **stop and obtain explicit user authorization to publish**.
10. After authorized publish, certify production using least privilege:
   - health/auth status
   - 31/31 schema continuity
   - Task #56 risk-semantics fields/labels present
   - authenticated protected API behavior where necessary
   - public writes/AI generation/Task #53/#54 dispatch/scheduler/batch still closed
   - no unexpected provider/public-site/autonomous mutation
11. Reconcile any Replit-generated metadata/configuration commits back to canonical GitHub state without republishing solely for Git cleanup.
12. Only then mark Task #56 fully production-certified and decide the next engineering task.

## Hard stop conditions

Stop rather than improvising if any of these are observed:

- Replit runtime-code diff that is not explained by canonical GitHub `main`
- development/production schema mismatch
- auth tables missing
- auth enforcement unexpectedly disabled or incomplete
- public writes or AI proposal generation unexpectedly enabled
- Task #53/#54 dispatch/scheduler/batch unexpectedly enabled
- destructive Replit schema-sync proposal
- failed test/typecheck/build/bundle verification
- unexpected provider/public-site mutation activity

A generic `continue` does not authorize bypassing any of these conditions or executing Task #53/#54.
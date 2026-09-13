# SEO ENGINE Project Skill

Use this skill whenever an agent is asked to inspect, modify, test, merge, deploy, publish, certify, recover, or continue work on `intssere/SEO_ENGINE`.

## Goal

Complete SEO ENGINE tasks without losing project context, weakening safety boundaries, creating GitHub/Replit drift, or turning a bounded execution foundation into unintended autonomous provider mutation.

## Required reading

Before acting, read in this order:

1. `/AGENTS.md`
2. `/PROJECT_HANDOFF.md`
3. `/ARCHITECTURE.md`
4. `/.agents/memory/MEMORY.md` and any linked note relevant to the task

If these disagree, prefer the current GitHub code for implementation facts, `AGENTS.md` for operating rules, and `PROJECT_HANDOFF.md` only for mutable checkpoint data after independently verifying that checkpoint.

## Step 1 — Resolve the exact current state

Never continue from memory alone.

Verify:

- GitHub `main` SHA and tree
- active issue/task
- task branch name and head SHA
- PR number/base/head
- PR CI result for the exact head
- whether the PR is merged
- post-merge main CI if already merged
- Replit branch/HEAD/tree/ahead-behind/working tree before any sync or publish
- live deployment status before changing it
- development and production schema parity before publishing

Do not treat a prior chat statement as a substitute for these checks.

## Step 2 — Classify the requested action

Classify every requested action into one of these categories:

### A. Read-only inspection

Examples:

- inspect Git history/diff
- inspect source
- GET health/status
- SELECT database state
- inspect logs
- inspect provider metadata without changing it

Proceed using least privilege.

### B. Engineering change

Examples:

- code/API/UI/test/doc change
- schema migration code
- build configuration

Use branch -> tests -> PR -> PR CI -> exact-head merge -> main CI -> Replit sync -> validation -> publish/certification.

### C. Runtime configuration change

Examples:

- environment flags
- auth enforcement
- secrets
- deployment behavior

Require scope-specific authorization when the change affects production behavior or credentials. Never print secret values.

### D. Database write/DDL

Require explicit authorization identifying the target and scope. Fingerprint production first. Apply only the approved change. Certify afterward.

### E. Provider/public-site mutation

This is the highest-control category. A generic `continue`, merged PR, active write scope, or admin login does not authorize it. Follow Task #51/#53/#54 exact confirmations and freshness requirements.

## Step 3 — Preserve permanent safety gates

Default requirements:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- no autonomous mutation worker
- no approval-to-execution automatic transition
- ordinary provider connections read-only
- isolated write credential untouched unless a bounded execution task explicitly needs it

If a task does not need to modify a safety gate, verify it remains unchanged.

## Step 4 — Engineering implementation protocol

1. Start from verified canonical `main`.
2. Create a descriptive task branch.
3. Keep scope minimal.
4. Do not modify execution-policy files merely to make tests/UI agree unless the task explicitly changes policy.
5. Preserve compatibility fields when an additive API change can solve the problem safely.
6. Regenerate generated clients/types from the source OpenAPI spec; do not hand-author generated source-of-truth changes.
7. Add regression tests for the exact bug/ambiguity plus fallback/fail-closed cases.
8. Run focused tests first, then full relevant tests/typechecks/builds.
9. Run `git diff --check`.
10. Push branch and open PR.
11. Require CI success for the exact head SHA.
12. Merge exact tested head only.

## Step 5 — Post-merge protocol

After merge:

1. Record merge SHA and tree.
2. Query push-event GitHub Actions for the merge SHA; do not confuse PR-run status with main push status.
3. Require post-merge main CI green.
4. Inspect Replit before syncing.
5. Exact-sync GitHub `main` to Replit; never merge arbitrary Replit drift into canonical history.
6. Run tests/typechecks/build/bundle verification in Replit.
7. Verify dev/prod DB schema parity before publish.
8. Publish only if the task needs a new deployment.
9. Runtime-certify with GET/SELECT-first checks.
10. Inspect logs/data for unexpected writes.
11. Reconcile Replit-generated commits after certification without republishing merely for Git cleanup.

## Step 6 — Replit publication safety

Before publish, explicitly verify:

- workspace is the intended GitHub main SHA/tree
- working tree clean
- dev schema matches production schema
- production auth schema remains present
- build passes
- API bundle includes expected Task markers
- auth configuration is still valid
- public writes remain disabled

If Replit schema review proposes dropping objects that should exist in production, cancel. Align development schema first; do not approve destructive synchronization simply to get a publish through.

## Step 7 — Authentication certification

Authentication is already live; normal engineering tasks should not redo login/logout certification unless auth code/config changes.

For auth changes, certify:

- public health/status remains available as designed
- anonymous protected route returns 401
- allowlisted login redirects through Google OIDC correctly
- server session created with expected role and expiration bounds
- protected GET succeeds when authenticated
- CSRF protects unsafe requests
- logout revokes server session
- unallowlisted users fail closed
- no secret/token/identity leakage

Production auth/session testing creates legitimate auth DB/audit side effects; perform it only when explicitly part of certification.

## Step 8 — Risk semantics rule

Never treat `action_plans.risk_level=blocked` as evidence that the opportunity evaluator classified impact as blocked/high.

Keep separate:

- evaluator risk
- plan-control risk
- effective execution risk

Task #51 effective risk uses evaluator-first fallback. Preserve this exact semantics unless a dedicated policy-change task explicitly changes it.

## Step 9 — Task #51/#53/#54 control

### Task #51

Requires exact approval/authorization binding to the proposal fingerprint and freshness window. It creates internal execution authorization, not provider-write permission.

### Task #53

Requires fresh preflight and exact execute-and-rollback confirmation. One bounded live action, verify, rollback. Never reuse a consumed preflight fingerprint.

### Task #54

Requires fresh preflight and separate exact apply-and-verify confirmation. One bounded live action, verify, intentionally leave live on success, rollback only on verification failure. Do not batch.

If the user has not explicitly authorized the relevant step, stop before it and report the exact safe next authorization.

## Step 10 — Database recovery protocol

If dev/prod schemas diverge:

1. Do not publish.
2. Inspect both schemas read-only.
3. Fingerprint operational production data.
4. Identify the intended migration from canonical GitHub.
5. Obtain explicit DDL authorization.
6. Apply only that migration to the intended target.
7. Verify table count, tables, indexes, constraints, and key operational fingerprints.
8. Align the other environment if needed.
9. Do not republish just because DDL was repaired; only publish if application/runtime changes require it.

## Step 11 — Handoff protocol

Before ending a long chat/task:

- update `PROJECT_HANDOFF.md` with exact issue/PR/branch/head/CI/deployment checkpoint
- update `ARCHITECTURE.md` only for architectural changes
- update `AGENTS.md` only for durable operating rules
- add durable lessons to `.agents/memory` when they are reusable and non-transient
- do not include secrets or personal identity values
- give the next chat a copy/paste prompt whose first action independently verifies the checkpoint

## Current checkpoint when this skill was introduced

Task #56 PR #63 is open and PR CI #131 has passed for exact head:

`115709335c5cd1fb118cdceda56b1a6740ae5be2`

The next chat should verify that head is unchanged, merge it, then require post-merge main CI green before Replit sync/deployment work.

See `PROJECT_HANDOFF.md` for the complete state.
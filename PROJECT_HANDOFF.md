# SEO ENGINE — Complete Continuation Handoff

**Purpose:** allow a new ChatGPT/agent session to resume the project at the exact current checkpoint without rediscovering architecture, weakening safety gates, or losing release-state context.

**Repository:** `intssere/SEO_ENGINE`  
**Replit app:** `SEO_ENGINE`  
**Repl ID:** `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`  
**Production:** `https://dsseoengine.replit.app`

Read `AGENTS.md`, `ARCHITECTURE.md`, and `.agents/skills/seo-engine-project/SKILL.md` before acting.

---

## 1. Exact continuation checkpoint — START HERE

**Task #56 — Risk Semantics Alignment & Effective-Risk Diagnostics v1 is merged to GitHub `main`, and post-merge main CI is green. It has NOT yet been published to production.**

### Canonical GitHub state

- Task #56 issue: `https://github.com/intssere/SEO_ENGINE/issues/62`
- Task #56 PR: `https://github.com/intssere/SEO_ENGINE/pull/63`
- PR head that was tested: `115709335c5cd1fb118cdceda56b1a6740ae5be2`
- PR CI #131, run ID `34751293138`: **completed / success**
- PR #63: **merged**
- Merge SHA / current canonical `main`: `8d1c65e630253a4e0f052076bfc6bf21fbf5679f`
- Current canonical tree: `11bc62ba2545769d78f29c41a268423b1350545f`
- Post-merge main CI #132, run ID `34751384367`: **completed / success**

### Current Replit workspace state

Read-only inspection after the merge confirmed:

- Branch: `main`
- HEAD: `8d1c65e630253a4e0f052076bfc6bf21fbf5679f`
- Tree: `11bc62ba2545769d78f29c41a268423b1350545f`
- Locally known `origin/main`: same SHA
- Ahead/behind: `0/0`
- Working tree: clean

So GitHub `main` and the Replit workspace are already exact-aligned to the merged Task #56 tree. No additional Git sync is currently required unless a fresh inspection shows drift.

### Current production deployment state

Production is healthy and published, but **still serves the pre-Task-56 frontend/code bundle**. Safe bundle inspection found the Task #56 fields absent from the live frontend asset:

- `evaluatorRisk`: absent
- `planControlRisk`: absent
- `effectiveExecutionRisk`: absent

Therefore Task #56 is merged but **not yet production-deployed**.

### Current DB/auth/safety state

Read-only inspection after Task #56 merge confirmed:

- Development DB public base tables: **31**
- Production DB public base tables: **31**
- `auth_sessions`: present in both
- `auth_audit_events`: present in both
- Authentication enforcement: **enabled**
- Authentication configuration: **complete**
- Google OIDC, allowlist-only access, public registration disabled
- `PUBLIC_SITE_WRITES_ENABLED` effectively false: **yes**
- `AI_PROPOSAL_GENERATION_ENABLED` effectively false: **yes**
- Task #53/#54 provider-write dispatch enabled: **no**
- Task #53/#54 scheduler/batch write capability enabled: **no**

### Exact first action in the new chat

The next agent should **not re-merge Task #56**. It should:

1. Re-read/verify GitHub `main` is still `8d1c65e630253a4e0f052076bfc6bf21fbf5679f` (or determine if it advanced legitimately).
2. Re-check Replit branch/HEAD/tree/working tree and confirm it still exactly matches canonical `main`.
3. Re-confirm dev/prod schema parity at 31/31 before any publish.
4. Run the post-merge Replit validation on the exact merged tree: relevant tests, typechecks, API/frontend builds, API production bundle markers, generated-contract consistency, and focused Task #56 risk tests.
5. Verify auth remains enabled/configured and public-write/AI/write-dispatch/scheduler/batch gates remain closed.
6. If all checks are green, **stop and request explicit authorization to publish Task #56** if publication has not already been explicitly authorized in the new chat.
7. After authorized publish, certify production health/auth/schema/safety plus the presence of Task #56 risk-semantics fields/labels using read-only checks.
8. Reconcile any Replit-generated metadata/config commits back to canonical GitHub `main` without republishing merely for Git cleanup.

Do not perform Task #53/#54 execution or Shopify/public-site mutation during Task #56 release certification.

---

## 2. Task #56 diagnosis and implementation

The original concern was that the Unisex Fragrance candidate appeared to have:

- evaluator risk = `medium`
- persisted `action_plans.risk_level` = `blocked`

Read-only diagnosis proved this is **intentional deterministic behavior**, not stale persistence, migration residue, or corruption.

There are three distinct semantics:

1. **Evaluator/impact risk** — `low | medium | high | critical`.
2. **Plan-control risk** — `auto | approval | blocked`.
3. **Effective execution risk** — the value Task #51 actually evaluates.

Task #51 uses evaluator-first precedence:

```sql
COALESCE(
  o.impact_estimate->>'riskClassification',
  ap.risk_level,
  'blocked'
)
```

The risk gate rejects `blocked`, `high`, and `critical`. Therefore the Unisex candidate's effective execution risk is `medium`, even though the dry-run plan-control state remains `blocked`.

Task #56 fixes reporting/UI ambiguity without changing execution policy.

### Task #56 behavior

The merged patch adds explicit read/API fields:

- `evaluatorRisk`
- `planControlRisk`
- `effectiveExecutionRisk`

while retaining legacy compatibility fields.

Frontend authorization eligibility now consumes `effectiveExecutionRisk`, matching Task #51's actual precedence. UI labels distinguish evaluator risk, plan control, and effective execution risk.

### Task #56 changed files

- `artifacts/api-server/src/lib/action-planner.test.ts`
- `artifacts/api-server/src/lib/operational-data.ts`
- `artifacts/seo-engine/src/components/proposal-table.tsx`
- `artifacts/seo-engine/src/pages/actions-risk-ui-alignment.test.ts`
- `artifacts/seo-engine/src/pages/actions.tsx`
- `artifacts/seo-engine/src/pages/approvals.tsx`
- `artifacts/seo-engine/src/pages/dashboard.tsx`
- `artifacts/seo-engine/src/pages/opportunities.tsx`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/proposalRecord.ts`

No Task #51 policy implementation, migration, provider-write, scheduler, or production-data behavior was changed.

### Validation already completed before merge

- API spec codegen: passed
- API server tests: **180 passed, 0 failed**
- focused frontend risk tests: **3 passed, 0 failed**
- API typecheck: passed
- frontend typecheck: passed
- API build and production-bundle marker verification: passed
- frontend build: passed, with only an existing non-fatal sourcemap warning
- `git diff --check`: passed
- PR CI #131: passed
- post-merge main CI #132: passed

The remaining release work is Replit merged-main validation -> authorized publish -> runtime certification -> Replit Git reconciliation.

---

## 3. Task #55 — authentication/RBAC: completed and live

Task #55 is fully merged, published, and production-certified.

### GitHub

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/58`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/61`
- Task #55 merge SHA: `6e0761a92c54f7f5a47ee68a1b9b99e2fa113c84`
- PR CI #129: green
- post-merge main CI #130: green

### Authentication design

- Google OIDC authorization-code flow
- state + nonce + PKCE S256
- exact production callback: `https://dsseoengine.replit.app/api/auth/google/callback`
- scopes: `openid email profile`
- allowlist-only access
- public registration disabled
- roles: `viewer`, `operator`, `admin`
- server-side PostgreSQL sessions
- absolute TTL: 12 hours
- idle TTL: 30 minutes
- rotation threshold: 15 minutes
- CSRF protection for unsafe requests
- auth audit records
- server-side RBAC is authoritative

### Production auth certification

Authentication enforcement is enabled and was certified end-to-end:

- `/api/healthz` 200
- `/api/auth/status` configured/enforcement enabled
- anonymous protected operational GETs return 401 `authentication_required`
- login start redirects correctly to Google
- allowlisted admin sign-in completed
- server-side admin session created with valid TTL/idle bounds and CSRF material
- authenticated protected GET succeeded
- browser logout returned 204
- session was revoked and active sessions returned to zero

Do not expose actual allowlisted identities, secrets, session/token hashes, CSRF material, or provider tokens.

---

## 4. Database state and critical Replit publication lesson

Task #55 schema adds:

- `auth_sessions`
- `auth_audit_events`

with six auth indexes:

- `auth_sessions_active_lookup_idx`
- `auth_sessions_subject_idx`
- `auth_sessions_expiry_idx`
- `auth_audit_events_created_idx`
- `auth_audit_events_subject_idx`
- `auth_audit_events_type_idx`

Current intended/certified schema:

- Development: **31 public base tables**
- Production: **31 public base tables**
- both auth tables present
- expected auth indexes present

### Prior schema regression incident

A manual Replit publish once synchronized a **29-table development schema** onto a correct **31-table production schema**, removing Task #55 auth tables from production.

Recovery aligned both environments back to 31 using the already-approved `0002_auth.sql`.

**Permanent release rule:** never publish while development schema is behind or meaningfully different from production. Compare both schemas before publication.

Do not identify a production Neon target only by database/user names; use environment binding plus read-only schema/data fingerprints.

Historical operational fingerprint used during the recovery included:

- `action_plans`: 30
- `actions`: 1
- `connections`: 3
- `deployments`: 1
- `verifications`: 3
- `rollbacks`: 2

These counts are historical recovery context, not permanent invariants.

---

## 5. Permanent safety state

Current intended/effectively checked safety state:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- ordinary Shopify/Google operational connections read-only
- Task #53/#54 provider-write dispatch closed
- Task #53 scheduler disabled
- Task #54 scheduler disabled
- Task #54 batch execution disabled
- no autonomous public-site mutation worker
- no approval-to-execution automatic transition

An isolated Shopify write-capable credential intentionally exists for Task #53/#54. Do not remove it simply because global writes are disabled. Possession of write scope is not authorization to use it.

A generic `continue` never authorizes a provider/public-site mutation.

---

## 6. Task #51–#54 execution foundations

### Task #51 — Controlled Execution Foundation v1

Purpose: transform an explicitly approved proposal into a bounded internal executable action under exact confirmation and a short authorization window.

Exact confirmation family:

`AUTHORIZE:<planId>:<proposalFingerprint>`

Approval TTL defaults to 15 minutes, with configured maximum 60 minutes.

Task #51 does not by itself grant provider-write permission.

### Task #52 — Shopify Write Connector + Verification/Rollback Dry-Run Foundation v1

Capabilities include bounded title/meta-description operations, stale-state checks, fingerprints/idempotency, provider receipts, read-after-write verification, rollback, network-free dry-run/self-test, and manual-intervention handling for uncertainty.

### Task #53 — Controlled Single-Action Production Pilot v1

Exact live confirmation:

`EXECUTE_AND_ROLLBACK_TASK53:<actionId>:<preflightFingerprint>`

Historical Home Fragrance pilot:

- Plan `2c39cae9-83ea-4d29-8150-915f78128ebc`
- Proposal `2d3eef96-920a-4bbf-8d74-71bda6a25fc7`
- Action `d89cef34-2251-468e-b1c6-96b8c86050b6`
- URL `https://diamondshelf.us/collections/home-fragrance`
- GID `gid://shopify/Collection/335423963335`
- Field `meta_description`
- Original value `null`
- Final lifecycle `production_pilot_verified_and_rolled_back`
- Consumed preflight fingerprint `d43462ba39043707566191b318aa7d8db71cf0621287cfbc523c5e137bc2a33b`

**Never reuse that consumed fingerprint.**

### Task #54 — Verified Persistent Single-Action Production Apply v1

Routes:

- `POST /api/execution/:id/task54/preflight`
- `POST /api/execution/:id/task54/apply`

Exact apply confirmation:

`APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`

Success lifecycle: `production_change_verified_live`  
Verification-failure rollback lifecycle: `production_apply_rolled_back_after_verification_failure`  
Uncertain lifecycle: `manual_intervention_required`

No first persistent Task #54 live apply has occurred yet.

---

## 7. Unisex Fragrance candidate — future controlled apply candidate

This is the candidate that motivated Task #56:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- Field: `meta_description`
- Current value at diagnosis: `null`
- Proposed value: `Unisex Fragrance groups Gift Set, Perfume & Cologne, and Perfume Oils in one collection, keeping these related product types together for comparison.`
- Proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- Quality: 100 / pass
- Approval eligible: true
- Lifecycle at diagnosis: `approval_ready`
- Approvals/actions/deployments at diagnosis: 0 / 0 / 0
- Evaluator risk: `medium`
- Plan-control risk: `blocked`
- Effective execution risk: `medium`

Task #56 clarification does not approve this proposal and does not authorize its execution.

---

## 8. Future first persistent Task #54 sequence — not yet authorized

When the user explicitly chooses to perform the first persistent apply:

1. Ensure Task #56 is deployed/certified and prerequisites remain green.
2. Keep public writes false during proposal approval/internal authorization.
3. Obtain explicit proposal approval for the exact plan/fingerprint.
4. Perform Task #51 internal authorization under exact confirmation.
5. Separately authorize opening any required global write gate.
6. Read-only certify runtime safety state.
7. Separately authorize Task #54 preflight.
8. Return a **fresh** preflight fingerprint and exact target/before/after state.
9. Obtain exact `APPLY_AND_VERIFY_TASK54` authorization naming fresh action/fingerprint/GID/field/old/new values and one-mutation/verify/leave-live/rollback-only semantics.
10. Execute once.
11. Read-only certify provider/storefront state.
12. Stop and measure; do not batch more changes.

Never reuse stale/consumed fingerprints.

---

## 9. Replit/Git reconciliation lessons

Replit publication has repeatedly created local-only commits such as:

- metadata-only `Published your App`
- `.replit` changes adding `python-base-3.13` after shell diagnostics

Python is not required by the current Node/Vite application runtime.

After publication certification, inspect local-only commits and compare trees/changed files. Incidental drift can be reset to canonical GitHub `main` **without republishing**. Never reset blindly before inspecting local differences.

---

## 10. Release workflow invariant

For each engineering task:

1. exact canonical GitHub baseline
2. dedicated task branch
3. implementation + focused/full validation
4. push branch
5. PR
6. PR CI green for exact head
7. merge exact tested head
8. post-merge `main` CI green
9. exact GitHub main -> Replit alignment
10. Replit validation/tests/typecheck/build/bundle markers
11. dev/prod schema parity check
12. publish only when needed/authorized
13. runtime certification with least privilege
14. verify no unexpected provider/public-site/autonomous activity
15. reconcile Replit-only Git drift
16. do not start next engineering task until certification is complete

---

## 11. What `continue` means

`continue` means continue the current safe engineering/release workflow from the last independently verified checkpoint.

It does **not** authorize:

- proposal approval
- opening public-write gates
- Task #53 live pilot
- Task #54 preflight/apply
- Shopify/public-site mutation
- database DDL
- secret/credential change
- auth/RBAC weakening
- autonomous worker enablement

---

## 12. Documentation continuity PR

Repository-native architecture/agent/handoff documentation is being introduced separately from Task #56:

- Branch: `docs-project-continuity-architecture`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/64`
- Files include `AGENTS.md`, `ARCHITECTURE.md`, this handoff, `.agents/skills/seo-engine-project/SKILL.md`, and a project-continuity memory note/index update.

The documentation PR is documentation-only and must not be mistaken for the Task #56 runtime release. If PR #64 is still open when the new chat begins, it may be reviewed/merged independently after its CI is green. Do not let documentation merging replace Task #56 Replit validation/publish/runtime certification.

---

## 13. Long-term project direction

The goal is a highly autonomous SEO/GEO/AIO optimization system, but autonomy must be earned in layers. Future areas include:

- measurement/attribution loops for persistent actions
- competitor evidence ingestion and gap analysis
- recommendation prioritization by expected impact/confidence/cost/risk
- controlled experimentation/cooldown windows
- retain/replace/rollback decision loops
- AI/GEO citation/visibility monitoring
- agentic-search optimization signals
- broader bounded provider actions only after action-specific stale checks, verification, rollback, and authorization
- eventually recurring automation after no-write monitoring and decision loops are proven

Do not jump from current single-action controls to unrestricted autonomous mutation.

---

## 14. New-chat resume checklist

The new agent should begin by reading `AGENTS.md`, `ARCHITECTURE.md`, this handoff, and the project skill from PR #64 (or `main` if PR #64 has already merged), then independently verify:

1. GitHub `main` is `8d1c65e630253a4e0f052076bfc6bf21fbf5679f` or identify any legitimate newer main.
2. Task #56 PR #63 is merged.
3. Main CI #132 / run `34751384367` is green.
4. Replit workspace is on the same canonical main SHA/tree, clean, ahead/behind 0/0.
5. Dev/prod DB schemas remain 31/31 with auth tables.
6. Auth remains enabled/configured.
7. Public writes and AI proposal generation remain false; Task #53/#54 dispatch/scheduler/batch remain closed.
8. Production still lacks Task #56 risk-semantics fields unless a publish occurred after this handoff.
9. Run merged-main Replit validation.
10. If green and Task #56 is still unpublished, request explicit authorization to publish; then runtime-certify and reconcile Git drift.

That is the exact continuation point.
# SEO ENGINE — Complete Continuation Handoff

**Purpose:** allow a new ChatGPT/agent session to resume the project at the exact current checkpoint without rediscovering architecture, weakening safety gates, or losing release-state context.

**Repository:** `intssere/SEO_ENGINE`  
**Replit app:** `SEO_ENGINE`  
**Repl ID:** `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`  
**Production:** `https://dsseoengine.replit.app`

Read `AGENTS.md` and `ARCHITECTURE.md` before acting.

---

## 1. Exact continuation checkpoint

The active engineering task is **Task #56 — Risk Semantics Alignment & Effective-Risk Diagnostics v1**.

### Task #56 issue

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/62`
- Objective: distinguish evaluator risk, plan-control risk, and Task #51 effective execution risk in API/UI/reporting while preserving exact execution semantics.

### Task #56 branch

- Branch: `task-56-risk-semantics-alignment`
- Head SHA: `115709335c5cd1fb118cdceda56b1a6740ae5be2`
- Tree at last local certification: `11bc62ba2545769d78f29c41a268423b1350545f`
- Branch was pushed and synchronized with GitHub.
- Working tree was clean when last inspected.

### Task #56 PR

- PR: `https://github.com/intssere/SEO_ENGINE/pull/63`
- PR number: **63**
- Base: `main`
- Base SHA when opened: `6e0761a92c54f7f5a47ee68a1b9b99e2fa113c84`
- Head SHA: `115709335c5cd1fb118cdceda56b1a6740ae5be2`
- One commit at opening.
- 12 changed files, +53/-10 at opening.

### PR CI — IMPORTANT

GitHub Actions PR CI **#131**:

- Run ID: `34751293138`
- Workflow: `CI`
- Status: `completed`
- Conclusion: **success**
- Head tested: `115709335c5cd1fb118cdceda56b1a6740ae5be2`

**PR #63 is intentionally left unmerged for the next chat.**

### First action in the next chat

1. Re-fetch PR #63 metadata and verify its head is still exactly `115709335c5cd1fb118cdceda56b1a6740ae5be2`.
2. Reconfirm CI #131 is successful for that head.
3. Verify no unexpected review/change request appeared.
4. Merge **the exact tested head SHA** using the normal merge method.
5. Record the merge SHA.
6. Check the **post-merge `main` push CI** for that merge SHA and require success before touching Replit.
7. Only after main CI is green, exact-sync GitHub `main` to Replit and run Replit validation.

Do not publish or mutate production simply because PR CI is green.

---

## 2. Task #56 diagnosis and why it matters

The original concern was that the Unisex Fragrance candidate appeared to have:

- evaluator risk = `medium`
- persisted `action_plans.risk_level` = `blocked`

Read-only diagnosis proved this is **intentional deterministic behavior**, not stale persistence or corruption.

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

Task #56 fixes the reporting/UI ambiguity without changing the authorization policy.

### Task #56 implementation

The patch adds explicit read/API fields:

- `evaluatorRisk`
- `planControlRisk`
- `effectiveExecutionRisk`

while retaining legacy compatibility fields.

The frontend authorization display/eligibility consumes `effectiveExecutionRisk`, which mirrors the Task #51 expression.

Labels now distinguish evaluator risk, plan control, and effective execution risk.

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

No Task #51 implementation, migration, provider-write, scheduler, or production-data logic was modified.

### Task #56 local validation already completed

- API spec codegen: passed.
- API server tests: **180 passed, 0 failed**.
- Focused frontend risk tests: **3 passed, 0 failed**.
- API typecheck: passed.
- Frontend typecheck: passed.
- API production build: passed.
- Production bundle marker verification: passed for existing Task #51–#55 markers.
- Frontend build: passed; only pre-existing non-fatal sourcemap warning.
- `git diff --check`: passed.

No publish/deploy/database/provider/public-site mutation occurred while implementing Task #56.

---

## 3. Canonical baseline before Task #56 merge

Current canonical GitHub `main` before Task #56 merge:

- SHA: `6e0761a92c54f7f5a47ee68a1b9b99e2fa113c84`
- Tree: `874d137138b9ab4473c7cc833ae143e176c61f82`
- Commit: merge of PR #61, Task #55 authentication/RBAC foundation.

At the last reconciliation, Replit workspace `main` was reset to this exact SHA/tree with ahead/behind `0 0` and clean working tree.

Do not assume Replit remains on a task branch or exact SHA after later agent activity; inspect before syncing.

---

## 4. Task #55 — authentication/RBAC: completed and live

Task #55 is fully merged, published, and production-certified.

### GitHub

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/58`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/61`
- Merged `main`: `6e0761a92c54f7f5a47ee68a1b9b99e2fa113c84`
- PR CI #129: green.
- Post-merge main CI #130: green.

### Authentication design

- Google OIDC authorization-code flow.
- State + nonce + PKCE S256.
- Exact production callback: `https://dsseoengine.replit.app/api/auth/google/callback`.
- Scopes: `openid email profile`.
- Allowlist-only access.
- Public registration disabled.
- Roles: `viewer`, `operator`, `admin`.
- Server-side PostgreSQL sessions.
- Absolute TTL: 12 hours.
- Idle TTL: 30 minutes.
- Rotation threshold: 15 minutes.
- CSRF protection for unsafe requests.
- Auth audit records.
- Server-side RBAC is authoritative.

### Production auth state

Authentication enforcement is **enabled** in production and was fully certified:

- `/api/healthz` returned 200.
- `/api/auth/status` reported configured and enforcement enabled.
- Anonymous `/api/dashboard`, `/api/connections/status`, `/api/execution` returned 401 `authentication_required`.
- Login start redirected to Google using the exact production callback URI.
- The allowlisted user completed Google sign-in.
- One active admin session was created with valid server-side session and CSRF hash material.
- Authenticated `/api/auth/session` and `/api/dashboard` returned 200.
- Browser logout succeeded with HTTP 204 and CSRF validation.
- Session was revoked; active sessions returned to zero.

The certification audit aggregate at that point included:

- `api_authentication_required`: denied x3
- `login_success`: success x1
- `logout`: success x2 (browser produced a duplicate harmless/idempotent logout submission)

Do not expose or document actual allowlisted emails, secrets, session values, token hashes, or CSRF material.

---

## 5. Task #55 database state and critical publication lesson

Task #55 schema adds:

- `auth_sessions`
- `auth_audit_events`

and six expected indexes:

- `auth_sessions_active_lookup_idx`
- `auth_sessions_subject_idx`
- `auth_sessions_expiry_idx`
- `auth_audit_events_created_idx`
- `auth_audit_events_subject_idx`
- `auth_audit_events_type_idx`

Final certified state:

- Development DB: **31 public base tables**.
- Production DB: **31 public base tables**.
- Both auth tables present in both environments.
- 6/6 expected auth indexes in both environments.

### Prior schema regression incident

A manual Replit publish once synchronized the **29-table development schema** onto a previously correct **31-table production schema**, removing the auth tables from production.

Recovery:

1. Development was migrated 29→31 using the already-approved `0002_auth.sql`.
2. Production was manually fingerprinted and migrated 29→31 using the same migration.
3. Both environments were certified at 31 tables.

**Permanent release rule:** before every publish, verify development and production schema parity. Never publish with development schema behind production.

A production database must not be identified only by database/user names. Use bound environment context plus a read-only data/schema fingerprint.

Historical production operational fingerprint used during recovery:

- `action_plans`: 30 rows
- `actions`: 1 row
- `connections`: 3 rows
- `deployments`: 1 row
- `verifications`: 3 rows
- `rollbacks`: 2 rows

Do not treat those counts as permanent business invariants; they are recovery-identification context.

---

## 6. Permanent safety configuration

The following are intended current safety defaults/invariants:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- ordinary Shopify/Google operational connections remain read-only
- Task #53/#54 provider-write dispatch remains closed except during separately authorized bounded execution
- Task #53 scheduler disabled
- Task #54 scheduler disabled
- Task #54 batch execution disabled
- no autonomous public-site mutation worker
- no approval-to-execution automatic transition

An isolated Shopify write-capable credential intentionally exists for Task #53/#54. Do not remove it merely because global writes are disabled. Conversely, do not infer permission to use it from possession of the credential/scope.

---

## 7. Task #51–#54 execution foundations

### Task #51 — Controlled Execution Foundation v1

Purpose: transform an explicitly approved proposal into a bounded internal executable action under an exact confirmation and short authorization window.

Exact confirmation family:

`AUTHORIZE:<planId>:<proposalFingerprint>`

Default approval TTL: 15 minutes; configured maximum 60 minutes.

Task #51 authorization does not itself grant provider-write permission.

### Task #52 — Shopify Write Connector + Verification/Rollback Dry-Run Foundation v1

Purpose: provider mutation mechanics under bounded scope.

Capabilities include:

- title/meta-description bounded operations
- stale-state checks
- idempotency/fingerprints
- provider receipts
- read-after-write verification
- rollback
- network-free dry-run/self-test
- manual-intervention state for uncertainty

### Task #53 — Controlled Single-Action Production Execution Pilot v1

Live execute confirmation:

`EXECUTE_AND_ROLLBACK_TASK53:<actionId>:<preflightFingerprint>`

The historical Home Fragrance pilot succeeded and rolled back to the exact original state.

Historical pilot identifiers:

- Plan: `2c39cae9-83ea-4d29-8150-915f78128ebc`
- Proposal: `2d3eef96-920a-4bbf-8d74-71bda6a25fc7`
- Action: `d89cef34-2251-468e-b1c6-96b8c86050b6`
- URL: `https://diamondshelf.us/collections/home-fragrance`
- Shopify GID: `gid://shopify/Collection/335423963335`
- Field: `meta_description`
- Original value: `null`
- Final lifecycle: `production_pilot_verified_and_rolled_back`
- Consumed preflight fingerprint: `d43462ba39043707566191b318aa7d8db71cf0621287cfbc523c5e137bc2a33b`

**Never reuse that consumed preflight fingerprint.**

### Task #54 — Verified Persistent Single-Action Production Apply Foundation v1

Routes:

- `POST /api/execution/:id/task54/preflight`
- `POST /api/execution/:id/task54/apply`

Exact apply confirmation:

`APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`

Success lifecycle:

`production_change_verified_live`

Failure rollback lifecycle:

`production_apply_rolled_back_after_verification_failure`

Uncertain state:

`manual_intervention_required`

No first persistent Task #54 live apply has occurred yet.

---

## 8. Current future candidate — Unisex Fragrance

Candidate context that motivated Task #56:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- Field: `meta_description`
- Current value: `null`
- Proposed value: `Unisex Fragrance groups Gift Set, Perfume & Cologne, and Perfume Oils in one collection, keeping these related product types together for comparison.`
- Proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- Quality score: 100 / pass
- Approval eligible: true
- Lifecycle: `approval_ready`
- Approvals: 0 at diagnosis
- Actions: 0 at diagnosis
- Deployments: 0 at diagnosis
- Evaluator risk: `medium`
- Plan-control risk: `blocked`
- Task #51 effective risk: `medium`

Do **not** bypass approval or create an execution merely because Task #56 clarifies the risk labels. When the project eventually chooses this candidate for the first persistent Task #54 apply, use the full fresh authorization sequence.

---

## 9. Controlled first persistent Task #54 sequence (future, not yet authorized)

When the user explicitly decides to perform the first persistent apply, follow a staged sequence. Do not collapse these into one broad authorization.

1. Ensure Task #56 and all prerequisite engineering work is merged/deployed/certified.
2. Ensure `PUBLIC_SITE_WRITES_ENABLED=false` during proposal approval/internal authorization steps.
3. Obtain explicit proposal approval for the exact Unisex plan/fingerprint.
4. Run Task #51 internal authorization only under its exact confirmation.
5. Separately obtain authorization to open the global write gate if needed.
6. Verify deployment/runtime safety state read-only.
7. Obtain separate authorization for Task #54 preflight.
8. Return a **fresh** preflight fingerprint and exact before/after target.
9. Obtain separate exact `APPLY_AND_VERIFY_TASK54` authorization naming the fresh action/fingerprint/GID/field/old/new values and one-write/verify/leave-live/rollback-only semantics.
10. Execute once.
11. Read-only certify provider and storefront state.
12. Stop and enter measurement mode; do not batch additional changes.

Account for authorization freshness/expiration. Never reuse old preflight fingerprints.

---

## 10. Replit/Git reconciliation lessons

Replit publication has repeatedly created local-only commits such as:

- `Published your App` with an unchanged tree.
- `.replit` edits adding `python-base-3.13` after ad-hoc shell diagnostics.

Python is not an application/runtime dependency for the current SEO ENGINE Node/Vite services.

After certification, such drift was safely removed by resetting the Replit workspace to canonical GitHub `main` **without republishing**.

Never reset blindly. First inspect:

- branch
- HEAD
- tree SHA
- `origin/main`
- ahead/behind
- working tree
- each local-only commit's changed files and tree identity

Then reconcile only when the local change is proven non-required.

---

## 11. Release validation expectations

Before merging an engineering PR:

- inspect changed files against task scope
- focused tests green
- full relevant test suite green
- typechecks green
- generated code consistent with source spec
- builds green
- production-bundle safety markers present
- `git diff --check` green
- PR CI green

After merge:

- fetch exact new `main` SHA
- require post-merge push CI success
- exact-sync to Replit
- verify Replit workspace branch/SHA/tree
- validate development DB schema
- validate production schema read-only before publish
- run relevant tests/typecheck/build/bundle verification
- publish only if required
- certify live health/auth/safety gates using least privilege
- inspect logs/DB for unexpected writes
- reconcile Replit-only Git drift

---

## 12. What `continue` does and does not mean

A user instruction `continue` means: continue the current safe engineering/release workflow from the last certified checkpoint.

It does **not** mean:

- approve a proposal
- open public-site write gates
- execute Task #53
- preflight/apply Task #54
- mutate Shopify
- change production database schema
- create/rotate secrets
- weaken auth/RBAC
- enable autonomous workers

For those actions, obtain the specific authorization required by the relevant control plane.

---

## 13. Documentation continuity branch

This handoff and the architecture/agent instructions were prepared on a separate documentation branch so Task #56 PR #63 remained immutable while CI completed.

Documentation branch introduced:

`docs-project-continuity-architecture`

This documentation work must not be confused with Task #56 implementation. If a documentation PR is open when a new chat starts, handle it independently from PR #63 and avoid merging it in a way that changes the exact tested Task #56 head before PR #63 is merged.

---

## 14. Project direction after Task #56

The long-term goal is a highly autonomous SEO/GEO/AIO system, but autonomy must be earned layer by layer. Expected future areas include:

- measurement and attribution loops for persistent actions
- competitor evidence ingestion and gap analysis
- recommendation prioritization by predicted impact/confidence/cost/risk
- controlled experimentation and cooldown windows
- stronger rollback/retain/replace decisioning
- AI/GEO visibility/citation monitoring
- agentic search optimization signals
- broader bounded provider actions only after each action class has independent stale-state checks, verification, rollback, and authorization semantics
- eventually recurring automation, but only after safe no-write monitoring and decision loops are proven

Do not jump directly from current single-action controls to unrestricted autonomous mutation.

---

## 15. New-chat resume checklist

The new agent should begin by stating that it has read this handoff and `AGENTS.md`, then:

1. Inspect PR #63.
2. Confirm head SHA `115709335c5cd1fb118cdceda56b1a6740ae5be2` has not changed.
3. Confirm PR CI #131 / run `34751293138` is still successful.
4. Confirm no blocking review/comments.
5. Merge exact tested head.
6. Verify post-merge main CI green.
7. Only then sync merged main to Replit and validate.
8. Keep authentication enabled, DB schemas at 31/31, and public writes disabled.
9. Do not invoke Task #53/#54 or mutate Shopify/public site.
10. Continue through publish/runtime certification only when the release workflow reaches that stage and the user authorizes publication where needed.

That is the exact project handoff point.
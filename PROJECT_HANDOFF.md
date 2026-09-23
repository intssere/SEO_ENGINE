# SEO ENGINE — Complete Continuation Handoff

**Purpose:** allow a new ChatGPT/agent session to resume the project at the exact current checkpoint without rediscovering architecture, weakening safety gates, or losing release-state context.

**Repository:** `intssere/SEO_ENGINE`  
**Replit app:** `SEO_ENGINE`  
**Repl ID:** `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`  
**Production:** `https://dsseoengine.replit.app`

Read `CURRENT_STATE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `.agents/skills/seo-engine-project/SKILL.md`, and `.agents/memory/MEMORY.md` before acting. `CURRENT_STATE.md` is the authoritative mutable release checkpoint and overrides older hard-coded mutable SHA wording in this handoff.

---

## 1. Exact continuation checkpoint — START HERE

**Newest P8.8 checkpoint:** W04 E1–E5 remains certified; W05 specification is certified under issue #435 / PR #436; and W05-E1–E5 engineering is fully merged and post-merge certified under issue #443 / PR #444. Final PR head `d4daaa6b1b25667af884d1ecea1f3502e1d7bd8f` passed CI #835, merge `fa15403b2cf4802c85b87f01b1cc77c778775245` / tree `9ff17f37ce595b58640817e57d805e7c70237ea8` passed post-merge CI #840, and Replit is Git-only exact-synced at `0/0`, clean. Production/runtime/provider/W06 boundaries remain blocked or separately gated.

W04 specification/review was certified under issue #418 / PR #419:
- exact tested spec head: `2ac7373e9986874afe9e543863cfecc8d82732e0`;
- exact-head CI #737 / run `35843311585`: success;
- merge/tree: `2c31f3e4a355ac1bb2715f201a5dc2148a3b99f7` / `76f4406258e092e4af3b6221860d88231ab60f0a`;
- post-merge CI #738 / run `35844152037`: success;
- Replit exact Git-only sync: merge/tree exact, `0/0`, clean, zero tracked/untracked changes/locks/writers, no republish/runtime activity.

W04 engineering contract:
- deterministic pure W04 reservation intent from canonical W01/W02 lineage;
- exact W04 reservation ID/fingerprint must be precommitted through unchanged W03 v1;
- additive migration source `0005_p8_8_policy_mutation_reservations.sql`;
- dedicated policy reservation namespace, never fake human `actions` rows and never generic `jobs`;
- database CHECK constraints close initial scope to Diamond Shelf Shopify Product `meta_description`;
- partial unique indexes enforce one active/blocking reservation per site and per exact target field;
- explicit database URL only, with no W04 fallback to process `DATABASE_URL`;
- database transaction time controls authorization-window validity;
- exact replay vs identity/site/target/uncertain conflict classification;
- stale `authorized` may expire opportunistically; `claimed` and `manual_intervention` never auto-expire;
- bounded durable receipt with no raw proposal/provider/secret/human-approval payload;
- real concurrent PostgreSQL race certification in dedicated localhost CI;
- exact W03/W04 pair projection for later W05/W06;
- provider dispatch/public write authority remains false.

Code-only head `209bd9a96489176942e501a20b6e4983c94f521a` passed CI #744 / run `35854780897` completely.

**Production status:** migration 0005 is source/CI-certified only and is NOT applied to Production. No Production reservation row exists from W04 engineering.

**W05 engineering implementation:** issue #443 / PR #444.

Implemented:
- dedicated policy-mutation control state + append-only transition history, separate from P9.6 review artifacts and all human action tables;
- exact W03/W04 pair + exact durable control revision/fingerprint binding for one immutable W05 claim;
- atomic W04 `authorized -> claimed` transition under exact durable `running` control;
- control-row-first locking to serialize claim-vs-pause/drain/kill races;
- pause/drain/kill safe release of exact paired unclaimed `authorized` reservations only;
- claimed/manual-intervention preservation until later certified no-dispatch or safety-closure evidence exists;
- durable latched kill and no ordinary killed resume;
- database-clock/revision semantics and real PostgreSQL concurrency certification;
- strict new-forward-mutation vs post-side-effect-safety-closure separation;
- zero change to the human Task #51/#54 path;
- migration source `0006_p8_8_policy_mutation_controls.sql`, with no default running row and no Production application.

Corrected code-only head `6f5e302db014c153cfca2f86ca7f46136e0ab74f` passed CI #825 / run `35869432936` completely: W05 migration/schema, real PostgreSQL races, full workspace, P11.10, Chromium, typecheck and build.

Final PR #444 closeout certification is complete: exact PR head `d4daaa6b1b25667af884d1ecea1f3502e1d7bd8f` passed CI #835 / run `35870588547`; the PR merged as `fa15403b2cf4802c85b87f01b1cc77c778775245` / tree `9ff17f37ce595b58640817e57d805e7c70237ea8`; post-merge CI #840 / run `35871447548` passed; and Replit was reconciled Git-only to that exact merge with refreshed `origin/main`, ahead/behind `0/0`, clean, and no extra local commits.

W05 engineering does **not** authorize Production migrations 0005/0006, Production control initialization/claims/reservation transitions, provider/network access, Task #51/#53/#54 execution, scheduler/worker/policy activation, credential/config changes, deployment/publication or W06–W10.

**Next safe boundary:** documentation-only post-merge continuity reconciliation under issue #449, then W06 policy-aware mutation-free preflight as a separately gated engineering work package. Production migrations 0005/0006 and Production control initialization/claims remain separately authorized. Generic `continue` must not implement/activate W06, apply Production DDL/DML, create Production reservation/control/claim rows, call providers, execute Task #51/#53/#54, activate policy/workers, alter credentials/config, deploy or publish.

**Current checkpoint:** P12.2 live-adapter/persistence engineering is now **certified complete** under issue #387 / PR #388, but P12.2 itself remains **not production-complete**. No live crawl is authorized.

- Exact tested adapter head/tree: `f7210f7c7d7b7ff3e079403ec107acefbf4f9cc0` / `317675fd81f3a83a0336be56c4e4c1f816ff82d9`.
- PR CI #686 / run `35713158875`: success.
- Merge: `cfdb21f3853f6a6c604686d750016c08c7f43492`; post-merge CI #687 / run `35713968607`: success.
- Replit is Git-only exact-synced to that merge/tree, `0/0`, clean.
- Exact future site binding remains `eb1da9ee-539c-4200-8f04-f64ccaea7768` / `https://diamondshelf.us`.
- Exact manual confirmation remains `AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768`, but confirmation alone is insufficient: `networkReady`, `liveExecutionAuthorized`, `persistenceReady`, and `persistenceAuthorized` must also all be true.
- No API/startup/job/scheduler/worker binding exists; the bundled CLI is inspection-only by default.
- Migration 0004 is merged as source only and is **not applied to Production**.
- Production remains 34 tables; Development is 37 because of the disclosed early local migration-test incident. No compensating DDL is authorized or attempted.
- P12.2 migration/persistence integration tests now use only `P12_2_EPHEMERAL_DATABASE_URL` and never generic `DATABASE_URL`.
- The next live path is separately gated: Production schema application → deployment/runtime publication → bounded full crawl → intentional interruption/resume → repeat/reconciliation → bounded incremental cycle → persisted evidence certification.

- P12.2 issue #382 / implementation PR #383.
- Implementation base SHA/tree: `2b17be98c750dcba30eeedb657587bb49748867f` / `8af93afa0c3c7fc6bdbaab7adb55fe77e865e869`.
- Final exact tested head/tree: `dbeadef4b18dabeac37e82535e791b8e7eb733c2` / `782f65af18516791421f20bcc9b198a7b8fc515a`.
- Exact-head PR CI #674 / run `35652034114`: success.
- Implementation merge/tree: `0981daad1da5737ac4a4ec04d97ad6cf6659057d` / `782f65af18516791421f20bcc9b198a7b8fc515a`.
- Post-merge main CI #675 / run `35652518058`: success.
- Canonical post-merge gates: **1,264 workspace tests / 0 failures**; DB bootstrap **7/7 PASS**; P3.6 migration checks **2/2 PASS**; API **1,072/1,072 PASS**; P11.10 scale PASS; Chromium **111/111 PASS**; typecheck PASS; build/P11.1 budget PASS.
- Post-merge assets: JS 610,807 raw / 175,245 gzip; CSS 186,332 raw / 31,020 gzip.
- The bridge is Diamond Shelf-only at canonical origin `https://diamondshelf.us`.
- Sitemap acquisition, robots evaluation, page transport, clock and persistence are injected interfaces; there is no bundled HTTP/fetch/PostgreSQL/Drizzle/timer/scheduler implementation.
- Network and persistence execution require explicit configured adapters plus `networkReady`, `liveExecutionAuthorized`, `persistenceReady` and `persistenceAuthorized`; defaults remain closed.
- Existing P2.1–P2.6 planning/inventory/execution/checkpoint/certification/history/incremental semantics remain authoritative and unchanged.
- Raw response bodies, page content and raw sitemap XML are excluded from the persistence contract.
- Replit is Git-only exact-synced to the implementation merge/tree, origin/main exact, `0/0`, clean, zero tracked/untracked files, zero locks and zero active repository writers.
- Replit Git state was independently re-verified after the sync at the exact merge/tree; no separate Replit non-browser test run was performed. GitHub CI remains canonical for full test/browser certification.
- No live website/sitemap/robots request, Production DB/storage read/write/DDL/DML, observation/evidence persistence activation, provider/public-site mutation, scheduler/worker activation, autonomous mutation, credential/secret change, destructive retention, Task #51/#53/#54 execution, deployment or publication occurred.
- Published production now runs canonical source `78f8e69d07aa4e853ab0c815e7ba24d284d93e97` / tree `271d82d2c3e3a1bef5eeca567e96f924189166f7` on deployment `fbef9788-c08d-475d-a85d-88ede16e92c7` at `https://dsseoengine.replit.app`, with the public-write gate returned to the closed posture after P8.7.
- Post-publication certification passed health/auth/root/protected-route checks, live P12.1 navigation verification, source/bundle attestation, safety-gate inspection, 34↔34 Development/Production schema verification and unexpected-activity audit.
- All public/provider write, Task #53/#54 dispatch, competitor execution/persistence/dry-run, AI proposal generation, signal collection, GSC runtime, scheduler, worker/autonomous mutation and P12.2 crawl runtime execution/persistence gates remained false.
- Replit's metadata-only publication marker `0a6046e9cbc8b8b9a984d0cff77ce359400b384b` had parent `d84496c5...`, the identical authorized tree and zero changed files; it was reconciled Git-only back to canonical source without republishing.
- Development P3.6 was aligned prepublication to the exact 34-table Production contract using only the canonical additive migration; final managed schema diff was zero statements / zero destructive changes.
- The local recursive-pnpm workflow failure was repaired with a Git-ignored Corepack shim only; tracked `.replit`, package metadata, lockfile, application code and deployment settings remained unchanged.
- **P12.2 next live proof requires fresh explicit authorization** naming the Diamond Shelf site identity, concrete sitemap/robots/page adapters, concrete Production persistence target, crawl limits, abort/safety procedure and allowed evidence writes.
- That live proof must demonstrate: first full crawl + P2.4 whole-site certification; interruption/resume; repeat/reconciliation + P2.5 comparison; one bounded P2.6 incremental cycle; persisted/inspectable lineage; and no safety-fuse violation.
- P12.3 remains separately gated on live GSC + required analytics/catalog proof.
- P12.4 remains separately gated on selected external-intelligence provider proof.
- P12.5 remains blocked on real persisted evidence from P12.2–P12.4.
- P12.6 remains partial; P8.4 verification adapters are complete, while P8.5/P8.6 and later P8.7/P8.8 live/policy proof remain.
- P12.7/P12.8 still require live scheduled-read and real-outcome proof.
- P12.9 still needs exact release-candidate production acceptance.
- P12.10 still requires P12.1–P12.9, applicable P11.9 blockers, explicit deployment/publication/runtime proof and program issue #139 closeout.
- The ten P11.9 privacy/compliance blockers remain active.
- Generic `continue` does not authorize the P12.2 live crawl, Production persistence, provider/OAuth activity, scheduler/worker activation, provider/public-site writes, credential mutation, destructive retention, deployment or publication.

The Task #56 material below is retained as historical publication/certification context, not as the current mutable release or database checkpoint.

**Task #56 — Risk Semantics Alignment & Effective-Risk Diagnostics v1 was fully merged, published, production-certified, and closed.**

### Task #56 application history

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/62`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/63`
- Tested PR head: `115709335c5cd1fb118cdceda56b1a6740ae5be2`
- PR CI #131 / run `34751293138`: **success**
- Application merge SHA: `8d1c65e630253a4e0f052076bfc6bf21fbf5679f`
- Application tree: `11bc62ba2545769d78f29c41a268423b1350545f`
- Post-merge application main CI #132 / run `34751384367`: **success**

### Release source and publication

The repository continuity/docs commits after the Task #56 application merge changed documentation only. Immediately before Task #56 publication, canonical GitHub `main` was:

- SHA: `0c5213d98ece0406aeaab059233c3af6373e0459`
- Tree: `16b63fca211cd8fe54fdcdaaadb1f99d06774fc0`
- CI #139 / run `34752925093`: **success**

Replit was exact-synced to that source and passed merged-main validation before publication:

- API codegen/generated-client consistency: pass, zero generated diff
- API tests: **180/180 passed**
- focused Task #56 frontend risk tests: **3/3 passed**
- API typecheck: pass
- frontend typecheck: pass
- API production build and production-bundle safety-marker verification: pass
- frontend production build: pass; existing non-fatal tooltip sourcemap warning only
- `git diff --check`: pass
- Replit branch/HEAD/tree aligned to canonical main
- ahead/behind `0/0`
- working tree clean

The user then explicitly authorized publication of only that certified source, with no DB DDL, provider/public-site mutation, or Task #53/#54 execution.

Publication to the existing Replit autoscale deployment completed successfully.

### Production certification

Post-publication certification used GET/SELECT/log/static-artifact inspection only and passed:

- `/api/healthz`: healthy
- auth configured: yes
- auth enforcement enabled: yes
- Google OIDC configured: yes
- allowlist-only: yes
- public registration disabled: yes
- development DB: **31** public base tables
- production DB: **31** public base tables
- `auth_sessions`: present in both
- `auth_audit_events`: present in both
- all six Task #55 auth indexes present in both
- production frontend contains `evaluatorRisk`
- production frontend contains `planControlRisk`
- production frontend contains `effectiveExecutionRisk`
- production UI contains labels `Evaluator risk`, `Plan control`, `Effective execution risk`
- `PUBLIC_SITE_WRITES_ENABLED` effectively false
- `AI_PROPOSAL_GENERATION_ENABLED` effectively false
- Task #53 provider-write dispatch disabled
- Task #54 provider-write dispatch disabled
- Task #53 scheduler disabled
- Task #54 scheduler disabled
- Task #54 batch execution disabled
- no evidence of unexpected POST/PUT/PATCH/DELETE provider operations, Shopify mutation, public-site mutation, autonomous execution, Task #53 execution, or Task #54 apply around the deployment

No new interactive login/logout certification was performed because Task #55 authentication behavior did not change. Protected proposal-record API behavior was not re-tested through a newly created login session; public health/auth status, schema continuity, same-release deployment, live frontend Task #56 markers, and safety-state checks passed.

### Post-publish Replit Git reconciliation

Publication generated one empty local Replit commit:

- SHA: `a6f8822d7ff00cf65c25383ae088e1ca500caed0`
- Parent: `0c5213d98ece0406aeaab059233c3af6373e0459`
- Subject: `Published your App`
- Tree: `16b63fca211cd8fe54fdcdaaadb1f99d06774fc0`
- Changed files: none

Because it was metadata-only and tree-identical to canonical GitHub main, Replit was reconciled to canonical main without republishing.

Final certified Replit state before this documentation closeout:

- branch: `main`
- HEAD: `0c5213d98ece0406aeaab059233c3af6373e0459`
- tree: `16b63fca211cd8fe54fdcdaaadb1f99d06774fc0`
- locally known `origin/main`: same
- current remote main at that checkpoint: same
- ahead/behind: `0/0`
- working tree: clean
- changed files: none
- untracked files: none
- production deployment remained successful

Because this handoff update itself will advance GitHub history after merge, always resolve the actual current `main` SHA/tree independently instead of assuming `0c5213d...` is still the repository tip.

### Exact first action in a new chat

1. Read `CURRENT_STATE.md` first.
2. Resolve current GitHub `main` SHA/tree and current main CI.
3. Read `AGENTS.md`, this handoff, `ARCHITECTURE.md`, project skill, memory index, and relevant memory note.
4. Inspect Replit branch/HEAD/tree/ahead-behind/working tree before sync or publish.
5. Re-confirm development/production schema parity before any future publish.
6. Re-confirm auth and all write/AI/execution gates before any high-control step.
7. Do **not** re-publish Task #56; it is already production-certified.
8. Do **not** start Task #53/#54 execution from a generic `continue`.

---

## 2. Task #56 diagnosis and implementation

The original concern was that the Unisex Fragrance candidate appeared to have:

- evaluator risk = `medium`
- persisted `action_plans.risk_level` = `blocked`

Read-only diagnosis proved this is intentional deterministic behavior, not stale persistence, migration residue, or corruption.

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

Task #56 makes these semantics explicit in API/UI/reporting without weakening Task #51.

Merged fields:

- `evaluatorRisk`
- `planControlRisk`
- `effectiveExecutionRisk`

Legacy compatibility risk fields remain. Frontend authorization eligibility consumes `effectiveExecutionRisk`, matching Task #51's real policy precedence.

Task #56 application files changed:

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

Task #51 authorization-policy implementation files were deliberately not changed.

---

## 3. Task #55 — authentication/RBAC: completed and live

Task #55 is fully merged, published, and production-certified.

### GitHub

- Issue: `https://github.com/intssere/SEO_ENGINE/issues/58`
- PR: `https://github.com/intssere/SEO_ENGINE/pull/61`
- Merge SHA: `6e0761a92c54f7f5a47ee68a1b9b99e2fa113c84`
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
- hierarchy: `admin > operator > viewer`
- server-side PostgreSQL sessions
- absolute TTL: 12 hours
- idle TTL: 30 minutes
- rotation threshold: 15 minutes
- CSRF required for unsafe authenticated requests
- auth audit records
- server-side RBAC authoritative

Production auth was previously certified end-to-end through anonymous denial, Google login redirect, allowlisted admin sign-in, server session creation, protected GET, CSRF-protected logout, and revocation. Do not unnecessarily repeat interactive auth certification unless auth behavior changes.

Never expose allowlisted identities, secrets, token hashes, session hashes, CSRF material, or provider tokens.

---

## 4. Database state and Replit publication lesson

`CURRENT_STATE.md` owns the authoritative mutable database checkpoint. Re-verify database shape before any publication or DDL rather than treating historical counts in this handoff as permanent invariants.

Current certified Production checkpoint after P3.6:

- Production: **34 public base tables**
- P3.6 tables: `seo_observation`, `seo_evidence`, `seo_observation_evidence`
- all three P3.6 tables were independently verified empty immediately after migration
- catalog verification reported zero mismatches
- application observation/evidence persistence and Production reads remain disabled
- P3.6 directly migrated the existing identity-gated Production database; it did not republish the application

Task #55 auth tables remain part of the required protected schema:

- `auth_sessions`
- `auth_audit_events`

Required auth indexes:

- `auth_sessions_active_lookup_idx`
- `auth_sessions_subject_idx`
- `auth_sessions_expiry_idx`
- `auth_audit_events_created_idx`
- `auth_audit_events_subject_idx`
- `auth_audit_events_type_idx`

Historical incident context: a prior Replit publish once synchronized a 29-table development schema onto a correct 31-table production schema and removed production auth tables. Recovery applied the approved auth migration to both environments and restored 31/31 at that time. That 31/31 recovery is **historical**, not the current mutable Production schema checkpoint.

**Permanent rule:** never publish while development and Production schema shapes diverge in a way that would drop or rewrite required Production objects. If Replit proposes destructive schema synchronization, cancel publication and align development safely first. Production DDL always requires separate explicit authorization.

Historical recovery fingerprints and historical table counts are context, not permanent invariants.

---

## 5. Permanent safety state

Unless exact bounded authorization says otherwise:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- application observation/evidence persistence and Production reads remain disabled
- ordinary Shopify and Google operational connections remain read-only
- isolated Task #53/#54 Shopify write credential may remain connected but is not permission to execute
- no autonomous public-site/provider mutation worker
- no approval -> execution automatic transition
- Task #53 provider dispatch disabled
- Task #54 provider dispatch disabled
- Task #53 scheduler disabled
- Task #54 scheduler disabled
- Task #54 batch execution disabled
- no production DB DDL
- no credential/secret rotation or scope broadening

A generic `continue` never authorizes a provider/public-site mutation.

---

## 6. Task #51–#54 execution foundations

### Task #51 — Controlled Execution Foundation v1

Purpose: transform an explicitly approved proposal into a bounded internal executable action under exact confirmation and a short authorization window.

Exact confirmation family:

`AUTHORIZE:<planId>:<proposalFingerprint>`

Authorization TTL defaults to 15 minutes, maximum 60 minutes.

Task #51 does not grant provider-write permission by itself.

### Task #52 — Shopify Write Connector + Verification/Rollback Foundation v1

Capabilities include bounded title/meta-description operations, stale-state checks, fingerprints/idempotency, provider receipts, read-after-write verification, rollback, network-free dry-run/self-test, and manual-intervention handling for uncertainty.

### Task #53 — Controlled Single-Action Production Pilot v1

Exact live confirmation:

`EXECUTE_AND_ROLLBACK_TASK53:<actionId>:<preflightFingerprint>`

Historical Home Fragrance pilot:

- Plan: `2c39cae9-83ea-4d29-8150-915f78128ebc`
- Proposal: `2d3eef96-920a-4bbf-8d74-71bda6a25fc7`
- Action: `d89cef34-2251-468e-b1c6-96b8c86050b6`
- URL: `https://diamondshelf.us/collections/home-fragrance`
- Shopify GID: `gid://shopify/Collection/335423963335`
- Field: `meta_description`
- Original value: `null`
- Final lifecycle: `production_pilot_verified_and_rolled_back`
- Consumed preflight fingerprint: `d43462ba39043707566191b318aa7d8db71cf0621287cfbc523c5e137bc2a33b`

Never reuse that consumed fingerprint.

### Task #54 — Verified Persistent Single-Action Production Apply v1

Routes:

- `POST /api/execution/:id/task54/preflight`
- `POST /api/execution/:id/task54/apply`

Exact apply confirmation:

`APPLY_AND_VERIFY_TASK54:<actionId>:<preflightFingerprint>`

Success lifecycle: `production_change_verified_live`  
Verification-failure rollback lifecycle: `production_apply_rolled_back_after_verification_failure`  
Uncertain lifecycle: `manual_intervention_required`

Exactly one bounded forward mutation is allowed in a Task #54 apply. A verified success remains live. Rollback occurs only on verification/controlled failure. Task #54 scheduler and batch execution remain disabled.

**No first persistent Task #54 live apply has occurred yet.**

---

## 7. Unisex Fragrance candidate — likely future first persistent apply candidate

This candidate motivated Task #56:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- Field: `meta_description`
- diagnosed current value: `null`
- proposed value: `Unisex Fragrance groups Gift Set, Perfume & Cologne, and Perfume Oils in one collection, keeping these related product types together for comparison.`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- quality: `100 / pass`
- approval eligible: true
- lifecycle at diagnosis: `approval_ready`
- approvals/actions/deployments at diagnosis: `0 / 0 / 0`
- evaluator risk: `medium`
- plan-control risk: `blocked`
- effective execution risk: `medium`

Task #56 clarification does not approve this proposal, create an executable action, or authorize a Shopify write.

---

## 8. Future first Task #54 persistent apply sequence — not authorized by `continue`

Only begin when the user explicitly elects to perform the first persistent live apply.

1. Independently verify current GitHub/Replit/runtime state.
2. Confirm Task #56 remains live/certified and safety prerequisites remain green.
3. Keep public writes false during proposal approval/internal authorization.
4. Obtain explicit proposal approval for the exact plan/fingerprint.
5. Perform Task #51 internal authorization under exact confirmation.
6. Separately authorize opening any required write gate.
7. Read-only certify runtime safety state.
8. Separately authorize Task #54 preflight.
9. Produce a **fresh** preflight fingerprint and show exact GID, field, old value, new value, fingerprints, and authorization window.
10. Obtain exact `APPLY_AND_VERIFY_TASK54` authorization naming the fresh action/preflight target and one-mutation/verify/leave-live semantics.
11. Execute exactly once.
12. Read-after-write verify provider/storefront state.
13. Leave verified success live; rollback only on verification failure/controlled failure.
14. Stop and enter measurement mode. Do not batch additional changes.

Never reuse stale or consumed preflight fingerprints.

---

## 9. Replit/Git reconciliation rules

Replit publication may create local-only commits such as:

- metadata-only `Published your App`
- incidental `.replit` module edits such as `python-base-3.13`

Do not push them upstream automatically. Inspect branch, HEAD/tree, remote main, ahead/behind, working tree, changed files, and commit tree identity first.

If a publish commit is empty/tree-identical or a `.replit` edit is incidental/non-required, reconcile Replit back to canonical GitHub main **without republishing solely for Git cleanup**.

Task #56 publication followed this rule successfully.

---

## 10. Engineering and release workflow invariant

For every engineering change:

1. exact canonical GitHub baseline
2. dedicated task branch
3. scoped implementation
4. focused/full tests as applicable
5. typechecks
6. generated-code checks where applicable
7. builds and bundle-marker verification
8. `git diff --check`
9. push branch
10. PR
11. exact-head PR CI green
12. merge exact tested head
13. post-merge main push CI green
14. exact GitHub main -> Replit alignment
15. Replit validation
16. dev/prod schema parity check before publish
17. publish only if needed and authorized
18. runtime certification with least privilege
19. inspect for unexpected provider/public-site/autonomous activity
20. reconcile Replit-only Git drift
21. do not start the next engineering task until certification is complete

Generated API contract source of truth is `lib/api-spec/openapi.yaml`. Regenerate clients/types from it; do not treat generated files as source-of-truth hand edits.

---

## 11. What `continue` means

`continue` means continue the current safe engineering/release/documentation workflow from the last independently verified checkpoint.

It does **not** authorize:

- proposal approval
- opening public-write gates
- Task #53 live pilot
- Task #54 preflight or apply
- Shopify/public-site mutation
- database DDL
- secret/credential change
- auth/RBAC weakening
- autonomous worker enablement

---

## 12. Current project stage after P5.2

P3.6 remains the certified Production schema checkpoint. P4.1–P4.8 plus selected P4.10 are complete unpublished product/browser foundations. P5.1 provider-selection review and P5.2 SERP/ranking adapter engineering are now complete and unpublished.

P5.2 establishes:
- exact P5.1 DataForSEO engineering-selection/freshness lineage;
- exact Task #68 request/source/market/category lineage;
- deterministic Google Organic standard-task request metadata;
- location/language/device/depth bounds with normal priority only;
- no live endpoint/callback/pingback/postback/polling path;
- bounded supplied-result projection of organic rank/page/domain/URL only;
- tracked-domain best/top-10/top-20 ranking metrics;
- correct rank_group vs rank_absolute semantics;
- strict Task #68 adapter-result compatibility;
- no raw provider-data retention beyond the bounded projection;
- no executable provider transport.

Certification lineage:
- PR #222 exact tested head `184706ae549be75a19d22e15acbc1f280962785b`;
- PR CI #417 / run `35365076296`: success;
- merge `873aebeae798e61b2c313dfbe5e618c09c6a7f75`, tree `9136828ed85cbcd3b548a8532e0e452c2bb2f9f7`;
- post-merge CI #418 / run `35365310166`: success;
- Replit exact-sync and non-browser validation: passed, `0/0`, clean.

Production remains on the separately certified Task #73 application release. Do not infer provider enrollment, live provider reads, source admission, persistence, scheduler/worker execution, publication, mutation, or further Production DDL from P5.2.

---

## 13. Safe next-step choices

### Default safe engineering path — P5.3

Proceed next, on a generic `continue`, with **P5.3 — keyword volume/difficulty/opportunity adapter(s)** through the normal issue → branch → implementation/tests/docs → PR → exact-head CI → merge → post-merge CI → Git-only Replit reconciliation workflow.

Based on P5.1, DataForSEO may be the first keyword adapter engineering target, but P5.3 must remain default-off and network-free: deterministic request/result contracts, strict bounds, normalization integration and supplied fixtures only. Generic `continue` does **not** authorize provider signup/purchase, API credentials, a live provider request, Task #67 external-source admission, Task #70 execution, observation/evidence persistence, scheduler/worker activation, Production DDL/DML, provider/public-site writes, secret/config changes, or publication.

### Optional P4.9

**P4.9 — Storybook/component documentation** remains optional and should be started only if deliberately selected.

### Separately authorized live-provider paths

P1.4–P1.8 real GSC activation and any future external P5 provider enrollment/credentials/live-read path require explicit bounded authorization for the exact step.

### Existing Task #53/#54 mutation paths

Any Task #53 live pilot or Task #54 preflight/apply remains separately gated. A generic `continue` is insufficient.

Any engineering module still follows the normal branch/PR/CI/Replit validation/release workflow.

---

## 14. New-chat resume checklist

A new agent should begin by independently verifying:

1. current GitHub `main` SHA/tree and main CI; do not assume any SHA in this handoff is still the tip
2. `CURRENT_STATE.md` current checkpoint
3. Task #56 remains production-certified; do not re-publish it merely because this handoff mentions its historical release source
4. Replit branch/HEAD/tree/ahead-behind/working tree against current GitHub main
5. Production retains the certified P3.6 **34-public-base-table** checkpoint, including `seo_observation`, `seo_evidence`, and `seo_observation_evidence`; re-verify Development separately before any publication, and confirm Task #55 auth tables/indexes remain intact
6. auth remains enabled/configured
7. public writes and AI proposal generation remain false
8. Task #53/#54 dispatch/scheduler/batch remain closed
9. no unexplained provider/public-site/autonomous mutation activity
10. current selected milestone and its exact authorization boundary; after the P5.8 closeout, the default safe engineering milestone is P6.1 deterministic/default-off unified opportunity-type engineering; optional P4.9 remains deliberately selectable and all live first-party/external-provider work still requires explicit bounded authorization

Do not infer provider-write, provider-read, persistence, scheduler/worker, publication, or Production-DDL authorization from a generic `continue`.
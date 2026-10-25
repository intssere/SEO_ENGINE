# UGP-11.C4-E1 — Owner-Controlled Governance Amendment (offline development only)

**Status:** Authorized by project owner for *governance documentation and routine offline engineering review only*, 2026-10-25. **This amendment does not authorize Stage 2B experiments or any merge.**

**Governing issues:** [Transport review #1061](https://github.com/intssere/SEO_ENGINE/issues/1061), [independent P9 trust #1054](https://github.com/intssere/SEO_ENGINE/issues/1054).

## 1. Scope of amendment

For **routine offline C4 engineering** (pure source, deterministic fakes, documented designs, test fixtures, static analysis, read-only source assessment, and PR preparation), approval from the named Tahseen reviewer is no longer a *mandatory entry or exit condition*. This is an owner-directed governance change, not an assertion that Tahseen lacks qualifications or that any independent evidence already exists.

Replace that procedural dependency with:
- a named project-owner acceptance decision for each proposed scope;
- exact branch/commit provenance and reviewed diffs;
- required focused/full relevant checks, typecheck, build and GitHub CI on the exact proposed PR HEAD;
- automated security and dependency inspection wherever applicable;
- recorded negative tests, known risks, unverified claims and clear fail/skip/inconclusive dispositions;
- no silently inferred authority from prior successful fixtures, queue receipts or a human comment.

Optional Tahseen or other expert review may supplement this evidence. Neither an absent human review nor an AI review may be represented as **independent specialist certification**.

## 2. Explicitly retained gates

Nothing in this amendment removes, relaxes or preauthorizes:
1. **Stage 2B disposable execution:** dependency installation, isolated DB connections, SQL/DDL, pg-boss startup, migration, fault-injection, concurrency or parity benchmarking all still require a new project-owner authorization with exact target, bounds and actions.
2. **P9 issuer/trust (#1054):** no independent positive claim/grant, operational scheduling, worker dispatch, provider send or automatic retries.
3. **Database migration:** separate approval of database identity, least-privilege principals, complete SQL/partition inventory, interruption recovery and teardown/restore before any DB action.
4. **Production and deployments:** no main integration, deployment, public-site/provider mutation, production schema changes or worker activation from a source-review acceptance decision.
5. **Merge:** a draft PR, CI passing, source approval or this governance document does not authorize a merge. Separate exact-head project-owner authorization remains required.
6. **Security/privacy evidence:** when a future action requires an independently qualified DB/security/privacy/reliability signoff or external compliance/legal approval, do not substitute an owner-only or AI-only assessment by renaming it “independent.” A qualified specialist may be required for high-risk execution or production gates.

## 3. Revised offline review workflow

1. **Scope:** identify the exact C4 source-only task and target branch; prohibit external effects, provider/network access, secrets, database operations and runtime activation.
2. **Implementation:** use an isolated task branch; keep C4 files separate from concurrent CVI/CH workstreams; retain provenance.
3. **Evidence:** gather exact-head CI, focused negative tests, static checks and substantive review of relevant source and diff. Treat missing/failed/skipped checks as not certified.
4. **Risk ledger:** classify unresolved issues (fencing, stale claims, commit ambiguity, startup defaults, migration partial convergence and completeness); record owner and disposition.
5. **Owner acceptance:** project owner may explicitly approve or reject offline engineering readiness. Approval is not authorization to merge or execute a Stage 2B experiment.
6. **Additional gates:** separately request precise approval before changing packages/lockfiles, running disposable SQL/tests, migrating, deploying or using operational P9 authority.

## 4. Historical document precedence

The Stage 2A readiness contract and A01–A14 protocol remain binding as technical/evidence specifications, including their restrictive fail-closed and environment constraints. **Only the recurring requirement to obtain Tahseen's named individual approval for routine offline source preparation is superseded.** References to independently qualified DB/security/reliability/privacy reviews still apply whenever their technical signoff is a separately retained high-risk/experimental/production gate; they do not impose mandatory Tahseen participation on offline drafting.

No prior incomplete human attestation is auto-closed. Tahseen's recorded source-review approval is useful evidence but not independent certification of his role, specialist credentials or infrastructure.

## 5. Entry-state and open prerequisites (not execution approval)

At drafting baseline `initiative-universal-growth-platform@04d138e9a78fc846d8b20d23aaaa40e5bd8bf13b`:
- No approved disposable C4 account/database/schema and operator, runtime image digest or complete pg-boss package provenance have been established.
- Stage 2B A01–A14 cross-candidate tests have not been executed/certified.
- The independent P9 trust issue #1054 remains open.
- Current-head CI success and all resource-specific execution preconditions must be verified anew before any next gate.

**Decision:** `ROUTINE_OFFLINE_REVIEW_OWNER_CONTROLLED`; `STAGE_2B_EXECUTION_NOT_AUTHORIZED`; `P9_NOT_AUTHORIZED`; `MIGRATION_NOT_AUTHORIZED`; `DEPLOYMENT_NOT_AUTHORIZED`; `MERGE_NOT_AUTHORIZED`.

**Change control:** any further relaxation of a retained gate requires a separate explicit project-owner instruction and a documented risk assessment. No implicit changes to AGENTS.md, CI protections, credentials, branches or running infrastructure.

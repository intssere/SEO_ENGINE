# Universal Growth Platform — Agent Continuation Handoff

**Normative continuation entrypoint for the isolated UGP initiative.**

Any human or AI engineering agent continuing UGP work must read, in order:

1. repository-root `AGENTS.md`;
2. this file;
3. `docs/universal-growth-platform/ARCHITECTURE.md`;
4. `docs/universal-growth-platform/ROADMAP.md`;
5. the current milestone issue and PR, if one exists.

## Canonical branch model

- Canonical repository: `intssere/SEO_ENGINE`
- Canonical product branch: `main`
- Long-lived isolated UGP integration branch: `initiative-universal-growth-platform`
- UGP feature branches target the initiative, never `main`.
- Never merge the UGP initiative into `main` before UGP-14 final integration certification and explicit user authorization.

## Exact continuation state recorded 2026-09-25

Fresh race check at UGP-3.5 start:

- `main`: `9116b9bba4230d0787200ef7d627eac6a66e27e6`
- initiative pre-UGP-3.5 head: `6af824b72b61a1f5e376354d32875bbd8d7baab7`
- initiative relation to main: **171 ahead / 0 behind**
- merge base: exact current main `9116b9bba4230d0787200ef7d627eac6a66e27e6`
- UGP-3.4: complete
- current milestone: **UGP-3.5 — Lighthouse Evidence Adapter**
- tracking issue: **#535**
- current feature branch: `ugp-035-lighthouse-evidence-adapter`

Do not trust these SHAs as permanently current. Before every new implementation or merge decision, re-fetch current `main`, initiative, merge base, ahead/behind, open UGP work, and CI.

## Current milestone contract — UGP-3.5

Implement a pure, deterministic adapter over **caller-supplied Lighthouse results**:

```text
supplied Lighthouse result
→ schema/provenance/bounds validation
→ normalized Lighthouse lab evidence
→ metric/audit classification
→ evidence/opportunity projection
```

Preserve these distinctions:

- Lighthouse lab evidence ≠ CrUX/field Core Web Vitals;
- Lighthouse lab evidence ≠ descriptive transport timing from UGP-3.3;
- missing/unavailable metric ≠ zero;
- crawl coverage ≠ whole-site certification;
- rendering recommended ≠ renderer execution authorized.

UGP-3.5 must not launch Lighthouse, Chrome, Chromium, Playwright, Puppeteer or Crawlee and must not perform network, database, scheduler, worker, provider-write, public-site-write, deployment or publication work.

## Completed UGP milestones

- UGP-1.1–1.4 universal contracts/capability/connector/Shopify compatibility
- UGP-2.1–2.5 customer UX shell
- UGP-3.1 URL onboarding
- UGP-3.2 platform detection
- UGP-3.3 universal read-only supplied-evidence site analysis
- UGP-3.4 JS-rendered backend evaluation

Do not redesign completed milestones unless a current-main reconciliation or demonstrated regression requires it.

## Required engineering loop

For every UGP feature:

```text
fresh main/initiative race check
→ reconcile main → initiative if initiative is behind
→ issue
→ short-lived feature branch from initiative
→ bounded implementation
→ focused/full relevant tests + typecheck/build/static boundaries
→ exact-head push CI
→ PR to initiative
→ exact-head PR CI
→ current-main ancestry check
→ explicit user authorization for exact PR head
→ merge
→ post-merge initiative CI
→ close issue
```

An authorization such as `AUTHORIZE MERGE PR #<n>` applies only to the exact certified PR head. A changed head or invalidating main drift requires recertification and fresh authorization.

Generic `continue` permits bounded code/tests/docs/CI/git engineering. It does not authorize Production DDL/DML, live provider/public-site writes, live crawl/browser activation, credentials/config changes, OAuth expansion, scheduler/worker/autonomous activation, deployment or publication.

## Roadmap continuation after UGP-3.5

Continue in this order unless the roadmap is explicitly revised:

`UGP-3.5 → UGP-4 → UGP-5 → UGP-6 → UGP-7 → UGP-8 → UGP-9/10 → UGP-11 → UGP-12 → UGP-13 → UGP-14`

Key next phase: UGP-4 universal connector plane (MCP, OpenAPI, Git; future Site Agent specification only where necessary). Preserve read-before-write and connector-neutral capability/authorization boundaries.

## Mandatory stop condition

At a merge gate, stop and report:

- exact PR number;
- exact head SHA;
- exact current main SHA;
- ahead/behind and merge-base result;
- exact-head CI status;
- scope/boundary certification;
- the exact authorization phrase required.

Do not merge without that explicit authorization.


## Continuation update — UGP-4.1

UGP-3.5 is complete and current main has been reconciled into the initiative through PR #540. UGP-4.1 is tracked by Issue #541 on branch `ugp-041-controlled-mcp-connector`.

UGP-4.1 initial certification is a pure controlled MCP inventory/policy layer only: exact allowlisted server identity, explicit remote operation → universal capability/resource mapping, deterministic fingerprints, and deny-by-default resolution. It contains no MCP SDK/transport, live discovery, credentials, network, persistence, scheduler/worker, external mutation, deployment, or publication. Any live MCP transport or dependency adoption requires a later separately reviewed step.


## Continuation update — UGP-4.2

UGP-4.1 completed through PR #544, merge commit `565513941e43c2985c73be15571e552222677cb1`. UGP-4.2 is tracked by Issue #546 on branch `ugp-042-controlled-openapi-connector`.

UGP-4.2 initial certification is pure/read-only: caller-supplied OpenAPI 3.0/3.1 document identity plus bounded operation metadata, deterministic operation inventory, explicit operation-to-existing-capability/resource mapping, and a disabled transport-neutral typed-client generation boundary. No remote spec fetch, live API/network/provider call, credentials, runtime code generation/client execution, persistence, scheduler/worker, external mutation, deployment or publication is in scope.


## Continuation update — UGP-4.3

UGP-4.2 completed through PR #547, merge commit `6bf1529910f27630c1a2e34c9aca24c041601991`. UGP-4.3 is tracked by Issue #554 on branch `ugp-043-controlled-git-connector`.

UGP-4.3 initial certification is pure/mock-first planning only: exact repository/default-branch/base-commit binding, caller-supplied framework/content-source evidence, exact expected blob identities, deterministic non-default-branch patch planning, required PR intent, and read-only CI/status observation via existing `read.metadata`. The plan may require existing `git.branch`, `git.commit`, and `git.pull_request` capability availability but grants no authorization and executes no Git/GitHub/network/filesystem operation. Octokit/ast-grep remain unadopted evaluation candidates pending separate security/license review.


## Continuation update — UGP-4.4

UGP-4.3 completed through PR #555, merge commit `7cbc9f139ffd31f832aac60fb5bf8aecde775e45`. UGP-4.4 is tracked by Issue #556 on branch `ugp-044-future-site-agent-spec`.

UGP-4.4 is **specification-only**. The reserved `site_agent` connector kind is defined as a last-resort customer-controlled lane only when Public Web, Native API, MCP, OpenAPI, and Git cannot safely support a demonstrated environment. The specification requires exact site/connection/resource lineage, signed capability manifests, bounded validity, nonce/replay and idempotency controls, exact SEO ENGINE authorization/state binding for mutation, auditable receipts, independent read-after-write verification, explicit rollback semantics, key rotation/revocation, and fail-closed drift/uncertainty handling. Arbitrary commands/code, generic proxying, unrestricted filesystem/network/database/secret access, self-escalation, wildcard scope, autonomous scheduling, and agent-originated publication authority are prohibited.

No Site Agent runtime/client/server, transport, cryptographic implementation/dependency, credentials, persistence, scheduler/worker, external call/write, deployment, or publication is authorized or implemented by UGP-4.4. A future implementation requires a demonstrated unsupported environment, separate threat/security and dependency review, explicit authorization, and a new certification milestone.

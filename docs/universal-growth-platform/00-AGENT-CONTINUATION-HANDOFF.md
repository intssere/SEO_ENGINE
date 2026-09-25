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

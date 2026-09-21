# P11.5 — accessibility certification closeout

## Milestone

Roadmap P11.5 — WCAG 2.2 AA accessibility certification.

- issue: #355
- implementation PR: #356
- implementation base SHA/tree: `82e6ef687b1de176a02070baea10acc464748bf3` / `981f7889825ea40e334221a6c3b9df85781f6df8`
- final exact tested implementation head/tree: `8698aea5b0cf9124156364a40d05c8d084a2b05c` / `7263db76f570cfe03722ec43437be6b3361a579a`
- exact-head CI: #622 / run `35594233934` — success
- implementation merge/tree: `11d4d0d363bac9e1d6da8d5f4ee21c49eb1c0ed0` / `7263db76f570cfe03722ec43437be6b3361a579a`
- post-merge main CI: #623 / run `35594621574` — success

## What was certified

P11.5 turns the earlier P4.8/P4.10 accessibility baseline into a complete engineering-side routed-surface browser gate.

The final suite covers every explicit application route plus not-found and enforces:

- axe WCAG 2.0/2.1/2.2 A/AA tags;
- zero WCAG-tagged violations at every axe impact level;
- 320 CSS-pixel document/body reflow;
- WCAG 2.2 SC 2.5.8 24×24 target sizing with bounded inline/spacing exceptions;
- skip-link focus visibility and focus-not-obscured checks;
- main-content focus handoff after skip-link activation and SPA route changes;
- reduced-motion rendering;
- external/unmocked browser traffic fail-closed behavior and browser-error cleanliness.

The final GitHub browser suite passed **81/81**:
- 57 P11.5 accessibility tests;
- 13 existing critical-path tests;
- 7 P11.1 performance-profile tests;
- 4 visual-regression tests.

## Audit-driven stabilization

The first stricter run, CI #611, failed by design as an audit and exposed concrete problems:

- shared DataGrid sortable headers had undersized targets;
- a dashboard link-style target was undersized under the mobile target-size pass;
- Impact lineage fingerprint text failed contrast;
- Actions/Approvals could not be audited because the synthetic ProposalRecord fixture was incomplete and triggered the application error boundary.

The branch was stabilized with bounded presentation/test-fixture changes only. Later exact-head CI #622 passed.

The closeout must not erase the initial failure: it demonstrated that P11.5 added stricter coverage rather than merely relabeling P4.10.

## Replit

Replit was Git-only fast-forwarded to the implementation merge/tree with:
- branch `main`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked changes 0;
- untracked files 0;
- clean worktree.

Using existing dependencies only:
- recursive workspace tests: **1,218 passed / 0 failed**;
- full typecheck: PASS;
- full build: PASS;
- P11.1 performance budget: PASS;
- `git diff --check`: PASS;
- JS: 589,405 raw / 169,557 gzip;
- CSS: 180,021 raw / 29,931 gzip.

Replit discovered the same 81 Chromium tests but could not launch Chromium because required shared libraries were unavailable. This is an environment limitation, not an application assertion failure. No Replit browser-pass claim is made. GitHub Ubuntu/Chromium remains the canonical browser runner under the established P4.10 contract.

## Boundaries preserved

P11.5 is unpublished engineering certification only.

It performed no:
- production accessibility crawl or scan;
- provider/public-site request or mutation;
- Production DB/storage read/write/DDL/DML;
- secret/config/runtime change;
- scheduler/worker/retry activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

P11.5 is not a legal/universal accessibility claim and does not certify:
- the separately published Task #73 application;
- every browser/OS/assistive-technology combination;
- third-party/provider pages;
- future content or code that has not rerun the gate.

Representative manual assistive-technology testing remains appropriate before a commercial accessibility statement.

## Next safe boundary

P11.6 — responsive/product polish.

Generic continuation may perform bounded engineering-source and local/synthetic browser review/remediation for:
- layout density;
- wrapping and overflow;
- touch/keyboard ergonomics;
- breakpoint consistency;
- visual hierarchy;
- loading/empty/error states;
- cross-workspace visual/product consistency.

It must preserve P11.5 accessibility gates and does not authorize live provider/runtime activity, Production DB/storage mutation, secrets/config changes, workers/schedulers, Task #51/#53/#54 execution, P9.8 implementation/activation, deployment or publication.

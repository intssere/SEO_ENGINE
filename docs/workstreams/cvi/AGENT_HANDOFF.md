# CVI autonomous coding-agent handoff
Workstream: CVI 4.0
Branch: workstream/cvi-content-value-intelligence-v4
Initial base main: ce4f836ef77f15f767c97d92c9f5fad774404916
Status: documentation/design baseline, NOT production certified.

## Mandatory startup
1. Identify current repository, branch, HEAD, main HEAD, dirty files, open PRs and CI status.
2. Read root AGENTS.md, ARCHITECTURE.md, CURRENT_STATE.md and any nested agent instructions.
3. Read every document in docs/workstreams/cvi/.
4. Treat historical base SHA as provenance, not a perpetual claim of current main.
5. Audit actual code and tests before asserting a feature exists or is missing.
6. Identify current UGP/P12.2 ownership and do not overwrite their concurrent work.

## First executable task
Perform read-only repository-to-CVI traceability audit, record source paths/tests/behavior for CVI-R01..R20 and propose the smallest safe first implementation increment. Report blockers and precise validation commands. Do not implement publishing as a shortcut.

## Coding discipline
One narrowly scoped increment per PR. Tests first for high-risk behavior. Reuse existing contracts, auth, audit and publishing infrastructure. No speculative migrations or mass refactors. Preserve backward compatibility. Update ADRs and handoff with every increment.

## Stop conditions
Unknown tenant authority; unresolved branch drift; missing evidence; unclear production authorization; unknown provider write outcome; conflicting CMS revisions; missing mandatory review; unverified tests. Stop and ask for explicit instruction.

## Handoff format for every session
Date; repo; branch; current HEAD; canonical main SHA; last merged PR; exact implemented files; tests executed/results; migrations; deployments; external writes; unresolved issues; next single action; authorization required. Never claim success without tool evidence.

## No-go actions
No merging, Railway deployment, production provider sends, live CMS publishing, scheduled activation, credential changes, or production migrations based on this handoff alone.

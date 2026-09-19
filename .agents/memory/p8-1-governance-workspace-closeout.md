# P8.1 — Governance Workspace Closeout

## Scope

Roadmap P8.1 implemented a deterministic/read-only unified opportunity → proposal → approval governance workspace over existing certified control primitives. It added no approval, authorization, execution, rollback, provider/site mutation, persistence, scheduler/worker, deployment or publication capability.

Implementation issue/PR:
- issue #285 — P8.1 Unified opportunity → proposal → approval governance workspace v1
- PR #286 — P8.1 Unified opportunity → proposal → approval governance workspace v1

## Certified implementation

- base SHA: `ee91cddaa8b5795e926ac91bcefb7b2415877da1`
- base tree: `12a112d9e38c1570137b049a06f0be9692193fca`
- exact tested PR head: `73f131e29ee36ebda21dc1a3ecec839beaa7a138`
- PR CI: #510 / run `35460580256` / success
- merge SHA: `6dd42a2850713a4692039bb76900731129422061`
- merge tree: `e2c98d4d32b96a0d37ab01be4a81011f72dd944d`
- post-merge main CI: #511 / run `35460776543` / success

## Product/semantic result

The new `/governance` workspace:
- reads only the existing opportunity, action/proposal and approval GET surfaces;
- joins exact opportunity/proposal/control lineage without hidden source precedence;
- fails closed on duplicate IDs, missing opportunity lineage and conflicting shared proposal/control fields;
- retains opportunity-only rows as `not_ready`;
- exposes descriptive states only: `not_ready`, `pending`, `approved`, `rejected`, `revision_requested`;
- keeps opportunity score/confidence/risk and evaluator/plan-control/effective-execution risk domains distinct;
- treats `execution_authorized` and `public_site_writes` as persisted descriptive state, not UI authority;
- states explicitly that approval state does not authorize execution;
- treats canonical row order as serialization only, not recommendation or execution priority;
- provides searchable/sortable DataGrid UX and source links to the dedicated Opportunities, Actions and Approvals surfaces;
- includes responsive, keyboard, closed-network browser and serious/critical axe coverage.

## Replit certification

Replit app `SEO_ENGINE` was independently verified after merge:
- branch: `main`
- HEAD: `6dd42a2850713a4692039bb76900731129422061`
- tree: `e2c98d4d32b96a0d37ab01be4a81011f72dd944d`
- ahead/behind vs `origin/main`: `0/0`
- worktree/index: clean
- untracked files: 0

Exact-tree verification:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS
- non-fatal build notes only: existing tooltip/sheet sourcemap messages and >500 kB chunk warning

## Safety result

P8.1 remained default-off/read-only and unpublished. It performed no:
- proposal edit or generation;
- approval grant/rejection;
- authorization renewal;
- execution or rollback;
- verification mutation;
- provider/public-site request or write;
- observation/evidence persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- environment/secret/config mutation;
- deployment or publication.

The published production application remains the separately certified Task #73 source; Git synchronization and this engineering merge do not alter that attested release.

## Next boundary

Default next safe milestone: **P8.2 — Evidence/risk/preview/verification/rollback action cards**.

P8.2 may proceed only as deterministic/read-only UX engineering over existing certified data/control semantics unless a narrower reviewed issue establishes otherwise. Generic continuation does not authorize approval grants, execution, rollback mutation, provider/public-site writes, persistence, Production DDL/DML, scheduler/worker activation, secrets/config changes or publication.

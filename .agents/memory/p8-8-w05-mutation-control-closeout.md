# P8.8 W05 durable mutation-control bridge closeout

W05 E1–E5 engineering is implemented under issue #443 / PR #444.

Durable engineering:
- pure mutation-control state/event/claim contracts;
- P9.6 precedence preserved: `kill > drain > pause > running`;
- only durable `running` is eligible for a new W05 claim;
- forward mutation is distinct from mandatory post-side-effect safety closure;
- migration 0006 adds dedicated control state, append-only events and immutable claim binding only;
- no migration-created default running row; missing control fails closed;
- explicit database URL only; no W05 `DATABASE_URL` fallback;
- database transaction time and monotonic control revision are authoritative;
- control row is locked before reservation row;
- exact W03/W04 pair required before W05 claim or safe unclaimed release;
- claim atomically inserts one immutable W05 claim and transitions W04 `authorized -> claimed`;
- exact claim replay is durable and cannot produce another claim;
- pause/drain/kill may release only exact paired unclaimed `authorized`;
- claimed/manual-intervention never auto-release or auto-expire;
- kill is latched and cannot ordinary-resume;
- human Task #51/#54 path is unchanged.

Corrected code-only head `6f5e302db014c153cfca2f86ca7f46136e0ab74f` passed CI #825 / run `35869432936`, including migration/schema, real PostgreSQL concurrency, full workspace, scale, browser, typecheck and build.

Migration 0005 remains unapplied to Production. Migration 0006 is engineering source only and is not applied to Production. No Production control row, claim, reservation transition, provider call, Task #51/#53/#54 execution, worker/policy activation, deployment/publication or credential/config change occurred.

Next boundary: W06 policy-aware mutation-free preflight, separately authorized. Production DDL for 0005/0006 remains separately authorized.

## Final merge certification

- final PR head: `d4daaa6b1b25667af884d1ecea1f3502e1d7bd8f`;
- exact-head CI #835 / run `35870588547`: success;
- merge SHA/tree: `fa15403b2cf4802c85b87f01b1cc77c778775245` / `9ff17f37ce595b58640817e57d805e7c70237ea8`;
- post-merge main CI #840 / run `35871447548`: success;
- issue #443: closed;
- Replit Git-only reconciliation: branch `main`, local HEAD and refreshed `origin/main` both exact at `fa15403b2cf4802c85b87f01b1cc77c778775245`, ahead/behind `0/0`, clean, no extra local commits;
- zero deployment/publication, Production migration/DDL/DML/control initialization/reservation claim, provider/network action, Task #51/#53/#54 execution, worker/scheduler/policy activation, or credential/config mutation.

Post-merge continuity documentation is tracked by issue #449. W06 remains separately gated.
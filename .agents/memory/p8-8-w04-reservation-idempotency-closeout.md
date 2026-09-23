# P8.8 W04 durable reservation/idempotency engineering — closeout

W04 E1–E5 engineering implements the durable PostgreSQL reservation/idempotency boundary for the policy mutation path while remaining inactive in Production.

- issue: #420
- PR: #422
- code-only head: `209bd9a96489176942e501a20b6e4983c94f521a`
- code-only CI #744 / run `35854780897`: success
- migration source: `0005_p8_8_policy_mutation_reservations.sql`
- Production migration status: NOT APPLIED

Core invariants:

- pure deterministic W01/W02-derived W04 reservation intent;
- unchanged W03 v1 synthetic descriptor must precommit exact W04 reservation ID/fingerprint;
- dedicated `policy_mutation_reservations` table, separate from human `actions` and generic `jobs`;
- one active/blocking reservation per site and per exact target field enforced by partial unique indexes;
- exact replay is idempotent; identity/site/target/uncertain conflicts fail closed;
- PostgreSQL transaction time controls authorization-window validity;
- opportunistic expiry only for stale `authorized`; never claimed/manual-intervention;
- explicit database URL only; no W04 `DATABASE_URL` fallback;
- bounded durable receipt and pure W03/W04 pairing;
- pairing/control eligibility does not grant provider dispatch/public write authority;
- no Production DDL/DML, provider request/write, Task #51/#53/#54 execution, policy/worker activation, credential/config/deployment/publication activity.

Final exact-head/merge/post-merge lineage is recorded on issue #420 after certification.

Next boundary: W05 durable mutation-control bridge, separately authorized. W04 Production DDL remains a separate authorization boundary.

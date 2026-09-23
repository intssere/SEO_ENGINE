# P8.8 W02 governed proposal materialization — closeout

W02 implements the pure deterministic bridge from one canonical P9.7 `proposal_review` plus one canonical P6.6 single-field changed `meta_description` preview plus an explicit fingerprinted Shopify Product target binding into an in-memory governed proposal materialization.

- issue: #412
- PR: #413
- implementation source: `p8-8-governed-proposal-materialization.ts`
- tests: `p8-8-governed-proposal-materialization.test.ts`
- code-only corrected head: `21e9aa50a7ad2826cea115e6c62a1037fcea79ef`
- code-only CI #718: success

Core invariants:

- P9.7 projection is rebuilt and supplied recommendation must match exactly;
- P6.6 preview report is rebuilt and must match exactly;
- `proposal_review` only;
- observed/active upstream lifecycle only;
- exactly one field total and one changed field;
- field exactly `meta_description`;
- target exactly Diamond Shelf / Shopify Product / `update_meta_description` / `write_products`;
- Product GID/URL are caller-supplied and fingerprint-bound, never inferred/discovered;
- before/after text copied byte-for-byte with no generation/rewrite/normalization;
- deterministic target/before/after/idempotency/proposal/materialization fingerprints;
- conflicting reuse of one recommendation idempotency identity can fail closed through pure replay compatibility;
- output lifecycle is `materialized_unpersisted`;
- output carries static W01 facts only and intentionally omits live current-state/quota/control/bounded-pilot authority.

W02 performs zero DB read/write/persistence/schema mutation, zero provider/network read/write, zero ProposalRecord persistence, zero approval/policy authorization, zero Task #51/#53/#54 execution, zero scheduler/worker/policy activation, zero credential/config/deployment/publication activity.

CI #716 caught and led to correction of only a synthetic test-fixture evidence-lineage error. CI #717 then passed runtime tests and caught only a TypeScript changed-status narrowing issue. The explicit type narrowing preserved behavior. Corrected code-only head passed CI #718 fully.

Final exact-head/merge/post-merge lineage is recorded on issue #412 after certification.

Next boundary: W03 policy-authorization artifact, separately authorized. W02 grants no W03–W10 authority.

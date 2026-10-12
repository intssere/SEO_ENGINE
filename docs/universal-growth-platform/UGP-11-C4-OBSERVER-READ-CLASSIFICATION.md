# UGP-11.C4 — Independent Observer Read Classification

Baseline UGP HEAD `fab7ac3a6cc3a31756435973b9024ad99ded1597`; post-merge workflow #38272931577 passed.

Adds a pure read-outcome classifier separate from PostgreSQL execution. An observer read failure becomes unavailable, an interrupted/incomplete/unclosed result becomes partial, and multiple matching markers become conflicting. Only a closed, complete, single-marker result accompanied by a fenced job can be offered to the existing exact-state reconciler. Tests require every uncertain state to return manual_intervention_required and to deny automatic retries, provider dispatch and production authority.

**Bounded scope:** Caller-supplied `transactionClosed:true` is not authenticated proof of a successful database transaction or snapshot provenance. This is not a real SQL observer, driver-error catching adapter, independent read transaction attestation, snapshot freshness guarantee, production activation or a new retry entitlement. These remain open certification gaps. No DB connection from this classifier, no Production DB, provider, autonomous scheduling, P9 authority, main integration or deployment. Exact-head dual CI and separate merge authorization required.

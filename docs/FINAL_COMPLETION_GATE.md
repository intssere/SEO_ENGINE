# SEO ENGINE — Final Completion Gate

**Roadmap ID:** P0.3  
**Canonical baseline:** `e44dee782b1a9b1ede4265dffe19e142e372dc78`  
**Authority:** subordinate to `AGENTS.md`, `CURRENT_STATE.md`, and `MASTER_COMPLETION_ROADMAP.md`.  
**Purpose:** define the dependency-ordered conditions that must all be true before the SEO ENGINE program may be called complete.

This document is a completion contract, not execution authorization.

---

## 1. Completion model

SEO ENGINE is complete only when all five gates below are closed:

1. **Production evidence/crawl certification complete**
2. **Remaining provider/runtime/compliance certification complete**
3. **UGP initiative complete and reconciled into canonical main**
4. **Customer-facing product acceptance complete**
5. **Final immutable Production release + program closeout complete**

No gate may be marked complete from repository engineering alone when the roadmap requires live Production evidence.

---

## 2. Gate A — Production evidence and crawl certification

### A1 — P12.2 L1A Production DB observation
Status: **BLOCKED ON CREDENTIAL-BEARING EXECUTION SURFACE**

Repository engineering is complete through:

- E1 exact seven-query read-only contract;
- E2 bounded psql transport plan;
- E3 credential-bearing runner contract;
- E4 execution-surface/audit contract;
- E5 one-shot operator entrypoint.

The already-approved one-shot remains:

`AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79`

It is considered consumed only when the live executor invokes the first certified SELECT.

Required completion evidence:

- exact Railway project/environment/Postgres service binding;
- working `psql`;
- exact Production `DATABASE_URL` injected without disclosure;
- one attempt;
- zero retries;
- zero fallback transport;
- exact seven SELECTs;
- deterministic secret-free preflight/outcome receipts.

### A2 — Migration decision
Depends on A1.

Possible outcomes:

- exact expected pre-migration state -> migration 0004 becomes eligible for a separate reviewed/authorized Production migration;
- exact expected post-migration state -> migration not required;
- any other state -> fail closed and investigate.

Migration 0004 is never implied by this document.

### A3 — New immutable release containing L2
Depends on A1/A2.

The currently running F16 Production image predates the merged L2 one-shot crawl caller.

Required before live L2 proof:

- fresh immutable build from exact certified source;
- deterministic build provenance;
- registry/source attestation;
- digest certification;
- disposable non-Production fixture;
- release packet;
- explicit Production image-transition authorization;
- post-deploy provenance/health verification.

### A4 — Real bounded P12.2 crawl proof
Depends on A3.

Required:

- exact Diamond Shelf target/site binding;
- exact live authorization packet;
- full-initial/interruption/resume/reconciliation/incremental evidence as required by P12.2;
- bounded network and persistence behavior;
- deterministic receipts;
- no scheduler/autonomous worker activation unless separately authorized.

**Gate A closes only when P12.2 live proof is complete and durable.**

---

## 3. Gate B — Remaining P12/provider/runtime/compliance certification

Depends on Gate A where live evidence lineage requires it.

Remaining program work includes:

- P12.3 live provider activation certification;
- P12.4 external-provider verification;
- P12.5 real evidence acquisition;
- P12.6 remaining integration/closure requirements;
- P12.7 live scheduler/runtime certification;
- P12.8 real outcome certification;
- P12.9 exact Production release-candidate acceptance;
- P12.10 final Production/program closeout.

P11.9 privacy/compliance blockers remain independent and must be closed for affected live/commercial flows. P12 progress does not waive them.

Gate B also requires:

- credential/token lifecycle controls proven;
- provider terms/retention/deletion obligations resolved for enabled providers;
- live failure/recovery behavior verified;
- no unresolved security/recovery blocker that contradicts final Production acceptance.

**Gate B closes only when every required P12 acceptance criterion and surviving P11.9 blocker is closed.**

---

## 4. Gate C — Universal Growth Platform completion and reconciliation

UGP remains a separate initiative until certified for reconciliation.

Required:

- complete active UGP 6.x work;
- close or reconcile stale/obsolete UGP PRs;
- complete remaining connector/provider/live-read certifications required by the UGP roadmap;
- certify DataForSEO and semantic layers at their intended live boundaries;
- run initiative-wide regression/CI;
- reconcile current canonical `main` into the UGP initiative;
- resolve conflicts without weakening main safety contracts;
- perform final initiative acceptance;
- merge UGP into canonical `main` only under explicit merge authorization;
- run post-merge full regression and release-readiness checks.

No UGP branch may be treated as Production merely because it is feature-complete.

**Gate C closes only when the intended UGP scope is merged into canonical main and passes post-merge certification.**

---

## 5. Gate D — Customer-facing product acceptance

Depends on the final integrated codebase from Gates A–C.

Required acceptance areas:

- onboarding and website connection flow;
- site/project context and multi-site isolation where enabled;
- Command Center;
- Discover;
- Audit/full-site crawl/URL explorer;
- Execute/approvals/actions/rollback surfaces;
- Measure/impact/reporting;
- System/connections/data sources/activity/audit;
- content/article research workflow;
- backlink/research workflow;
- provider status/error/retry UX;
- job/crawl progress UX;
- auth/RBAC behavior;
- responsive/mobile/tablet acceptance;
- WCAG 2.2 AA acceptance for supported workflows;
- no primary-navigation placeholder or engineering-only screen;
- production-grade loading/empty/error/stale states;
- bounded large-table performance;
- commercial billing/subscription acceptance if included in v1 release scope.

Required final tests:

- unit;
- integration;
- contract;
- migration;
- browser E2E;
- accessibility;
- critical visual regression;
- security regression;
- synthetic scale/performance budgets;
- exact production smoke tests after release.

**Gate D closes only when the integrated product is customer-usable without relying on engineering-only fixtures or manual hidden paths.**

---

## 6. Gate E — Final immutable Production release and program closeout

Depends on Gates A–D.

Required release candidate:

- canonical main frozen to exact SHA/tree;
- all required CI terminal SUCCESS;
- exact dependency lock;
- exact database target state known;
- no unresolved migration ambiguity;
- fresh immutable OCI image;
- provenance + registry attestations;
- digest-certified artifact;
- disposable non-Production fixture;
- rollback packet;
- Production deployment packet;
- explicit deployment authorization.

Required Production acceptance:

- deployment reaches terminal SUCCESS;
- exact image/source provenance verified;
- health/auth/root/protected routes verified;
- Production schema fingerprint verified;
- required providers/connections verified;
- no unintended provider/public-site/database activity;
- scheduler/worker states match approved policy;
- live customer workflows pass;
- audit/observability/recovery checks pass;
- rollback path remains available and documented.

Required repository/program closeout:

- `CURRENT_STATE.md` updated;
- `MASTER_COMPLETION_ROADMAP.md` P0.3 marked DONE;
- P12.10 marked DONE;
- program issue #139 closed;
- stale/obsolete branches/PRs/issues dispositioned;
- final operational runbook stored;
- final release receipt stored;
- final Production SHA/image/deployment/database lineage recorded.

**Gate E closes only after final Production acceptance and durable repository closeout.**

---

## 7. Dependency order

The normative order is:

`A1 Production DB observation`
→ `A2 migration decision`
→ `A3 new immutable L2 release`
→ `A4 P12.2 live crawl proof`
→ `Gate B remaining P12/provider/runtime/compliance`
→ `Gate C UGP completion/reconciliation`
→ `Gate D integrated customer-product acceptance`
→ `Gate E final immutable Production RC/deploy/closeout`

Parallel work is allowed only where it does not weaken dependency evidence or cross authorization boundaries.

---

## 8. Current checkpoint

As of this document baseline:

- canonical GitHub main: `e44dee782b1a9b1ede4265dffe19e142e372dc78`;
- E1–E5 L1A repository path: merged;
- Production one-shot DB observation: not yet executed;
- Production one-shot authorization: unconsumed;
- Production remains on the older immutable F16 image;
- L2 is not present in that running image;
- therefore the next critical-path blocker is the credential-bearing L1A execution surface.

---

## 9. Definition of DONE

The SEO ENGINE project must not be called complete merely because:

- all planned code exists;
- all PR CI passes;
- the app is online;
- the database is reachable;
- a provider adapter exists;
- UGP is feature-complete on its branch;
- a release builds successfully.

It is complete only when **all five gates A–E are closed with durable evidence** and the final Production release is the exact certified integrated system.

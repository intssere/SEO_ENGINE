# P8.8 W09-B — Real Stage 0 Evidence Acquisition Review

**Issue:** #497  
**Status:** REVIEW / SPECIFICATION ONLY — NO PRODUCTION READ, NO PROVIDER READ, NO PERSISTENCE, NO W10

## 1. Purpose

W09-A is merged/certified as a pure, caller-supplied, zero-write shadow-certification engine.

W09-B defines how to obtain a **bounded, real, integrity-verifiable Stage 0 evidence package** from Production data without converting Stage 0 into an execution path.

The first W09-B run should answer only:

> Can we produce a small set of real Shopify Product meta-description candidate snapshots, with complete decision-time policy/control/history provenance, and feed them into the merged W09-A engine as externally supplied real snapshots — while proving that no provider/public-site mutation, W03–W07 authority, Production persistence, scheduler/worker activation, deployment, or W10 activation occurred?

W09-B is evidence acquisition, not policy activation.

## 2. Canonical baseline

Review baseline:
- canonical `main`: `3a265293106fe5ac78520f316f12ef659ca5693e`;
- canonical tree: `3c63748229b4fce27447f3793a58040913796118`;
- W09-A implementation: issue #493 / PR #494;
- W09-A post-merge CI #1027 and duplicate #1028: success;
- Replit reconciled to canonical main, ahead/behind `0/0`, clean;
- no W09-B Production access has occurred.

The review must not assume that Production migrations 0005/0006/0007 are applied merely because their engineering source is merged.

## 3. Key architectural split

W09-B has three distinct conceptual stages.

### B0 — acquisition readiness / schema preflight

Read-only Production inspection only.

Purpose:
- identify the exact Production database/environment;
- confirm required tables/columns exist;
- confirm one exact active `diamondshelf.us` site identity;
- determine whether durable W05/W07 state exists in Production;
- determine whether an already-persisted provider-authoritative before-state observation exists for any candidate.

B0 performs no candidate evaluation and no persistence.

### B1 — bounded evidence extraction

Read-only Production SELECTs inside one bounded, repeatable snapshot.

Purpose:
- acquire only the rows required to build at most 25 real candidate evidence envelopes;
- reconstruct deterministic upstream recommendation/proposal artifacts in memory where the canonical engine already defines them;
- derive W01 decision-time current-state facts from exact persisted history;
- export an immutable evidence package outside Production.

B1 performs no provider network read and no persistence.

### B2 — offline W09-A shadow evaluation

Runs against the exported immutable package.

Purpose:
- translate an authorized Production acquisition record into W09-A `supplied_real_snapshot` inputs;
- recompute W01 exactly;
- build the W09-A shadow session;
- produce a real Stage 0 proof package.

B2 must not connect back to Production or providers.

A future provider-read addendum, if needed, is outside B0/B1/B2.

## 4. Why W09-A must not read Production directly

Merged W09-A intentionally rejects direct `production_read_snapshot` input.

Therefore:

- the Production acquisition layer owns the raw Production provenance;
- the acquisition package records exact database/query/snapshot provenance;
- W09-A consumes the resulting immutable candidate payload as `supplied_real_snapshot`;
- the W09-A source fingerprint is bound to that supplied candidate;
- the W09-B manifest links that W09-A source fingerprint back to the Production acquisition provenance.

This preserves the W09-A no-database architecture.

W09-B must not weaken the W09-A guard that rejects direct Production reads.

## 5. First-run scope

The first real Stage 0 evidence run should be deliberately small.

### Site

Exactly:
- domain: `diamondshelf.us`;
- platform: Shopify;
- one active site row only.

If zero or more than one matching active site is found, abort.

### Policy class

Exactly:
- `shopify.product.seo.meta_description`;
- Product only;
- canonical Shopify Product GID only;
- canonical `https://diamondshelf.us/products/<handle>` URL only;
- action `update_meta_description`;
- field `meta_description`;
- required scope `write_products`;
- low effective risk only;
- current certified W01 policy grant only.

### Candidate count

- maximum 25 final candidate snapshots;
- maximum 100 source opportunities scanned to choose the bounded set;
- no whole-site sweep;
- no catch-up behavior;
- no batching beyond this review cap.

If fewer than 25 candidates are evidence-complete, run with the smaller set.

Zero complete candidates is a valid `real_shadow_evidence_incomplete` outcome.

## 6. First-run provider policy

The initial W09-B run is **database-read-only and provider-network-free**.

No Shopify Admin API read.
No storefront HTTP read.
No provider write.
No public-site write.

A candidate may use a persisted before-state observation only if the acquisition process can independently prove that the observation is:

- provider-authoritative;
- bound to the exact Product GID;
- bound to the exact `meta_description` field;
- integrity-valid;
- observed at or before the Stage 0 reference time;
- still fresh according to its certified freshness contract;
- traceable to an exact source/provenance fingerprint.

A crawler/page snapshot, storefront observation, semantic similarity, same URL, or matching text must not be relabeled as provider-authoritative evidence.

If the repository/Production data cannot prove provider-authoritative provenance for a candidate, that candidate is evidence-incomplete.

If this leaves no usable candidates, stop. Do not silently add a Shopify read.

## 7. Production schema preflight

The repository proves the engineering schemas exist in source; it does not prove they are installed in the live Production database.

A future authorized B0 preflight must inspect only schema metadata necessary to confirm these objects.

### Required core objects

Expected from migration 0001:
- `sites`;
- `pages`;
- `page_snapshots`;
- `evidence`;
- `opportunities`;
- `action_plans`;
- `actions`;
- `approvals`;
- `deployments`;
- `rollbacks`;
- `verifications`.

Expected from migration 0003:
- `seo_observation`;
- `seo_evidence`;
- `seo_observation_evidence`.

Expected from migration 0005:
- `policy_mutation_reservations`.

Expected from migration 0006:
- `policy_mutation_control_state`;
- `policy_mutation_control_events`;
- `policy_mutation_claims`.

Expected from migration 0007:
- `policy_mutation_dispatches`;
- `policy_mutation_dispatch_events`.

### Missing-object semantics

If 0005/0006/0007 objects are absent in Production:

- do not apply migrations;
- do not synthesize W05/W07 state;
- do not substitute engineering fixtures;
- do not assume `running`;
- do not assume zero active mutations;
- do not assume quota/cooldown/manual-intervention state;
- mark W09-B current-state acquisition incomplete;
- stop before producing an admissible real W01 candidate.

A separate migration/deployment authorization would be required before a later W09-B attempt that depends on those durable objects.

## 8. Production database identity

This review does not know the exact live Production database identifier from repository source alone.

A future read authorization must name:

- hosting platform/project;
- environment name;
- database name;
- connection/role identity;
- read-only credential or role;
- canonical application SHA/tree;
- exact W09-B acquisition implementation SHA, if an adapter is implemented.

Do not infer the Production database from a development/Replit URL or generic `DATABASE_URL`.

## 9. Transaction contract

The first Production acquisition should use one transaction with:

- `READ ONLY`;
- `REPEATABLE READ`;
- no DDL;
- no DML;
- no `SELECT ... FOR UPDATE`;
- no advisory locks;
- no temporary tables;
- no sequence changes;
- no functions with side effects;
- no extension changes;
- no session-level configuration changes outside local safety timeouts.

Recommended local safety limits:
- statement timeout: 5 seconds per statement;
- lock timeout: 1 second;
- idle-in-transaction timeout: 30 seconds;
- overall acquisition target: under 60 seconds;
- fail closed on timeout.

The package must record:
- transaction reference timestamp;
- transaction read-only state;
- database/server version;
- exact acquisition query-set version/fingerprint.

## 10. Permitted table/column boundary

The future authorization should permit only the columns needed below.

### 10.1 Site identity

`sites`
- `id`;
- `domain`;
- `canonical_origin`;
- `platform`;
- `is_active`;
- `updated_at`.

Purpose:
- resolve exactly one active `diamondshelf.us` Shopify site.

Do not read organization billing/private metadata for W09-B.

### 10.2 Candidate page identity

`pages`
- `id`;
- `site_id`;
- `url`;
- `normalized_url`;
- `path`;
- `page_type`;
- `indexable`;
- `last_seen_at`.

Purpose:
- bind candidate pages to exact Product URLs.

Do not infer Product GID from URL.

### 10.3 Page evidence

`page_snapshots`
- `id`;
- `page_id`;
- `observed_at`;
- `status_code`;
- `meta_description`;
- `canonical_url`;
- `content_hash`;
- `raw_signals`.

Purpose:
- descriptive page evidence;
- existing before-text evidence where semantically valid;
- never sufficient by itself for the W01 provider-observed-before field.

### 10.4 Opportunity source

`opportunities`
- `id`;
- `site_id`;
- `page_id`;
- `query_id`;
- `opportunity_type`;
- `status`;
- `score`;
- `impact_estimate`;
- `effort_estimate`;
- `rationale`;
- `evidence_ids`;
- `created_at`;
- `updated_at`.

Purpose:
- provide real persisted source opportunity identity/evidence references for deterministic upstream reconstruction.

Maximum source opportunities scanned: 100.

Acquisition ordering may use `updated_at DESC, id DESC` solely as a bounded freshness rule. It must not be presented as policy priority or execution order.

### 10.5 Legacy evidence references

`evidence`
- `id`;
- `site_id`;
- `page_id`;
- `source`;
- `kind`;
- `observed_at`;
- `confidence`;
- `payload`;
- `provenance`;
- `created_at`.

Purpose:
- resolve exact `opportunities.evidence_ids`;
- preserve source/provenance.

Per opportunity:
- maximum 16 referenced evidence rows;
- if the opportunity references more than 16 rows, mark candidate incomplete rather than truncate silently.

### 10.6 Normalized observation/evidence lineage

`seo_observation`
- `observation_id`;
- `schema_version`;
- `semantic_key`;
- `subject_kind`;
- `site_id`;
- `canonical_origin`;
- `url_id`;
- `canonical_url`;
- `observation_kind`;
- `material_value`;
- `value_fingerprint`;
- `evidence_set_fingerprint`;
- `source_kind`;
- `source_fingerprint`;
- `collector_id`;
- `provenance_fingerprint`;
- `confidence`;
- `observed_at`;
- `fresh_for_ms`;
- `stale_after`;
- `retention_class`;
- `record_fingerprint`.

`seo_evidence`
- all identity/fingerprint/quality/availability fields.

`seo_observation_evidence`
- `observation_id`;
- `reference_fingerprint`.

Purpose:
- provide integrity-bound observation provenance;
- establish exact source lineage;
- identify a provider-authoritative before-state observation only if independently certified.

Maximum normalized observations loaded per final candidate: 8.
Maximum normalized evidence references loaded per observation: 16.

If the cap would truncate evidence needed to prove provenance, mark the candidate incomplete.

## 11. Product GID rule

W01 requires:
- `gid://shopify/Product/<positive integer>`.

The Product GID must come from persisted, integrity-bound source data.

Allowed only when explicitly present in:
- existing normalized observation/evidence material;
- existing governed target/action material;
- another already-certified persisted source.

Do not:
- derive Product GID from URL;
- query Shopify merely to discover it;
- guess from numeric handles;
- use Collection GIDs;
- use fuzzy matches.

If exact Product GID is absent, mark candidate incomplete.

## 12. Proposal/recommendation reconstruction

P9.7 recommendations are deterministic projections and are not a durable recommendation authority table.

Therefore W09-B should:

1. read the minimum real persisted opportunity/evidence inputs;
2. rebuild the canonical upstream deterministic explanation/actionability/lifecycle/recommendation/proposal chain in memory using existing certified pure functions;
3. verify every recomputed fingerprint;
4. never write those artifacts back to Production;
5. never create a new recommendation/proposal persistence namespace for this run.

If the persisted source rows are insufficient to rebuild exact upstream lineage, mark the candidate incomplete.

Do not invent missing upstream fingerprints.

## 13. Current-state field mapping

W01 requires the following current-state facts.

### 13.1 `mutationControlMode` / `mutationControlFingerprint`

Authoritative source:
- exact `policy_mutation_control_state` row for the target site.

Required columns:
- `site_id`;
- `control_version`;
- `revision`;
- `mode`;
- `effective_at`;
- `control_fingerprint`.

If the table or exact row is absent:
- current state is incomplete;
- do not assume running.

### 13.2 `otherActiveSiteMutationCount`

Authoritative policy-path source:
- blocking rows in `policy_mutation_dispatches` for the exact site.

Blocking states are the states protected by migration 0007:
- `reserved_prewrite`;
- `dispatch_started`;
- `forward_verification_pending`;
- `rollback_required`;
- `rollback_started`;
- `rollback_verification_pending`;
- `manual_intervention_required`.

The acquisition calculation must also account for any separately certified human execution conflict required by W01 semantics.

Do not count unrelated jobs as policy mutation concurrency.

### 13.3 `unresolvedManualIntervention`

True if exact relevant durable state indicates unresolved manual intervention, including:
- `policy_mutation_reservations.status='manual_intervention'`;
- or `policy_mutation_dispatches.state='manual_intervention_required'`;
- or exact comparable human-governed audit evidence indicates unresolved manual intervention for the target.

Do not clear manual intervention based on age alone.

### 13.4 `unresolvedUncertainProviderWrite`

True if exact dispatch history for the site/target has a nonterminal or terminal uncertainty state where:
- public write occurrence is `possible`;
- verification is incomplete/unavailable;
- or the certified W07 terminal reason represents unresolved write uncertainty.

Do not infer certainty from elapsed time.

### 13.5 `unresolvedRollbackFailure`

True if exact W07/human rollback evidence shows:
- rollback attempt spent with no verified safe closure;
- rollback occurrence possible/confirmed but before-state verification absent/mismatched;
- or manual intervention remains because rollback safety cannot be proved.

### 13.6 `sameTargetCooldownSatisfied`

Compute against exact prior mutation history for:
- site;
- provider;
- Product GID;
- field `meta_description`.

Current policy minimum:
- 336 hours / 14 days.

The calculation must use the certified mutation timestamp semantics from the corresponding execution path.

If the last relevant mutation timestamp is unknown or ambiguous:
- cooldown is not proven satisfied.

### 13.7 `mutationQuotaRemaining`

Current W01 policy:
- maximum 1 action per 24 hours per site.

Derive from exact action history according to the policy's certified counting semantics.

Do not consume quota during W09-B.

If history is incomplete or the counting boundary is ambiguous:
- quota remaining is not proven;
- candidate is incomplete or rejected by a separately explicit conservative adapter rule;
- do not guess.

### 13.8 `priorDeploymentCount`

Count exact prior deployments/mutations for the same candidate target according to W01's certified interpretation.

Potential sources:
- policy path: `policy_mutation_dispatches`;
- human path: `actions` + `action_plans` + `deployments`, bound to exact target.

A nonzero prior deployment count rejects under W01.

Never treat a merely created action/plan as a deployment.

## 14. Policy-path history columns

### `policy_mutation_reservations`

Permitted read fields:
- reservation/policy/evaluation/materialization/proposal/recommendation IDs/fingerprints;
- site/target/provider/domain/action/field/scope;
- before/after fingerprints;
- policy action identity;
- status;
- authorized/expiry/claimed/terminal timestamps/reason;
- created/updated timestamps.

Purpose:
- active blocking state;
- manual intervention;
- exact lineage/history.

### `policy_mutation_control_state`

Permitted fields listed in §13.1.

### `policy_mutation_control_events`

Optional only when needed to verify control chronology:
- identity/fingerprints;
- site;
- from/to revision/fingerprint/mode;
- action;
- effective timestamp.

Not needed merely to read current control state.

### `policy_mutation_claims`

Optional only for exact unresolved in-flight lineage:
- claim identity/fingerprint;
- reservation identity;
- policy action identity;
- site;
- control revision/fingerprint;
- target;
- before/after fingerprints;
- claimed timestamp.

### `policy_mutation_dispatches`

Permitted:
- exact lineage IDs/fingerprints;
- site;
- policy ID/version/fingerprint;
- target/provider/domain/action/field/scope;
- before/after fingerprints;
- state/revision;
- forward/rollback attempt counts;
- public-write/rollback occurrence;
- verification fingerprint;
- reserved/dispatch/rollback/terminal timestamps;
- terminal reason.

Do not read provider credentials from unrelated tables.

### `policy_mutation_dispatch_events`

Optional only when the current dispatch row is insufficient to prove exact uncertainty/rollback chronology.

If read:
- exact event identity/fingerprint;
- dispatch/site;
- from/to revision/state;
- transition reason;
- public-write/rollback occurrence;
- effective timestamp.

## 15. Human-governed comparison boundary

Human comparison remains optional.

For final candidate page IDs only, the acquisition may read:

`action_plans`
- `id`;
- `site_id`;
- `opportunity_id`;
- `status`;
- `risk_level`;
- timestamps.

`actions`
- `id`;
- `action_plan_id`;
- `page_id`;
- `action_type`;
- `status`;
- `target`;
- `proposed_change`;
- `expected_state`;
- timestamps.

`approvals`
- approval identity, decision, actor ID, reason, decided timestamp.

`deployments`
- deployment identity, plan identity, provider, status, external ref, deployed timestamp, metadata, created timestamp.

`rollbacks`
- rollback identity, deployment identity, status, reason, restore state, rollback timestamp, created timestamp.

`verifications`
- verification identity, deployment/page, status, expected/actual state, verification timestamp, created timestamp.

These rows may be used only to reconstruct an independently integrity-checked P8.6-style human ledger/comparison.

Comparison still requires exact:
- Product mutation class;
- Product GID;
- URL;
- field;
- before fingerprint;
- after fingerprint.

P8.7's historical Collection mutation remains non-comparable to the initial Product class.

## 16. Explicitly forbidden Production reads

The first W09-B authorization should not allow:
- `connections.secret_ref`;
- secrets/credential tables;
- OAuth tokens;
- provider credentials;
- user authentication/session data;
- unrelated organizations/sites;
- unrelated customer data;
- unrelated analytics tables;
- broad table dumps;
- arbitrary SQL outside the reviewed query set.

If an implementation cannot acquire the required evidence within the approved table/column list, it must stop and request review expansion.

## 17. Query-set fingerprint

Before any real run, the exact SELECT query set must be frozen and fingerprinted.

The query-set artifact should contain:
- query ID;
- query version;
- normalized SQL hash;
- permitted table/column list;
- parameter schema;
- maximum returned rows;
- purpose;
- expected ordering;
- expected cardinality;
- whether query is mandatory/optional.

The Production proof package must include the query-set fingerprint.

No ad hoc SQL during the run.

## 18. Candidate acquisition algorithm

The reviewed logical sequence is:

1. resolve exactly one active `diamondshelf.us` Shopify site;
2. read current W05 control state;
3. read bounded candidate opportunities/pages;
4. resolve exact evidence referenced by those opportunities;
5. resolve normalized observations/evidence needed for exact lineage and Product GID;
6. find an already-persisted provider-authoritative before-state observation, if one exists;
7. rebuild deterministic upstream recommendation/proposal artifacts in memory;
8. read bounded policy mutation history for current-state facts;
9. optionally read exact human-governed history for candidate page IDs;
10. build a raw acquisition record per candidate;
11. calculate a deterministic acquisition fingerprint per candidate;
12. export package;
13. end the Production transaction;
14. only after disconnection, translate evidence-complete records into W09-A `supplied_real_snapshot` inputs;
15. run W09-A offline.

No W09-A evaluation should execute while the Production transaction remains open.

## 19. Acquisition manifest

The immutable W09-B acquisition manifest should contain:

- W09-B acquisition version;
- canonical application SHA/tree;
- acquisition adapter SHA/version, if implemented;
- exact Production environment identity;
- database identity excluding passwords/secrets;
- read-only role identity;
- transaction reference time;
- query-set fingerprint;
- site ID/domain;
- policy ID/version/fingerprint;
- maximum candidate cap;
- selected opportunity/page IDs;
- per-query row counts;
- per-query result fingerprints;
- per-candidate raw acquisition fingerprint;
- per-candidate completeness status;
- reason for incompleteness;
- explicit `providerNetworkReadPerformed=false`;
- explicit `databaseWritePerformed=false`;
- explicit `persistencePerformed=false`;
- explicit `w03ToW07AuthorityCreated=false`;
- explicit `providerWritePerformed=false`;
- explicit `deploymentPerformed=false`;
- explicit `publicationPerformed=false`.

The manifest itself must be stored outside Production for the first run.

## 20. Per-candidate completeness states

Recommended acquisition states:

- `complete_for_w09a`;
- `missing_product_gid`;
- `missing_upstream_lineage`;
- `missing_required_evidence`;
- `provider_before_not_authoritative`;
- `provider_before_stale`;
- `control_state_missing`;
- `mutation_history_incomplete`;
- `quota_state_incomplete`;
- `cooldown_state_incomplete`;
- `manual_intervention_state_incomplete`;
- `rollback_state_incomplete`;
- `ambiguous_target_identity`;
- `query_cap_exceeded`;
- `integrity_failure`.

Only `complete_for_w09a` candidates enter the offline W09-A session.

Incomplete records remain evidence of why Stage 0 could not evaluate that candidate.

## 21. Fail-closed / abort conditions

Abort the Production extraction immediately on:

- database is not the explicitly authorized Production target;
- connection role is not read-only;
- transaction cannot be established as read-only;
- site cardinality is not exactly one;
- schema differs from reviewed requirements in a safety-relevant way;
- query-set fingerprint mismatch;
- unexpected table/column access;
- query returns more than its reviewed cap where truncation would alter semantics;
- data integrity/fingerprint mismatch;
- ambiguous Product identity;
- unexpected provider/network activity;
- any attempted write;
- any DDL/DML;
- any lock-taking request;
- timeout;
- any W03–W07 mutation/materialization attempt;
- any scheduler/worker/startup side effect.

Do not recover by broadening access.

## 22. No persistence in first run

The first W09-B run should not persist:
- raw Production extracts back into Production;
- W09-B manifests in Production;
- W09-A decisions in Production;
- session summaries in Production;
- comparison artifacts in Production.

Outputs should be retained only as an external immutable evidence package associated with the certification review.

Any future persistent Stage 0 evidence store requires:
- separate schema design;
- separate migration;
- separate authorization;
- proof that it is non-authoritative.

## 23. Zero-write proof

The proof package must include evidence that:

- DB transaction was read-only;
- no DML/DDL query was in the frozen query set;
- no provider/public-site call occurred;
- no Task #51/#53/#54 execution occurred;
- no W03 authorization was created;
- no W04 reservation was created/mutated;
- no W05 claim/control mutation occurred;
- no W06 provider preflight occurred;
- no W07 dispatch/rollback occurred;
- no scheduler/worker/startup activation occurred;
- no credential/config/gate change occurred;
- no deployment/publication occurred.

## 24. Offline W09-A package

For each `complete_for_w09a` candidate, W09-B must produce:

- W09-A `source.system` identifying the W09-B acquisition adapter;
- source version;
- deterministic source ID;
- provenance `supplied_real_snapshot`;
- W09-A source fingerprint;
- exact current W01 grant;
- exact W01 candidate;
- reference time;
- evaluation expiry;
- exact W01 evaluation recomputed offline;
- optional exact-target human P8.6 ledger;
- acquisition manifest link/fingerprint.

W09-A must recompute W01 again, as already implemented.

## 25. First-run result states

The first real Stage 0 run may end as:

### `real_shadow_evidence_complete`

Only if:
- at least one candidate is `complete_for_w09a`;
- all entered candidates pass acquisition integrity;
- W09-A replay is deterministic;
- no source conflict exists;
- zero-write proof is complete;
- no provider network read occurred;
- no Production write/persistence occurred;
- lineage is complete.

### `real_shadow_evidence_incomplete`

If:
- no complete candidate exists;
- provider-authoritative before evidence is unavailable;
- Production W05/W07 schema/state is missing;
- required current-state facts cannot be proved;
- source lineage cannot be reconstructed;
- or any other non-fatal evidence gap prevents complete W09-A inputs.

Incomplete is not failure of W09-A. It is a factual Stage 0 readiness finding.

### `real_shadow_evidence_aborted`

If:
- target/environment mismatch;
- integrity failure;
- unexpected write capability;
- unexpected provider/network activity;
- query-set drift;
- timeout/safety violation.

## 26. No activation inference

Neither:
- number of admits;
- number of rejects;
- same/different human direction;
- zero-write success;
- complete evidence acquisition;
- absence of conflicts;
- or a clean Stage 0 run

may be interpreted by W09-B itself as a recommendation to activate W10.

W10 review remains separate.

## 27. Recommended future engineering split

After this review is merged, if implementation is needed before the first Production read:

### W09-BE1 — query-set and manifest contracts

Pure/default-off:
- query descriptors;
- row caps;
- manifest schema;
- candidate completeness states;
- query/result fingerprinting.

### W09-BE2 — read-only acquisition adapter

Default-off:
- requires explicit database URL parameter;
- must verify read-only transaction state;
- frozen SELECT-only query set;
- no generic implicit `DATABASE_URL` fallback;
- no provider/client runtime dependency;
- no persistence.

### W09-BE3 — offline translator

Pure:
- raw acquisition package -> W09-A `supplied_real_snapshot`;
- deterministic source fingerprints;
- no DB/network access.

### W09-BE4 — synthetic PostgreSQL certification

Ephemeral PostgreSQL only:
- reviewed schema fixtures;
- missing 0005/0006/0007 behavior;
- read-only transaction enforcement;
- query caps;
- ambiguity/integrity failures;
- zero DML/DDL.

### W09-BE5 — static safety certification

Prove:
- no provider adapter;
- no write SQL;
- no migration;
- no scheduler/worker route;
- no persistence;
- no W10 activation.

Engineering implementation does not authorize the real Production read.

## 28. Recommended real-run authorization shape

After W09-B engineering is separately merged/certified, a real run authorization should name:

- exact canonical Git SHA/tree;
- exact W09-B adapter SHA/version;
- exact W09-A version;
- exact Production project/environment/database;
- exact read-only role;
- query-set fingerprint;
- site/domain;
- maximum 25 final candidates;
- maximum 100 source opportunities scanned;
- exact transaction/time limits;
- no provider network access;
- no persistence;
- external evidence-package destination;
- explicit zero-write exclusions.

The authorization should stop after one bounded session.

No recurring schedule.

## 29. Provider-read addendum boundary

If the DB-only W09-B run is incomplete solely because no valid provider-authoritative before-state observation exists, a later review may define a **provider-read-only addendum**.

That addendum must separately specify:
- exact Shopify read endpoint/API operation;
- credential profile/scope;
- Product GID set;
- maximum item count;
- no mutation methods;
- request/response fingerprinting;
- rate limits;
- no storefront/public-site write;
- no persistence unless separately approved.

This document does not authorize that addendum.

## 30. Explicit non-authorization

This review authorizes no:

- Production database connection;
- Production SELECT;
- Production schema inspection;
- Production persistence;
- migration/schema change;
- Shopify/provider read;
- storefront/public-site read;
- provider/public-site write;
- W03–W07 materialization/mutation;
- Task #51/#53/#54 execution;
- scheduler/worker/startup activation;
- credential/scope/config/gate change;
- deployment/publication;
- recurring Stage 0 run;
- W10 activation.

## 31. Next explicit boundary

After this review/specification is merged and certified, the next safe default is:

**Implement W09-BE1 through W09-BE5 exactly as reviewed, using synthetic/ephemeral evidence only and no Production/provider access.**

Only after that engineering is merged/certified should a separately worded authorization permit one bounded W09-B Production read-only evidence run.

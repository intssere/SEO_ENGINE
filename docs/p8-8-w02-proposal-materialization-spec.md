# P8.8 W02 — P9.7 governed proposal materialization bridge specification

**Issue:** #410  
**Status:** SPECIFICATION / REVIEW ONLY — W02 IMPLEMENTATION BLOCKED

## Purpose

W02 defines the pure deterministic bridge between:

1. a certified P9.7 `proposal_review` recommendation;
2. its exact P6.6 changed preview;
3. an explicit, separately supplied Shopify Product target binding;

and a non-persisted governed-proposal materialization artifact that can be consumed later by W01 policy admission.

W02 does not create a persisted ProposalRecord, approval, policy authorization, executable action, provider request, or site mutation.

## Why a target-binding input is required

P9.7 binds recommendation lineage and the exact changed P6.6 preview fingerprints.

P6.6 binds changed fields and exact current/proposed values.

Neither P9.7 nor P6.6 carries the authoritative Shopify Product GID or canonical product URL.

W02 therefore must not infer a Product GID from a URL, infer a URL from a subject key, search Shopify, query a catalog, or derive provider identity heuristically.

Instead W02 requires a caller-supplied, independently sourced target-binding artifact whose identity is itself fingerprinted and becomes part of the governed proposal fingerprint.

Future W06 live preflight remains responsible for authoritative provider re-resolution and state re-read.

## W02 input contract

The future implementation should consume one object with four explicit components.

### A. P9.7 recommendation

Exact `RecommendationGenerationCandidate` from:

`p9-7-recommendation-generation-worker-v1`

Required:

- `recommendationClass === "proposal_review"`;
- `lifecycle === "proposed_review"`;
- `generation.mode === "deterministic_template"`;
- `generation.aiAssisted === false`;
- `generation.providerModel === null`;
- `generation.freeformGeneration === false`;
- `governanceHandoff.previewAvailable === true`;
- `governanceHandoff.changedPreviewAvailable === true`;
- `governanceHandoff.approvalRequired === true`;
- all proposal/approval/execution/public-write/automatic-transition/Task #51 handoff flags remain `false`;
- exact recommendation fingerprint and idempotency integrity must be rebuilt and verified rather than trusted blindly.

W02 must reject `advisory_review`.

### B. P6.6 preview report + selected preview

The bridge must receive enough certified upstream input to rebuild the canonical P6.6 report, not merely a detached preview object.

The selected preview must:

- belong to the exact P9.7 opportunity fingerprint;
- have a preview fingerprint listed in the recommendation's `changedPreviewFingerprints`;
- also appear in the recommendation's full `previewFingerprints`;
- bind the exact P9.7 actionability fingerprint;
- have `counts.changed === 1`;
- have exactly one changed field;
- have `fieldKey === "meta_description"`;
- have status `added`, `removed`, or `modified`;
- contain the exact current and proposed values;
- retain `applyAuthorized === false`;
- retain actionability `approvalGranted=false`, `executionAuthorized=false`, `automaticTransitionAuthorized=false`.

Unchanged previews are never materializable for W02.

Multiple changed fields fail closed even if one of them is `meta_description`.

Multiple candidate changed previews for the same recommendation fail closed unless the caller explicitly selects one exact preview fingerprint and that selection is unique after canonical rebuild.

### C. Product target binding

Because upstream P6/P9 artifacts do not carry provider identity, W02 requires this explicit caller-supplied structure:

- `siteId`;
- `domain`;
- `provider`;
- `resourceKind`;
- `resourceGid`;
- `targetUrl`;
- `actionType`;
- `field`;
- `requiredProviderScope`;
- `sourceSystem`;
- `sourceIdentity`;
- `sourceFingerprint`.

Initial W02 scope is fixed to:

- domain: `diamondshelf.us`;
- provider: `shopify`;
- resource kind: `product`;
- Shopify GID syntax: `gid://shopify/Product/<positive integer>`;
- URL: exact HTTPS `https://diamondshelf.us/products/<single-slug>`;
- action type: `update_meta_description`;
- field: `meta_description`;
- required provider scope label: `write_products`.

The target-binding source is caller-supplied provenance only.

W02 must not call that source, verify the provider live, or claim current Shopify state.

The target-binding fingerprint must bind every target/provenance field.

### D. Reference identity

The materialization input must include a canonical `referenceTime`.

It is descriptive identity only; it does not create policy validity or execution TTL.

Reference time must not precede the relevant P9.7/P6.6 reference horizon if those upstream artifacts expose one.

## Exact upstream lineage binding

The materialized artifact must bind at least:

- P9.7 recommendation ID;
- P9.7 recommendation fingerprint;
- P9.7 idempotency key;
- P9.7 idempotency fingerprint;
- P6 opportunity ID/fingerprint;
- P6 explanation ID/fingerprint;
- P6 actionability ID/fingerprint;
- P6 lifecycle ID/fingerprint;
- P6 lifecycle state;
- P6 score fingerprint/status;
- evidence fingerprints;
- missing-evidence list;
- P6.6 preview ID/fingerprint;
- preview key;
- changed field key/status;
- target-binding fingerprint.

The bridge must fail closed if any same-concept upstream identity disagrees across recommendation, rebuilt P6.6 report, selected preview, or target input.

## Before / after state materialization

W02 does not generate text.

It takes exactly:

- `beforeValue = selectedChangedField.currentValue`;
- `afterValue = selectedChangedField.proposedValue`.

No trimming, rewriting, HTML conversion, normalization, truncation, templating, AI generation, fallback copy, or default text is allowed.

The bridge must derive deterministic state fingerprints over a canonical state object that binds:

- provider;
- resource kind;
- Product GID;
- canonical URL;
- field;
- value.

Two distinct state fingerprints are required:

- `beforeFingerprint`;
- `afterFingerprint`.

If canonical before and after state fingerprints are equal, fail closed even if the upstream preview claimed a change.

## Governed proposal materialization artifact

The future pure W02 output should have a distinct version such as:

`p8-8-w02-governed-proposal-materialization-v1`

It should contain:

- deterministic `materializationId`;
- deterministic `materializationFingerprint`;
- deterministic `proposalFingerprint`;
- deterministic `proposalId` suitable only as in-memory identity;
- `proposalLifecycle = "materialized_unpersisted"`;
- exact recommendation identity;
- exact preview identity;
- exact upstream lineage;
- exact target binding;
- exact before/after values and fingerprints;
- explicit initial mutation class `shopify.product.seo.meta_description`;
- evidence fingerprints;
- missing evidence;
- deterministic generation marker;
- safety/semantics markers.

The output may use the term `proposalFingerprint` because W01 needs a governed proposal identity.

It must not claim that a durable database ProposalRecord exists.

## Idempotency contract

W02 needs a deterministic materialization idempotency fingerprint binding at minimum:

- W02 version;
- P9.7 recommendation idempotency fingerprint;
- P9.7 recommendation fingerprint;
- selected preview fingerprint;
- target-binding fingerprint;
- before fingerprint;
- after fingerprint.

Exact replay with identical canonical inputs must return the same materialization/proposal fingerprints.

Any conflicting reuse of the same upstream recommendation identity with a different preview, target, before state, or after state must fail closed rather than silently minting a second meaning.

W04 later handles durable reservation/idempotency before provider dispatch. W02 idempotency is pure artifact identity only.

## Mapping to W01

W02 should emit exactly the pure facts W01 needs for its candidate proposal/target layer:

- recommendation class = `proposal_review`;
- recommendation fingerprint;
- recommendation idempotency key;
- `lineageMaterialized=true`;
- `changedPreviewPresent=true`;
- `deterministic=true`;
- `aiAssisted=false`;
- `humanEditedAfterCertification=false`;
- lifecycle eligibility derived from exact certified upstream state;
- proposal generation method = `p9.7_deterministic_preview`;
- proposal fingerprint;
- bounded-pilot marker from the future caller/policy boundary, not invented by W02 unless an exact certified source exists;
- target provider/domain/resource/GID/URL/action/field/scope;
- before/after fingerprints.

W02 must not fill W01's live current-state fields:

- provider observed before fingerprint;
- prior deployment count;
- active-site-mutation count;
- cooldown status;
- mutation quota remaining;
- manual-intervention state;
- uncertain-write state;
- rollback-failure state;
- mutation-control state.

Those are separate inputs to W01 and later live preflight/control work.

## Evidence behavior

W02 preserves P9.7/P6 evidence lineage exactly.

It must:

- canonical-sort evidence fingerprints where upstream semantics treat them as a set;
- preserve missing-evidence entries;
- never fabricate an evidence ID;
- never convert a missing-evidence condition to success;
- never fetch or enrich evidence.

W01 remains responsible for deciding whether evidence is sufficient for policy admission.

## Lifecycle behavior

Initial W02 materialization is permitted only for lifecycle states that remain eligible for proposal review under the certified P9.7/P6.7 semantics.

Terminal, superseded, dismissed, deferred, or otherwise non-current lifecycle state must fail closed.

W02 must not reopen or transition lifecycle state.

## Fail-closed rejection matrix

The future implementation must reject at least:

- unsupported P9.7 version;
- recommendation fingerprint mismatch;
- idempotency fingerprint mismatch;
- `advisory_review`;
- non-deterministic/freeform/AI-assisted generation;
- any governance flag implying existing proposal persistence, approval, execution or public write;
- missing changed preview;
- selected preview not present in P9.7 changed-preview lineage;
- opportunity/actionability lineage mismatch;
- P6.6 integrity mismatch;
- zero changed fields;
- more than one changed field;
- changed field other than `meta_description`;
- unchanged selected field;
- before/after state equality after canonical fingerprinting;
- missing/invalid target binding;
- non-Shopify provider;
- non-Product resource;
- Collection GID or malformed Product GID;
- non-Diamond-Shelf domain;
- non-product URL;
- query/fragment/alternate-port/credential-bearing URL;
- action other than `update_meta_description`;
- field other than `meta_description`;
- scope other than `write_products`;
- target-binding fingerprint mismatch;
- conflicting replay identity;
- terminal/ineligible lifecycle.

## Pure capability markers

W02 implementation must expose capability markers proving:

- deterministic materialization only;
- caller-supplied target binding only;
- no target discovery;
- no AI/text generation;
- no DB read;
- no DB write;
- no persistence;
- no schema mutation;
- no provider/network read;
- no provider write;
- no public-site write;
- no ProposalRecord persistence;
- no approval creation;
- no policy authorization;
- no Task #51/#53/#54 execution;
- no policy activation;
- no scheduler/worker activation;
- no autonomous/live execution authorization;
- no credential/scope/config change;
- no deployment;
- no publication.

## Source-level implementation boundary

The future W02 source should be a pure library in `artifacts/api-server/src/lib/`.

It must not import:

- PostgreSQL/Drizzle/database modules;
- Express/router/server modules;
- provider SDK/HTTP/fetch transport;
- Task #51/#53/#54 apply/renewal/runtime modules;
- scheduler/worker dispatch modules;
- secret/config mutation modules.

It may import certified pure P6/P9 types/builders and Node crypto for deterministic hashing.

## Required regression coverage

Future W02 tests must prove at minimum:

1. exact deterministic materialization for one valid `proposal_review`;
2. exact replay returns identical fingerprints;
3. advisory review rejects;
4. tampered recommendation fingerprint rejects;
5. tampered P6.6 preview/report rejects;
6. selected preview not in recommendation changed lineage rejects;
7. zero/multiple changed fields reject;
8. non-`meta_description` field rejects;
9. no text transformation occurs;
10. before/after fingerprints bind exact value + target;
11. malformed/wrong Product target binding rejects;
12. Collection GID rejects;
13. target-binding fingerprint tamper rejects;
14. terminal/stale lifecycle rejects;
15. missing evidence is preserved, not fabricated;
16. no output flag claims persistence/approval/execution authority;
17. source-level no-DB/no-network/no-route/no-runtime-binding contract.

## W02 output is still not executable

Even after future W02 implementation:

- the proposal is in-memory/materialized only;
- no policy authorization exists;
- no durable reservation exists;
- no live current-state preflight exists;
- no provider mutation is possible.

W03 remains responsible for the separate policy-authorization artifact.

W04 remains responsible for durable reservation/idempotency persistence design.

W06/W07 remain responsible for policy-aware live preflight/apply.

## Non-authorization

This specification authorizes no:

- W02 implementation;
- ProposalRecord persistence;
- DB/schema/DDL/DML;
- provider/network request;
- Shopify/public-site mutation;
- policy authorization;
- Task #51/#53/#54 execution;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config change;
- deployment;
- publication;
- W03–W10.

## Next explicit authorization boundary

After this W02 specification is merged and certified, the next safe engineering action would be a separate explicit approval to implement the pure W02 bridge only.

That implementation authorization must keep persistence, provider/network access, authorization/execution, workers, schema, deployment, publication, and W03–W10 out of scope.

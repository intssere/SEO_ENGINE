# P8.8 W02 — pure governed proposal materialization bridge

**Issue:** #412  
**PR:** #413  
**Status on merge:** W02 engineering complete; W03–W10 remain separately gated.

## Scope

W02 implements only the pure deterministic bridge certified by the W02 specification.

Implementation:

- `artifacts/api-server/src/lib/p8-8-governed-proposal-materialization.ts`
- `artifacts/api-server/src/lib/p8-8-governed-proposal-materialization.test.ts`

The bridge has no route, startup hook, database adapter, provider client, persistence binding, scheduler, worker, Task #51/#53/#54 invocation, deployment hook, or publication behavior.

## Canonical upstream verification

W02 does not trust detached upstream artifacts.

Before materialization it:

1. re-runs the certified P9.7 recommendation-generation projection from caller-supplied canonical inputs;
2. locates exactly one recommendation with the supplied recommendation fingerprint;
3. requires exact canonical equality with the supplied recommendation;
4. re-runs the P6.6 preview-diff builder;
5. requires exact canonical equality with the supplied P6.6 report;
6. requires the selected preview fingerprint to appear in both the P9.7 preview lineage and changed-preview lineage;
7. requires exact opportunity/actionability identity agreement.

Tampered P6.6/P6.7/P9.7/control lineage therefore fails closed before materialization.

## Initial mutation class

W02 remains closed to:

`shopify.product.seo.meta_description`

Required target scope:

- domain: `diamondshelf.us`;
- provider: `shopify`;
- resource: exact Product GID `gid://shopify/Product/<positive integer>`;
- URL: exact `https://diamondshelf.us/products/<single-handle>`;
- action: `update_meta_description`;
- field: `meta_description`;
- provider scope label: `write_products`.

The target is caller-supplied provenance only. W02 does not discover a product, infer a GID, resolve Shopify, or claim live provider state.

## Target binding

`buildP88W02ProductTargetBinding` validates the exact initial scope and deterministically binds:

- site ID;
- domain;
- provider;
- resource kind;
- Product GID;
- product URL;
- action type;
- field;
- required provider scope;
- source system;
- source identity;
- source fingerprint.

The resulting `targetBindingFingerprint` is integrity-checked before materialization.

Changing any target/provenance field changes that fingerprint.

## Recommendation eligibility

Only canonical P9.7 `proposal_review` candidates can materialize.

W02 requires:

- lifecycle = `proposed_review`;
- deterministic-template generation;
- `aiAssisted=false`;
- no provider model;
- no freeform generation;
- preview and changed preview available;
- approval required by upstream governance semantics;
- no existing proposal persistence;
- no approval;
- no execution authorization;
- no public-site write;
- no automatic transition;
- no Task #51 authorization;
- lifecycle state = `observed` or `active`.

An `advisory_review` is rejected.

## Preview requirements

The selected canonical P6.6 preview must have exactly one field total and exactly one changed field.

That field must be:

`meta_description`

Allowed P6.6 change statuses are only:

- `added`;
- `removed`;
- `modified`.

`unchanged` is rejected.

Multiple fields are rejected even when one is `meta_description`.

The preview retains all existing non-authority markers:

- `approvalGranted=false`;
- `executionAuthorized=false`;
- `automaticTransitionAuthorized=false`;
- `applyAuthorized=false`.

## Exact before/after preservation

W02 performs no text generation or semantic normalization.

It copies:

- `before.value = P6.6 currentValue`;
- `after.value = P6.6 proposedValue`.

The exact string bytes, including leading/trailing spaces, remain unchanged.

No trim, rewrite, fallback, templating, AI generation, HTML conversion, truncation, or copy normalization occurs.

Before/after fingerprints bind:

- provider;
- resource kind;
- Product GID;
- target URL;
- field;
- exact value.

The same text on another product therefore has a different state fingerprint.

## Deterministic identities

W02 produces deterministic:

- target-binding fingerprint;
- before-state fingerprint;
- after-state fingerprint;
- materialization-idempotency fingerprint;
- governed proposal fingerprint/ID;
- materialization fingerprint/ID.

The materialization idempotency fingerprint binds:

- W02 version;
- P9.7 recommendation idempotency fingerprint;
- P9.7 recommendation fingerprint;
- selected preview fingerprint;
- target-binding fingerprint;
- before fingerprint;
- after fingerprint.

Exact replay returns identical identities.

`assertP88W02ReplayCompatible` fails closed when the same P9.7 recommendation idempotency identity is reused with a conflicting W02 materialization identity.

W04 remains responsible for future durable reservation/idempotency persistence.

## Output lifecycle

The W02 output is explicitly:

`proposalLifecycle = "materialized_unpersisted"`

The proposal ID is an in-memory deterministic identity only.

No durable ProposalRecord is claimed or created.

## W01 handoff facts

W02 exposes only the static materialized facts W01 can safely consume:

- recommendation class/fingerprint/idempotency key;
- lineage materialized = true;
- changed preview present = true;
- deterministic = true;
- AI-assisted = false;
- human-edited-after-certification = false;
- lifecycle eligible = true;
- generation method = `p9.7_deterministic_preview`;
- proposal fingerprint;
- whole-site coverage = false;
- exact target provider/domain/resource/GID/URL/action/field/scope;
- exact before/after fingerprints.

W02 intentionally does **not** populate:

- bounded-pilot authorization;
- provider-observed current state;
- prior deployment count;
- active-site mutation count;
- quota remaining;
- cooldown status;
- manual-intervention status;
- uncertain-write status;
- rollback-failure status;
- mutation-control state.

Those remain separate W01/W04/W05/W06 inputs and authorities.

## Evidence behavior

W02 preserves P9.7 evidence lineage exactly and canonical-sorts set-like evidence fingerprints.

It preserves missing-evidence entries and never fabricates, fetches, enriches, or upgrades evidence.

## Capability and authority boundary

W02 capability markers explicitly certify zero:

- database read/write;
- persistence;
- schema mutation;
- provider/network read;
- provider/public-site write;
- target discovery;
- AI/text generation;
- text rewrite;
- ProposalRecord persistence;
- approval creation;
- policy authorization;
- Task #51/#53/#54 execution;
- policy activation;
- scheduler/worker activation;
- autonomous/live execution authorization;
- credential/scope/config change;
- deployment;
- publication.

The output cannot enable `PUBLIC_SITE_WRITES_ENABLED`.

## Regression coverage

The W02 test matrix verifies:

- canonical deterministic proposal materialization;
- byte-for-byte before/after preservation;
- exact replay stability;
- target-binding fingerprint integrity;
- broader target-scope rejection;
- Collection GID rejection;
- noncanonical product URL rejection;
- advisory review rejection;
- P9.7 recommendation tamper rejection;
- P6.6 report tamper rejection;
- selected-preview lineage rejection;
- multiple-field rejection;
- non-`meta_description` rejection;
- target-bound before/after fingerprints;
- conflicting replay rejection;
- evidence preservation;
- absence of W01 live current-state fabrication;
- canonical/reference-time bounds;
- source-level no-DB/no-network/no-route/no-worker-dispatch/no-Task-runtime binding.

Engineering validation history:

- CI #716 exposed a synthetic-fixture score/evidence-lineage mistake before reaching W02 logic; the fixture was corrected only.
- CI #717 passed all runtime tests and exposed one TypeScript narrowing issue on the already-validated changed-field status.
- the type was narrowed explicitly without behavioral change;
- corrected code-only head `21e9aa50a7ad2826cea115e6c62a1037fcea79ef` passed CI #718 completely.

The final PR head after closeout documentation must still pass exact-head CI before merge.

## Next boundary

W02 does not authorize W03.

The next P8.8 work package is:

**W03 — provenance-distinct policy authorization artifact**

W03 requires a separate explicit authorization. W02 grants no authority for:

- policy authorization;
- approvals-row changes;
- DB/persistence/schema work;
- durable reservation;
- provider/network access;
- Task #51/#53/#54 execution;
- scheduler/worker/autonomous execution;
- credential/scope/config changes;
- deployment/publication;
- W03–W10.

# UGP-8.4C — Decay / Refresh Opportunity Integration

Version: `ugp-8-4c-decay-opportunity-integration-v1`

## Purpose

UGP-8.4C projects UGP-8.4 decay/refresh evidence onto the existing UGP-6.4 content-opportunity model.

It does not replace or mutate UGP-6.4. It creates a deterministic read-only projection that can prefer refresh over net-new creation when exact decay evidence is explicitly bound to an existing content opportunity.

## Inputs

The integration consumes:

- one integrity-verified `ContentOpportunityModelResult`
- zero or more integrity-verified UGP-8.4B `ContentDecayEvidenceAdapterResult` values

Each supplied decay adapter must:

- pass UGP-8.4B adapter integrity
- contain a valid UGP-8.4A assessment
- deterministically rebuild to the same UGP-8.4A assessment from its mapped input
- preserve page URL lineage across adapter, mapped input, and assessment
- carry a non-null `contentOpportunityFingerprint`
- bind to an opportunity that exists in the supplied UGP-6.4 model

Unknown opportunity bindings fail closed.

Duplicate adapter fingerprints, duplicate assessment fingerprints, and multiple decay assessments for the same opportunity/page in one projection run also fail closed.

## Projection policy

The existing UGP-6.4 action remains the default.

A bound UGP-8.4 `refresh_candidate` can alter the projection only through this precedence:

1. **Cannibalization guard**
   - `exact_query_collision_detected`
   - `topic_page_dispersion_detected`

   These preserve `consolidate_candidate`. A decay signal must not hide a multi-page competition problem.

2. **Business relevance guard**

   If business relevance is below the existing UGP-6.4 action threshold, the projection preserves `leave_alone`.

3. **Refresh precedence**

   Otherwise a bound `refresh_candidate` projects to `refresh_candidate`, even when the original opportunity action was `create_candidate`.

   When this changes an original `create_candidate`, the projection records:

   `createSuppressedByRefreshEvidence = true`

   and rationale:

   `duplicate_net_new_create_suppressed_for_existing_decay_bound_page`

4. **Non-refresh decay evidence**

   `watch`, `stable`, and `defer_insufficient_evidence` do not overwrite the original UGP-6.4 action.

## Why this is a projection instead of a mutation

UGP-6.4 is a deterministic snapshot of topic coverage, cannibalization, and business relevance.

UGP-8.4 introduces later temporal page-decay evidence.

Changing the original UGP-6.4 object would destroy that historical decision context. UGP-8.4C therefore retains both:

- `originalAction`
- `projectedAction`

along with exact fingerprints for the opportunity, decay assessments, and 8.4B adapters.

## Duplicate new-content prevention

A net-new create is suppressed only when a UGP-8.4B result carries an explicit, exact opportunity fingerprint binding and the corresponding UGP-8.4A assessment reaches `refresh_candidate`.

No fuzzy topic matching is performed in this increment.

This avoids:

- creating a second page for an opportunity already represented by a decaying page
- silently converting unrelated page decay into a topic-level refresh
- choosing among conflicting same-page assessments

## Cannibalization preservation

UGP-8.4C deliberately gives cannibalization precedence over refresh.

If UGP-6.4 already indicates exact-query collision or topic-page dispersion, the projected action remains consolidation review.

Decay evidence may still be retained in lineage and rationale, but it cannot downgrade the collision safeguard.

## Business relevance preservation

The integration reuses:

`UGP_CONTENT_OPPORTUNITY_MODEL_POLICY.minimumBusinessRelevanceForActionCandidate`

A low-business-relevance opportunity is not elevated to refresh solely because performance decay is observed.

## Determinism and lineage

Each per-opportunity projection records:

- opportunity ID
- opportunity fingerprint
- cluster fingerprint
- representative keyword
- original action
- projected action
- business relevance
- cannibalization state
- bound decay assessment fingerprints
- bound 8.4B adapter fingerprints
- bound page URLs
- decay classifications
- duplicate-create suppression flag
- rationale
- limitations
- deterministic projection fingerprint

The complete integration result also carries:

- UGP-6.4 opportunity model fingerprint
- deterministic summary counts
- deterministic integration fingerprint

## Safety semantics

UGP-8.4C is:

- deterministic
- read-only
- projection-only
- evidence-backed
- cannibalization-guard preserving
- business-relevance-guard preserving
- no authorization grant
- no publication authority
- no scheduling authority
- no execution authority
- no network operation
- no persistence
- no provider writes
- no public-site writes

## Test coverage

The bounded tests verify:

1. a bound refresh candidate suppresses an original net-new create
2. cannibalization preserves consolidation over refresh
3. low business relevance preserves leave-alone
4. watch evidence preserves the original action
5. null and unknown opportunity bindings fail closed
6. duplicate same-page bindings fail closed
7. deterministic output and tamper detection

## Explicit non-goals

UGP-8.4C does not:

- alter the persisted UGP-6.4 model
- perform fuzzy opportunity/page matching
- acquire GSC or DataForSEO evidence
- crawl or fetch pages
- persist assessments or projections
- enqueue work
- schedule refreshes
- create article drafts
- construct publication execution requests
- publish content
- write to providers or customer sites
- mutate databases, schemas, Railway, deployment, workers, or autonomous runtime

A later UGP-8.4D increment may bind projected refresh candidates into the UGP-8.3 planning/calendar pipeline while preserving the same no-execution boundary.

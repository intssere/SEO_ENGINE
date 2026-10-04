# UGP-8.4D — Refresh Planning / Calendar Integration

Version: `ugp-8-4d-refresh-planning-calendar-integration-v1`

## Status

IMPLEMENTATION CANDIDATE — REFRESH PLANNING + IMMUTABLE WORK SPEC ONLY / NO QUEUE MATERIALIZATION / NO EXECUTION

## Purpose

UGP-8.4D carries UGP-8.4C projected refresh decisions into a deterministic calendar-planning contract that reuses UGP-8.3 policy semantics without mutating the underlying UGP-6.4 opportunity model.

The integration exists because UGP-8.3A correctly derives action from the immutable UGP-6.4 opportunity, while UGP-8.4C deliberately keeps temporal decay evidence in a separate projection. Rewriting the UGP-6.4 opportunity to force a refresh action would break historical decision lineage.

UGP-8.4D therefore adds a refresh-specific planning bridge.

## Inputs

The refresh calendar consumes:

- one integrity-verified UGP-6.4 `ContentOpportunityModelResult`;
- one integrity-verified UGP-8.4C `DecayOpportunityIntegrationResult`;
- explicit candidate metadata:
  - opportunity fingerprint;
  - category;
  - bounded priority score;
  - canonical readiness fingerprint;
- the same policy dimensions used by UGP-8.3A:
  - articles per week;
  - allowed categories;
  - blackout dates;
  - review-required vs autopilot-policy mode;
- explicit start date;
- bounded week count.

The UGP-8.4C result must reference the exact supplied opportunity-model fingerprint and must contain one matching projection for every opportunity in that model.

## Refresh-only eligibility

Only UGP-8.4C projections whose:

`projectedAction === "refresh_candidate"`

may enter the refresh calendar.

Other projected actions are deferred with:

`projected_action_not_refresh`

No create, consolidation, leave-alone, or insufficient-evidence action is silently converted into refresh work.

## Existing-page lineage requirement

Every scheduled refresh must retain:

- exact opportunity fingerprint;
- exact UGP-8.4C projection fingerprint;
- one or more bound page URLs;
- one or more bound UGP-8.4 decay assessment fingerprints.

A projected refresh without existing-page lineage fails closed.

This prevents a refresh calendar slot from representing an ungrounded or net-new content action.

## Calendar policy reuse

UGP-8.4D deliberately mirrors UGP-8.3A calendar semantics:

- `articlesPerWeek` bounded to 1–7;
- planning horizon bounded to 1–26 weeks;
- customer category allowlist;
- blackout dates remove usable dates;
- candidates ordered by descending priority score;
- opportunity fingerprint used as deterministic tie-breaker;
- earliest available non-blackout date assigned within each week;
- overflow deferred with `capacity_exhausted`.

The integration does not reinterpret or broaden UGP-8.3 policy.

## Readiness bridge

Each candidate must carry a 64-hex readiness fingerprint.

This is intentionally compatible with the canonical UGP-8.3B readiness concept. UGP-8.4D does not treat possession of that fingerprint as proof that a complete draft and passing quality gate currently exist.

The immutable work specification therefore requires runtime revalidation of canonical article readiness before any future materialization or execution path.

A future consumer must verify that the readiness fingerprint still resolves to exact:

- UGP-7.4 draft lineage;
- UGP-7.5 passing quality-gate lineage;
- the same content-opportunity fingerprint.

## Publication operation

Every scheduled refresh records:

`requiredPublicationPlanOperation: "update"`

The immutable refresh work specification also fixes:

`operation: "update"`

A refresh must target existing content. A future publication-plan binding must therefore use an existing content target and an UGP-8.1 update plan.

UGP-8.4D does not construct or execute that publication plan.

## Immutable refresh work specification

Each scheduled refresh can be converted to a deterministic proposed work specification with work class:

`content_article_refresh`

The work spec preserves exact lineage for:

- UGP-6.4 opportunity model;
- UGP-8.4C integration;
- UGP-8.4C per-opportunity projection;
- UGP-8.4D calendar projection;
- UGP-8.4D calendar item;
- opportunity fingerprint;
- readiness fingerprint;
- bound decay assessment fingerprints;
- bound page URLs.

The work-spec identity is deterministic:

`rcws-<24 hex>`

derived from the full immutable work-spec fingerprint.

## Runtime requirements

A future UGP-11 materializer must independently enforce:

- canonical article-readiness revalidation;
- article draft + quality-gate lineage;
- UGP-8.1 publication-plan revalidation;
- publication plan operation must remain `update`;
- existing-content target required;
- customer policy recheck at claim/preflight;
- UGP-8.4C decay projection revalidation;
- explicit authorization before execution;
- transport materialization.

The work spec embeds neither an authorization reference nor an execution request.

## Review and autopilot policy

Exactly one policy mode is represented:

- review required; or
- autopilot policy selected.

As in UGP-8.3, autopilot is a policy preference only.

It does not grant:

- scheduler authority;
- publication authority;
- execution authority.

## Safety semantics

UGP-8.4D is:

- deterministic;
- planning-only;
- refresh-only;
- immutable at work-spec boundary;
- scheduler-ready in specification only;
- queue materialized: false;
- scheduler activated: false;
- authorization granted: false;
- publication authorized: false;
- execution authorized: false;
- network operation: false;
- persistence: false;
- provider writes: false;
- public-site writes: false.

## Test coverage

The bounded test suite verifies:

1. a UGP-8.4C projected refresh is scheduled with exact decay/readiness lineage;
2. non-refresh projected actions are deferred;
3. priority, blackout, and capacity behavior remains deterministic;
4. refresh work specs retain immutable lineage and no authority;
5. UGP-6.4 / UGP-8.4C lineage mismatch fails closed;
6. calendar and work-spec fingerprint tampering is detected.

## Explicit non-goals

UGP-8.4D does not:

- mutate UGP-6.4 opportunities;
- rewrite UGP-8.3A calendar items;
- claim that an opaque readiness fingerprint is itself sufficient authorization;
- generate or persist an article draft;
- run the quality gate;
- construct an authorization reference;
- construct an execution request;
- materialize a queue job;
- activate a scheduler;
- configure retry or dead-letter behavior;
- call a CMS/provider/Git host;
- publish content;
- perform database/schema/Railway/deployment/worker/autonomy mutation.

## UGP-11 boundary

UGP-11 may later consume the immutable refresh work spec for durable scheduling and transport. It must revalidate all frozen lineage and policy and independently obtain explicit execution authorization. Possession of an `rcws-` identifier is never authority.

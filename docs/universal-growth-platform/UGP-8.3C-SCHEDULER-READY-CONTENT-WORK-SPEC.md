# UGP-8.3C — Scheduler-ready immutable work specification

## Status
IMPLEMENTATION CANDIDATE — IMMUTABLE SPECIFICATION ONLY / NO QUEUE MATERIALIZATION / NO EXECUTION

## Purpose
UGP-8.3C converts one valid UGP-8.3B article/calendar binding into an immutable work specification that a future UGP-11 durable scheduler can consume.

It deliberately stops before transport, queue persistence, claim, authorization, or execution.

## Work identity
Each work specification contains exact lineage for:
- UGP-8.3A calendar projection;
- UGP-8.3A calendar item;
- UGP-8.3B article binding;
- content opportunity;
- canonical readiness fingerprint;
- UGP-7.4 draft ID/fingerprint;
- UGP-7.5 quality-gate ID/fingerprint;
- UGP-8.1 publication-plan fingerprint;
- publication target locator fingerprint.

The complete immutable identity is fingerprinted and receives a deterministic `cws-<24 hex>` work-spec ID.

## Work class and operation
The initial work class is:
- `content_article_change`.

The allowed operation is inherited from the UGP-8.3B action alignment:
- create candidate → `create`;
- refresh candidate → `update`.

UGP-8.3C does not create a public `publish` execution request.

## Schedule representation
UGP-8.3A currently establishes a calendar **date**, not a time zone or clock time.

UGP-8.3C therefore preserves timing exactly as:
- `kind: calendar_date`;
- exact `scheduledDate`.

It does not invent a time of day or timezone. A future UGP-11 materializer must resolve those from explicit customer/site scheduling policy.

## Review and autopilot policy
Exactly one policy mode must be selected:
- review required; or
- autopilot policy preference.

Autopilot remains a policy preference only. It does not embed authorization and does not grant publication/execution authority.

## Runtime requirements
Any future UGP-11 consumer must:
- revalidate the UGP-8.3B binding;
- revalidate the UGP-8.1 publication plan;
- recheck policy at claim/preflight;
- obtain explicit authorization before execution;
- materialize the work spec through a transport adapter.

The work spec contains:
- no authorization reference;
- no execute request.

## Explicit non-authority
UGP-8.3C records:
- lifecycle: `proposed`;
- queue materialized: false;
- scheduler activated: false;
- retry policy granted: false;
- dead-letter policy granted: false;
- publication authorized: false;
- execution authorized: false.

## Safety boundary
This increment performs no:
- queue insert;
- database persistence;
- scheduler activation;
- job claim;
- retry/dead-letter configuration;
- provider/CMS/Git/network call;
- authorization creation;
- execution request construction;
- public-site write;
- deployment/Railway/worker mutation.

## UGP-11 boundary
UGP-11 may later provide durable transport and schedule materialization for this immutable spec. That runtime must consume the spec and independently enforce policy/authorization; it must never treat possession of a work-spec fingerprint as authority.

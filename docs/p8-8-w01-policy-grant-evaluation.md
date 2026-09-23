# P8.8 W01 — pure policy grant/evaluation contracts

**Issue:** #408  
**PR:** #409  
**Status on merge:** W01 engineering complete; W02–W10 remain separately gated.

## Scope

W01 implements only the pure, deterministic policy-grant and policy-admission layer defined by the certified P8.8 specification.

Implementation:

- `artifacts/api-server/src/lib/p8-8-policy-grant-evaluation.ts`
- `artifacts/api-server/src/lib/p8-8-policy-grant-evaluation.test.ts`

There is no route, startup hook, database adapter, provider adapter, scheduler, worker, persistence binding, Task #51/#53/#54 invocation, deployment hook or publication behavior.

## Initial policy class

The code is deliberately closed to exactly:

`shopify.product.seo.meta_description`

Allowed policy scope:

- site domain: `diamondshelf.us`;
- provider: Shopify;
- resource kind: Product;
- action type: `update_meta_description`;
- field: `meta_description`;
- provider scope label: `write_products`;
- proposal generation method: `p9.7_deterministic_preview`;
- maximum effective risk: `low`.

The grant builder rejects attempts to broaden the initial class to collections, title mutation, `write_files`, another provider, another generation method, or a non-low maximum risk.

## Immutable grant contract

`buildP88PolicyGrant` validates and fingerprints an in-code grant containing:

- policy ID/version;
- site ID/domain;
- provider and credential-profile identity;
- exact allowed resource/action/field/scope;
- allowed proposal-generation method;
- minimum evidence and quality thresholds;
- concurrency limit;
- mutation quota/window;
- same-target cooldown;
- activation/expiry;
- revocation state;
- activation actor;
- policy stage;
- mutation-control binding.

Initial safeguards are intentionally fixed at or above the Stage-1 specification:

- minimum evidence references >= 2;
- minimum quality score >= 90;
- concurrency limit = 1;
- mutation quota = 1 action / 24 hours;
- same-target cooldown >= 336 hours (14 days).

The grant is deep-frozen after construction. Its deterministic SHA-256 fingerprint binds all material grant fields. `p88PolicyGrantIntegrityIssues` and `assertP88PolicyGrantIntegrity` fail closed on fingerprint or safety-marker tampering.

## Pure admission/rejection evaluation

`evaluateP88PolicyAdmission` consumes only caller-supplied grant/candidate/state evidence.

It performs no external re-read itself. W06 remains responsible for future policy-aware live preflight.

The evaluator deterministically binds:

- policy identity/fingerprint/stage;
- evaluation reference/expiry window;
- recommendation fingerprint and idempotency key;
- proposal fingerprint;
- canonical sorted evidence IDs and evidence-set fingerprint;
- quality result/fingerprint;
- risk result/fingerprint;
- exact target identity/fingerprint;
- supplied current-state/control snapshot fingerprint;
- decision and sorted rejection reasons;
- evaluation fingerprint/ID.

An `admit` result means **policy-layer admission only**. It is not approval, policy activation, execution authorization or provider-write permission.

## Fail-closed admission matrix

Admission is rejected on any of the following classes:

- policy not active, expired, revoked, or invalid evaluation TTL;
- mutation control not `running`;
- unresolved manual intervention;
- unresolved uncertain provider write;
- unresolved rollback failure;
- recommendation not `proposal_review`;
- missing materialized lineage or changed preview;
- nondeterministic, AI-assisted, post-certification-edited, or lifecycle-ineligible proposal;
- disallowed proposal-generation method;
- non-bounded or whole-site candidate;
- insufficient or missing evidence;
- quality status not pass, not approval eligible, score below grant threshold, blockers, or warnings;
- effective risk other than exactly `low`;
- wrong provider/domain/resource/GID/URL/action/field/scope;
- supplied provider-before fingerprint differing from the policy-bound before fingerprint;
- prior deployment;
- active site-mutation concurrency exhaustion;
- same-target cooldown violation;
- exhausted mutation quota.

Rejection reason ordering is deterministic.

## Scope validation

The target must be:

- exact Shopify Product GID form `gid://shopify/Product/<id>`;
- exact HTTPS `diamondshelf.us/products/<slug>` URL;
- no query, fragment, credentials or alternate port;
- exact `update_meta_description` / `meta_description` / `write_products` scope.

This is a pure syntactic/identity check, not a provider lookup.

## Safety markers

W01 capability markers explicitly certify that the library performs no:

- database read/write;
- persistence;
- schema mutation;
- provider/network read;
- provider/public-site write;
- approval-row creation;
- Task #51/#53/#54 execution;
- execution-authorization creation;
- policy activation;
- scheduler/worker activation;
- autonomous/live execution authorization;
- public-write-gate enablement;
- credential-scope mutation;
- deployment;
- publication.

The grant itself cannot enable `PUBLIC_SITE_WRITES_ENABLED`.

## Regression coverage

Tests cover:

- deterministic/frozen grants;
- fingerprint changes under material policy changes;
- broader mutation-scope rejection;
- weaker quality/concurrency/quota/cooldown rejection;
- fingerprint and safety-marker tamper detection;
- successful pure admission;
- evidence-order deterministic replay;
- activation/expiry/revocation/evaluation-TTL failures;
- pause/kill and unresolved side-effect closure;
- recommendation/proposal constraints;
- evidence/quality/risk constraints;
- unsupported Shopify target scope;
- stale provider-before state;
- prior deployment;
- concurrency/cooldown/quota exhaustion;
- shadow-stage non-executability;
- evaluation fingerprint binding;
- source-level prohibition on DB/network/route/runtime imports/bindings.

The first code-only implementation head passed canonical CI #706 before closeout documentation was added. The final PR head must still pass exact-head CI before merge.

## Boundary after W01

W01 does not implement W02.

The next possible work package is:

**W02 — P9.7 proposal materialization bridge**

W02 requires separate explicit authorization. It must remain deterministic, must not generate new text, must not persist proposals, and must not create execution authority unless a later separately authorized work package explicitly provides it.

W01 does not authorize Production schema work, policy persistence, provider/network access, Task #51/#53/#54 execution, policy activation, scheduler/worker/autonomous execution, credentials/scopes, deployment, publication, or W02–W10.

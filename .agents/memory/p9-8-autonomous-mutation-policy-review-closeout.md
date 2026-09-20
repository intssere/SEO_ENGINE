# P9.8 Autonomous Mutation Policy Engine Review Closeout

## Result

P9.8 architecture review is complete under issue #316 / PR #317.

**Implementation remains blocked.**

No autonomous mutation engine or live mutation behavior was implemented.

## Certified review baseline

- base SHA: `484eb0e90dfed3638c84ae2b92999a60e40cf77b`
- base tree: `128a61bf5526e61b0134017bbf7c56f0905f00a9`
- exact tested review head: `71e36898b0092765c9371a12dd77143cbdb7f30b`
- exact tested tree: `3e41fbffc9fb8e03edc303456531a72c8d66e13d`
- PR CI #554 / run `35502451078`: success
- review merge: `84944e49cdc2e8dee0dde3b2abb723daf7c5a535`
- review tree: `3e41fbffc9fb8e03edc303456531a72c8d66e13d`
- post-merge main CI #555 / run `35502566507`: success

Replit was Git-only exact-synced to the review merge/tree and passed:
- recursive workspace tests;
- full typecheck;
- full build;
- `git diff --check`.

Replit remained branch `main`, origin/main exact, ahead/behind `0/0`, clean, with zero tracked/untracked differences.

## Current mutation baseline

Existing certified execution remains:
- Shopify product/collection;
- SEO `title` and `meta_description`;
- isolated `write_products`;
- explicit human proposal approval;
- Task #51 bounded authorization;
- Task #53/#54 fresh preflight + exact confirmation;
- exact state binding;
- one active execution;
- independent provider/storefront verification;
- deterministic rollback/manual-intervention path.

P9.8 did not change that baseline.

## Selected future autonomous canary

The first future autonomous class is:

`shopify.product.seo.meta_description`

It was selected because it is a scalar, reversible SEO metadata field, does not alter URL/price/inventory/publication state, has lower blast radius than SEO title/collection-level metadata, already fits Task #53/#54 verification/rollback mechanics, and requires no new provider scope.

Everything else remains excluded from the initial canary.

## Provider scope check

Current Shopify Admin GraphQL documentation was rechecked on 2026-09-20.

- product/collection update paths require `write_products`;
- `fileUpdate` supports alt text and requires `write_files` or `write_themes`;
- file updates require ready-state file objects.

This preserves the P8.3 media-alt blocker.

## Autonomous policy principles

A future implementation must use a separately created immutable/versioned policy grant.

The worker cannot create, expand, renew or self-approve the grant.

The grant must bind exact site/provider/credential/action/resource/field/risk/evidence/quality/limits/cooldown/activation/expiry/revocation/control scope.

Material policy change requires a new version/fingerprint and new activation authorization.

## No approval/confirmation spoofing

Future policy authorization must remain distinct from human approval.

Do not:
- insert a fake human `approvals` row;
- invent a human actor;
- fabricate current Task #51 human confirmation;
- fabricate current Task #54 `APPLY_AND_VERIFY_TASK54` confirmation.

Future implementation requires distinct policy provenance and a separate policy-authorized execution namespace while retaining all existing safety gates.

## Required lineage

Initial autonomy may consume only exact P9.7 `proposal_review` lineage.

It needs a separately certified deterministic bridge to a governed proposal/action-plan representation.

P9.7 review candidates are not ProposalRecords and are not directly executable.

## Initial canary admission

Review proposes:
- product SEO meta description only;
- deterministic/non-AI proposal;
- no post-certification human edit;
- exact changed preview;
- no missing evidence;
- at least two persisted evidence refs;
- evidence sufficient;
- quality pass;
- quality score >=90;
- zero warnings/blockers;
- low effective execution risk;
- bounded pilot / no whole-site coverage;
- exact Product GID + product URL;
- exact provider stale-state pre-read match;
- no prior deployment;
- no other active site execution;
- no unresolved site-level manual intervention.

## Blast-radius proposal

Stage 0:
- shadow policy evaluation only;
- no writes.

Stage 1, only after separate implementation and live-activation authorization:
- one product-meta-description action per 24 hours/site;
- one active site mutation;
- one action per cycle;
- 14-day same-target/field cooldown;
- no batch;
- no catch-up;
- no second forward mutation.

Expansion requires a new policy version and separate authorization.

Review graduation threshold:
- at least 20 terminal canary actions;
- zero manual intervention;
- zero unresolved uncertainty;
- every rollback independently verified;
- every retained live change independently provider/storefront verified;
- no duplicate execution;
- no stale-state or policy-scope bypass;
- complete audit lineage.

## Side-effect-safe pause/drain/kill

Pause/drain/kill always block new forward mutation admission.

For work that may already have side effects:
- provider/storefront reconciliation remains required;
- a single deterministic rollback remains allowed as safety closure;
- kill does not roll back historical actions already terminal and independently verified before kill;
- an in-flight post-kill observed write defaults to restoration unless it was already terminal;
- uncertainty enters manual intervention and blocks further autonomous mutation.

Safety closure is not new mutation admission.

## Implementation blockers

P9.8 implementation remains blocked until separately scoped/certified work provides:
1. P9.7 → governed proposal materialization;
2. durable versioned policy grants;
3. policy authorization provenance distinct from human approval;
4. policy-aware Task #51 authorization;
5. policy-aware Task #54 execution namespace;
6. durable policy decision/idempotency reservation;
7. durable mutation control/kill bridge;
8. P8.4 verification-adapter certification;
9. P8.5 rollback/manual-intervention certification;
10. P8.6 audit ledger;
11. separately authorized persistence/schema/config changes;
12. separate implementation authorization;
13. later separate live activation authorization.

## Safety result

This review performed no:
- policy persistence or activation;
- approval or authorization creation/renewal;
- Task #51/#53/#54 preflight/execute/apply;
- provider request/write;
- public-site mutation;
- credential/scope change;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry/batch activation;
- environment/secret/config mutation;
- deployment;
- publication.

Production remains the separately certified Task #73 application release.

## Next safe boundary

**P10.1 — unified change timeline** is the next safe program boundary.

Generic continuation may build deterministic/read-only change-timeline architecture over existing supplied/persisted opportunity/proposal/action/deployment/verification/rollback/measurement lineage.

P10.1 does not authorize P9.8 implementation or live autonomous mutation.

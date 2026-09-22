# P8.5 — Deterministic Rollback and Manual-Intervention Workflows

## Purpose

P8.5 adds a pure, deterministic workflow/disposition layer on top of the certified P8.4 verification adapters and the existing Task #53/#54 rollback/reconciliation foundations.

The planner answers one question:

> Given authoritative forward verification evidence, a captured pre-change state, known write-occurrence certainty, and any supplied rollback evidence, what is the safest next disposition?

It does **not** execute rollback, persist state, call Shopify, contact the storefront, transition action records, start workers, or activate any runtime gate.

## Supported mutation classes

The workflow registry is deliberately identical to the P8.4 verification registry:

- Shopify product SEO `title`;
- Shopify product SEO `meta_description`;
- Shopify collection SEO `title`;
- Shopify collection SEO `meta_description`.

No media-alt/`write_files`, visible title/description HTML, handle, URL, price, inventory, publication, or theme mutation is added.

## Required inputs

The planner consumes only supplied deterministic evidence:

- exact P8.4 forward verification result/fingerprint;
- mutation class;
- Shopify resource identity;
- Diamond Shelf target URL;
- executable field;
- captured pre-change value/fingerprint;
- approved post-change value/fingerprint;
- public-write occurrence certainty: `none | confirmed | possible`;
- zero or one supplied rollback attempt;
- optional P8.4 rollback verification result against the exact pre-change state;
- optional execution/deployment/rollback/authorization lineage;
- whether bounded rollback verification evidence has been exhausted.

All state fingerprints are recomputed using the existing `executionStateFingerprint` contract.

## Dispositions

Exactly one disposition is produced.

### `no_rollback_needed`

Used when:

- the forward state is independently verified by both provider and storefront; or
- the forward verification is authoritatively failed but a public write definitively did not occur; or
- verification is temporarily unavailable but a public write definitively did not occur.

This disposition does not mean the broader business workflow succeeded; it only means rollback is not required.

### `rollback_ready`

Used only when:

- forward verification is authoritatively failed;
- a public write is confirmed;
- the captured pre-change state is present and fingerprint-valid;
- mutation class/resource/target/field lineage is exact;
- no rollback attempt has occurred;
- no write-outcome uncertainty remains.

`rollback_ready` is a planning disposition only. It grants no write authority and does not execute rollback.

### `rollback_verification_pending`

Used only when exactly one rollback mutation is known accepted/performed but authoritative independent restore verification is not yet available and bounded evidence has not been exhausted.

### `rollback_verified_closed`

Used only when exactly one rollback attempt exists and independent provider + storefront verification both match the exact pre-change fingerprint.

A mutation receipt, action status, deployment lifecycle value, or one-sided read can never produce this disposition.

### `manual_intervention_required`

Fail-closed terminal review state for any condition that cannot be safely closed deterministically, including:

- possible/uncertain public-write outcome;
- forward verification unavailable after a possible/confirmed write;
- unsupported mutation class;
- P8.4 result-integrity failure;
- corrupt/missing restore fingerprint;
- resource/target/field/lineage mismatch;
- rollback mutation rejection or uncertain outcome;
- duplicate/conflicting rollback attempts;
- rollback verification without a rollback attempt;
- rollback provider/storefront mismatch;
- rollback verification unavailable after bounded evidence is exhausted;
- any supplied state that conflicts with the original approved mutation.

## P8.4 integrity reuse

P8.5 adds a narrowly scoped P8.4 integrity helper that:

- recomputes the deterministic P8.4 result fingerprint;
- verifies registry/mutation-class binding;
- verifies adapter fingerprint;
- recomputes the expected-state fingerprint;
- requires canonical sorted failure categories;
- requires P8.4 no-side-effect markers to remain false;
- verifies that a `verified` result is internally consistent.

This does not change P8.4 verification behavior. It only allows later workflow layers to reject tampered or stale supplied results.

## Manual-intervention artifact

When manual intervention is required, the planner emits a deterministic bounded artifact containing:

- workflow version;
- mutation class;
- exact resource/target/field identity;
- supplied lineage identifiers/fingerprints;
- sorted reason codes;
- sorted required-evidence categories;
- whether a provider/public write may have occurred;
- rollback-attempt count;
- deterministic artifact fingerprint.

The artifact is descriptive only. It contains no credential, no provider secret, no executable command, and no authorization grant.

## No-side-effect invariants

Every workflow result explicitly states:

- `providerWritePerformed:false`;
- `rollbackWritePerformed:false`;
- `databaseMutationPerformed:false`;
- `automaticTransition:false`;
- `liveExecutionAuthorized:false`.

The capability report additionally states persistence and network access are disabled.

## Relationship to existing Task #53/#54 mechanics

Existing Task #53/#54 code already contains bounded rollback mutation, propagation re-verification, and post-rollback reconciliation paths.

P8.5 does not invoke those paths.

Instead, P8.5 provides the deterministic planning state machine that later P8.6 history/audit work and future separately authorized P8.7 live execution can consume.

Task #53/#54 provider-write confirmation, authorization, safety gates, rollback propagation, and reconciliation remain independently authoritative when/if live execution is separately authorized.

## Test boundary

The focused P8.5 suite is fully network-free and persistence-free. It covers:

- verified forward state;
- authoritative failure before any write;
- confirmed-write rollback readiness;
- unavailable/uncertain write outcomes;
- restore-state corruption;
- P8.4 result tampering;
- unsupported mutation classes;
- resource/field/target/lineage mismatch;
- rollback accepted/pending;
- rollback unavailable with bounded retry exhaustion;
- rollback verified closed;
- rollback provider/storefront disagreement;
- rollback rejected/uncertain;
- duplicate rollback attempts;
- rollback verification without an attempt;
- deterministic replay/fingerprints;
- no-side-effect markers.

## Deliberate boundary

P8.5 does not authorize or perform:

- provider/public-site writes;
- rollback mutation;
- Shopify/network requests;
- database persistence;
- action/plan/deployment transitions;
- Production/Development DB mutation;
- scheduler/worker/autonomous execution;
- OAuth scope/credential changes;
- deployment or publication.

P8.6 action history/audit ledger remains the next safe engineering boundary after P8.5 certification. P8.7/P8.8 remain separate live/policy authorization boundaries.

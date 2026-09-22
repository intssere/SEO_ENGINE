# P8.6 — Deterministic Action History and Audit Ledger

## Purpose

P8.6 adds a deterministic, tamper-evident, read-only action-history ledger over already-certified evidence models.

It does not create a second event database, add a persistence table, read Production, call a provider, execute an action, execute rollback, or infer success from chronology.

The implementation is:

`artifacts/api-server/src/lib/action-audit-ledger.ts`

## Source contracts

P8.6 reuses rather than replaces the existing evidence models.

### P10.1 unified change timeline

Caller-supplied timeline events are rebuilt through `buildUnifiedChangeTimeline`.

P8.6 never trusts a prebuilt P10.1 timeline blindly. Existing P10.1 rules therefore remain authoritative:

- exact source replay may collapse;
- conflicting replay fails closed;
- unknown values remain unknown/null;
- chronology does not create causality, attribution, risk, priority or execution authority.

Every P10.1 event admitted to a P8.6 action ledger must carry the exact requested `actionId`. Missing or foreign action lineage fails closed.

Where a timeline event directly supplies target facts, those facts must match the ledger action identity exactly:

- target URL;
- resource kind;
- resource ID;
- field;
- before fingerprint;
- after fingerprint.

Absent source facts remain absent; P8.6 does not fill them from neighboring events.

### P8.4 verification evidence

P8.6 verifies every supplied `VerificationAdapterResult` with the certified P8.4 integrity helper before projection.

The ledger preserves, without reinterpretation:

- mutation class;
- result fingerprint;
- `verified | failed | unavailable`;
- provider/storefront verification booleans;
- expected/provider/storefront fingerprints;
- sorted failure categories;
- existing provider request ID when present;
- P8.4 no-write/no-DB/no-auto-transition markers.

The verification expected fingerprint must be either the exact action before fingerprint or exact action after fingerprint. That permits both forward and rollback verification evidence while rejecting unrelated state.

### P8.5 rollback/manual-intervention evidence

P8.6 adds a narrow P8.5 integrity helper that recomputes:

- workflow registry binding;
- before/after fingerprints;
- canonical reason ordering;
- manual-intervention artifact integrity;
- bounded rollback-attempt invariants;
- all no-side-effect markers;
- final workflow result fingerprint.

P8.6 then preserves, without reinterpretation:

- workflow result fingerprint;
- disposition;
- public-write occurrence certainty;
- rollback attempt count/fingerprint;
- rollback verification fingerprint;
- sorted reason codes;
- manual-intervention artifact fingerprint and required evidence when present;
- explicit no-write/no-DB/no-auto-transition/no-live-execution markers.

P8.5 `rollback_verified_closed` remains descriptive evidence. P8.6 does not reinterpret it as permission to execute anything.

## Direct action binding

The ledger is action-specific.

Every source is bound to the same exact action:

- P10.1 events require direct `lineage.actionId`;
- P8.4 evidence envelopes require exact `actionId`;
- P8.5 evidence envelopes require exact `actionId`.

Timestamp proximity, shared target, plan ID, deployment ID, matching fingerprint or event order never substitutes for the explicit action ID.

## Replay and conflict handling

Source identity is class-scoped and includes source system/version/source ID.

For the same source identity:

- exact canonical replay collapses;
- differing canonical content is a hard `p86_source_replay_conflict`;
- later timestamps never win a conflict.

No “latest wins” policy exists.

## Deterministic ordering

After source integrity and replay handling, entries are ordered by:

1. canonical `occurredAt`;
2. fixed class precedence:
   - P10.1 timeline;
   - P8.4 verification;
   - P8.5 rollback workflow;
3. within-class deterministic precedence;
4. exact evidence fingerprint.

Ordering is serialization only. It does not create authority, causality, priority, approval, recommendation quality or inferred current state.

## Append-only hash chain

Every materialized ledger entry contains:

- P8.6 version;
- 1-based sequence;
- canonical timestamp;
- entry class/kind;
- source system/version/ID/fingerprint;
- directly supplied lineage;
- exact canonical action target;
- descriptive evidence projection;
- previous-entry fingerprint;
- entry fingerprint;
- entry ID derived from the entry fingerprint.

The first entry has `previousEntryFingerprint=null`. Every later entry references the immediately previous entry fingerprint.

The ledger records:

- first-entry fingerprint;
- final-entry fingerprint;
- deterministic summary counts;
- complete ordered entries;
- semantic and safety contracts;
- final ledger fingerprint;
- ledger ID derived from that fingerprint.

Changing, removing or reordering an entry without recomputing the complete chain is detected.

## Integrity verification

`actionAuditLedgerIntegrityIssues` independently recomputes:

- ledger identity validity;
- entry sequence;
- chain links;
- per-entry fingerprints and IDs;
- action and target consistency;
- first/final fingerprints;
- summary counts;
- final ledger fingerprint/ID;
- critical no-side-effect safety markers.

`assertActionAuditLedgerIntegrity` fails closed when any issue is present.

This is a deterministic tamper-evidence mechanism, not a cryptographic signature or external immutable timestamp service.

## Summary semantics

P8.6 exposes counts only, including:

- total entries;
- timeline entries;
- verification entries and status counts;
- rollback-workflow entries and disposition counts.

It does not compute or infer:

- current action state;
- execution success;
- approval state;
- action priority;
- recommendation quality;
- causal impact;
- whether a mutation should be performed.

## Bounds

The action ledger is capped at `4096` deduplicated entries.

The existing P10.1 event bound also remains in force for its source events.

Exceeding the P8.6 bound fails closed.

## Safety boundary

P8.6 capability explicitly reports no:

- database read;
- database write;
- schema mutation;
- ledger persistence;
- provider network read;
- provider write;
- public-site write;
- rollback write;
- proposal mutation;
- approval grant;
- execution authorization creation;
- Task #51/#53/#54 execution;
- automatic transition;
- scheduler activation;
- worker activation;
- autonomous execution;
- live execution;
- deployment;
- publication.

P8.6 is pure/default-off engineering.

## Test boundary

The deterministic suite covers:

- mixed P10.1 + P8.4 + P8.5 action history;
- input-order independence;
- exact replay collapse;
- conflicting replay rejection;
- missing/foreign action lineage rejection;
- target/resource/field/before/after conflict rejection;
- tampered P8.4 evidence rejection;
- tampered P8.5 evidence rejection;
- exact manual-intervention artifact preservation;
- rollback-verified closure preservation without authority inference;
- unavailable verification preservation;
- entry mutation/removal/reordering detection;
- deterministic replay/fingerprints;
- entry-limit enforcement;
- explicit no-side-effect capability assertions.

Tests use supplied/fake evidence only. No provider, storefront, database, scheduler, worker, deployment or publication activity is required.

## Deliberate next boundary

P8.7 remains the first persistent live low-risk action pilot.

P8.6 does not authorize P8.7, P8.8 or P12.6 completion. Those remain separately governed.


## Engineering certification

P8.6 is certified complete.

- issue: #399;
- PR: #400;
- exact tested head/tree: `d5ba916453f5c6700793c95718183fba2c16fdf8` / `1d27ee0fe64327d93c7bb438cdb4da37ac076ae2`;
- exact-head CI #698 / run `35747808402`: success;
- merge/tree: `57f5da59200b54ed12426f79b8977618bf212b08` / `1d27ee0fe64327d93c7bb438cdb4da37ac076ae2`;
- post-merge main CI #699 / run `35748504397`: success.

Canonical CI passed the legacy/core/auth/P3.6 schema lanes, P12.2 crawl-state migration/persistence checks, all current workspace packages, P11.10 synthetic scale, Chromium critical paths, typecheck and build.

Certification is engineering-only. No database/provider/runtime/deployment/publication activity occurred.

P8.7 remains the first persistent live low-risk action pilot and requires separate explicit authorization.

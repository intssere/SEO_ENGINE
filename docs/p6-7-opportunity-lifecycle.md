# P6.7 — Deterministic Opportunity Lifecycle/History v1

## Purpose

P6.7 adds an explicit deterministic lifecycle ledger to the certified P6 opportunity stack.

It records caller-supplied lifecycle history without inferring events from scores, rankings, actionability, preview differences, provider state or site state.

P6.7 is not persistence and is not execution.

## Exact lineage

P6.7 accepts:
- exact P6.6 preview/diff input;
- exact P6.6 preview/diff report;
- a caller-supplied history reference time;
- optional caller-supplied per-opportunity event histories.

Before lifecycle processing, P6.7 reconstructs P6.6 and requires complete canonical equality.

P6.6 reconstruction transitively preserves exact P6.5/P6.4/P6.3/P6.2/P6.1 lineage.

Lifecycle histories bind to exact current P6.5 opportunity and actionability fingerprints.

P6.6 preview coverage remains optional. A lifecycle record exists for every current certified actionability decision even if that opportunity has no preview.

## Neutral baseline: observed

Every current exact opportunity begins in `observed`.

`observed` means only:

> the opportunity exists in this certified snapshot and no lifecycle transition was supplied.

It does not mean:
- actively executing;
- approved;
- recommended;
- deployed;
- implemented;
- verified.

P6.7 does not infer another lifecycle state from P6.5 actionability.

## Caller-supplied event ledger

A history entry contains one or more explicit events.

Each event has:
- contiguous positive `sequence`, beginning at 1;
- exact canonical `occurredAt` timestamp;
- event `type`;
- optional normalized caller-owned `reasonCode`;
- `relatedOpportunityFingerprint` only for supersession.

Event array input order is irrelevant.

Events are canonicalized by sequence after sequence validity is checked.

Event timestamps must be nondecreasing by sequence.

## History reference time

The caller supplies `historyReferenceTime`.

It must:
- be a canonical timestamp;
- be at or after the P6.6 opportunity reference time.

Every lifecycle event must occur at or before that history reference time.

P6.7 uses no system clock or `Date.now()`.

This makes history replay deterministic.

## State machine

States:
- `observed`
- `active`
- `deferred`
- `dismissed`
- `closed`
- `superseded`

### activate

Allowed:
- observed → active
- deferred → active

This is the only way a deferred opportunity becomes active again.

### defer

Allowed:
- observed → deferred
- active → deferred

### dismiss

Allowed:
- observed → dismissed
- active → dismissed
- deferred → dismissed

### close

Allowed:
- observed → closed
- active → closed
- deferred → closed

`closed` is administrative lifecycle closure only.

It is not proof that:
- an SEO issue was fixed;
- a proposal was implemented;
- site state changed;
- verification passed.

### supersede

Allowed:
- observed → superseded
- active → superseded
- deferred → superseded

Supersession requires an explicit exact replacement opportunity fingerprint.

## Terminal states

These states are terminal in P6.7 v1:
- dismissed;
- closed;
- superseded.

No later event may reactivate that exact fingerprint.

If later evidence produces a new certified opportunity identity, it is tracked as that new fingerprint rather than silently reusing the terminal stale record.

This implements the architecture rule that stale opportunities remain history.

## Explicit supersession only

P6.7 never infers supersession from:
- same subject;
- same family or kind;
- shared evidence;
- score similarity;
- ranking changes;
- preview similarity;
- lexical similarity.

A supersession event must explicitly name another exact opportunity fingerprint in the same certified current P6.5 actionability collection.

The source may not supersede itself.

The complete supplied supersession graph must be acyclic.

Supersession does not copy or transfer:
- recommendation state;
- approval state;
- execution authorization;
- preview apply authorization.

## Reason codes

Reason codes are optional caller-owned governance/history labels.

When present they are:
- NFKC normalized;
- trimmed;
- lower-cased;
- syntax validated.

P6.7 assigns no hidden semantic meaning to reason-code text.

## Deterministic output

P6.7 emits one record for every exact current actionability decision.

Each record contains:
- opportunity ID/fingerprint;
- actionability ID/fingerprint and classification;
- zero or more associated P6.6 preview fingerprints;
- initial state;
- current state;
- terminal flag;
- canonical event history;
- deterministic event fingerprints;
- deterministic lifecycle fingerprint.

The report contains:
- P6.6 report fingerprint;
- opportunity reference time;
- history reference time;
- exact scope;
- per-state counts;
- event count;
- deterministic report fingerprint.

History input order does not change output identity.

## No hidden inference

P6.7 does not infer lifecycle events from:
- P6.2 score;
- P6.3 advisory rank or suppression;
- P6.4 explanation;
- P6.5 informational/recommend/approval/blocked classification;
- presence or absence of P6.6 preview;
- magnitude or type of P6.6 field differences.

Only explicit caller-supplied lifecycle events change state.

## Separation from execution and verification

Lifecycle labels are bookkeeping/history states.

P6.7 does not:
- grant approval;
- authorize execution;
- apply a preview;
- fetch current provider/site state;
- verify implementation;
- verify outcome;
- enqueue work;
- automatically transition an opportunity.

No lifecycle state should be interpreted as execution permission.

## Runtime and safety boundary

P6.7 is pure deterministic engineering only.

It adds no:
- route or OpenAPI change;
- provider request or credential use;
- AI/LLM request;
- current-site fetch;
- source admission or refresh-plan mutation;
- observation/evidence/score/priority/explanation/actionability/preview/lifecycle persistence;
- database read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic lifecycle transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

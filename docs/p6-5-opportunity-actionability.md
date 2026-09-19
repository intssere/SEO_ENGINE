# P6.5 — Deterministic Actionability Classifier v1

## Purpose

P6.5 classifies each exact P6.4 explanation item into one of four governance states:

- `informational`;
- `recommend`;
- `approval`;
- `blocked`.

The classifier is deterministic and default-off. It does not execute anything, grant approval, generate a proposed site change, persist actionability, invoke a provider/AI model, or automatically transition an item to another state.

## Exact P6.4 lineage

P6.5 accepts:

- the exact P6.4 explanation input;
- the exact P6.4 explanation report;
- explicit actionability policy entries.

Before classification, P6.5 reconstructs P6.4 and requires complete canonical equality with the supplied report.

P6.4 reconstruction continues to revalidate exact P6.3, P6.2 and P6.1 lineage.

P6.5 therefore does not classify a caller-tampered explanation derivative.

## Explicit policy coverage

Every P6.4 explanation item must have exactly one explicit policy entry containing:

- exact opportunity fingerprint;
- `recommendationAllowed`;
- `approvalRequired`;
- bounded `blockCodes`.

Missing policy coverage fails closed.

Unknown opportunity fingerprints fail closed.

Duplicate policy entries fail closed rather than selecting one.

This prevents implicit defaults from silently escalating an opportunity.

## Block codes

Block codes are caller-owned governance labels.

They are:

- NFKC normalized;
- trimmed;
- lower-cased;
- syntax validated;
- deduplicated;
- sorted;
- bounded to eight per opportunity.

P6.5 assigns no hidden business meaning to a block code.

Any explicit block code makes the current classification `blocked`.

## Classification precedence

P6.5 uses this exact precedence:

1. **blocked**
   - at least one explicit P6.5 block code exists; or
   - the exact inherited P6.3 decision is `suppressed`.
2. **approval**
   - not blocked; and
   - `approvalRequired=true`.
3. **recommend**
   - not blocked;
   - approval is not required; and
   - `recommendationAllowed=true`.
4. **informational**
   - none of the conditions above apply.

This precedence is part of the deterministic v1 contract.

## Blocked semantics

`blocked` is a current actionability classification.

It is not:

- deletion;
- permanent rejection;
- evidence removal;
- approval denial;
- an execution side effect.

P6.5 preserves both:

- explicit P6.5 block codes;
- inherited P6.3 suppression reasons.

An unresolved P6.3 equal-top conflict therefore remains blocked in P6.5. P6.5 does not invent a conflict winner.

## Approval semantics

`approval` means **human/governance approval is required before any future execution path**.

It does not mean:

- approval has been granted;
- an approver has acted;
- execution is authorized;
- an automatic transition may occur.

Every P6.5 decision explicitly reports:

- `approvalGranted: false`;
- `executionAuthorized: false`;
- `automaticTransitionAuthorized: false`.

If both `approvalRequired` and `recommendationAllowed` are true, `approval` wins.

## Recommend semantics

`recommend` means only that the explicit governance policy permits the opportunity to be presented as a recommendation.

It remains advisory.

It does not:

- create recommendation prose;
- grant approval;
- authorize execution;
- enqueue work;
- mutate a provider/site;
- transition automatically.

P6.4 remains the descriptive explanation layer; P6.5 adds only the actionability label.

## Informational semantics

`informational` means neither recommendation nor approval-required treatment is enabled by the explicit policy, and the opportunity is not blocked.

It carries no implicit escalation.

A later caller may supply a different explicit policy in a later classification context, but P6.5 v1 performs no transition itself.

## No score/rank/family inference

P6.5 does not infer actionability from:

- P6.2 score;
- P6.3 advisory rank;
- P6.3 equal-score serialization;
- opportunity family;
- opportunity kind;
- subject text;
- evidence kind;
- missing-evidence code;
- semantic-guard text.

A high-ranked item can remain informational.

A lower-ranked eligible item can be classified recommend if explicit governance allows it.

This keeps scoring/prioritization separate from execution governance.

## Determinism

P6.5 produces deterministic:

- normalized policy metadata;
- classification reasons;
- actionability decision fingerprints;
- report counts;
- report fingerprint.

Policy input order does not affect report identity.

Decision order follows the exact canonical P6.4 item order and does not create an additional preference.

## Separation from later milestones

P6.5 deliberately does not:

- produce current-vs-proposed implementation previews/diffs — P6.6;
- infer lifecycle/history/supersession — P6.7.

It also does not grant approval or perform any execution.

## Runtime and safety boundary

P6.5 is pure deterministic engineering only.

It adds no:

- route or OpenAPI change;
- provider request or credential use;
- AI/LLM request;
- source admission or refresh-plan mutation;
- observation/evidence/score/priority/explanation/actionability persistence;
- database read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

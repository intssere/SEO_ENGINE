# P6.6 — Deterministic Current-vs-Proposed Preview/Diff v1

## Purpose

P6.6 provides a deterministic, read-only comparison between an explicitly supplied current value and an explicitly supplied proposed value.

It is a preview layer only.

P6.6 does not:
- discover current site state;
- generate proposed content;
- decide that proposed content is better, valid or safe;
- grant approval;
- authorize apply;
- generate a patch/apply instruction;
- mutate any site/provider;
- persist preview state;
- execute or enqueue work.

## Exact P6.5 lineage

P6.6 accepts:
- exact P6.5 actionability input;
- exact P6.5 actionability report;
- zero or more explicitly supplied previews.

Before preview generation, P6.6 reconstructs P6.5 and requires complete canonical equality.

P6.5 reconstruction transitively preserves exact P6.4/P6.3/P6.2/P6.1 integrity.

Every supplied preview must bind to:
- exact opportunity fingerprint;
- exact actionability fingerprint.

Unknown opportunities or mismatched actionability fingerprints fail closed.

## Optional preview coverage

P6.6 does not require one preview per opportunity.

Only explicitly supplied previews are emitted.

An empty preview list is valid and deterministic.

This avoids inventing current/proposed state for opportunities where no preview data was supplied.

## Preview keys and fields

Each preview has:
- an opaque normalized `previewKey`;
- one or more fields.

Each field has:
- normalized `fieldKey`;
- exact caller-supplied `currentValue: string | null`;
- exact caller-supplied `proposedValue: string | null`.

Keys are NFKC-normalized, trimmed and lower-cased for deterministic identity.

Values are not trimmed, lower-cased, NFKC-normalized or semantically interpreted.

Therefore:
- `"Title"` and `" title "` are different values;
- empty string is different from `null`;
- no HTML/SEO/schema meaning is inferred from the text.

## Exact diff semantics

Each field receives exactly one status:

### unchanged

`currentValue === proposedValue`

This includes:
- equal non-null strings;
- `null → null`;
- empty string → empty string.

### added

`currentValue === null` and `proposedValue !== null`.

An empty proposed string is still non-null and therefore counts as added.

### removed

`currentValue !== null` and `proposedValue === null`.

An empty current string is still non-null and therefore counts as removed.

### modified

Both values are non-null and exact string equality fails.

P6.6 performs no fuzzy, whitespace-insensitive, case-insensitive, token, HTML, DOM or semantic diff.

## Duplicate handling

Within one opportunity:
- duplicate normalized preview keys fail closed.

Within one preview:
- duplicate normalized field keys fail closed.

P6.6 does not silently select one duplicate.

## Determinism

P6.6 deterministically produces:
- normalized preview/field keys;
- sorted fields;
- per-field status;
- per-preview counts;
- preview fingerprint;
- report-wide counts;
- report fingerprint.

Preview input order does not determine identity.

Output ordering follows exact P6.5 actionability decision order, then normalized preview key.

That order is serialization only, not execution order or preference.

## Actionability preservation

Every preview retains the exact P6.5:
- classification;
- reason codes;
- approval-granted state;
- execution-authorization state;
- automatic-transition state.

P6.6 does not modify actionability.

A preview may be inspected for:
- `informational`;
- `recommend`;
- `approval`;
- `blocked`.

Inspection does not imply that the proposed state can be applied.

Every preview explicitly reports `applyAuthorized: false`.

## Proposed-state safety semantics

A proposed value means only:

> this is the caller-supplied proposed value being compared with the caller-supplied current value.

It does not mean the proposed state:
- has been applied;
- is approved;
- is recommended merely because it exists;
- is superior;
- is safe;
- is technically valid;
- is compliant;
- is executable.

P6.6 generates no JSON Patch, shell command, SQL statement, provider command or site-mutation instruction.

## Bounds

P6.6 v1 bounds:
- preview entries: 256;
- fields per preview: 64;
- each current/proposed string: 8,192 characters;
- normalized keys: 96 characters under the canonical key grammar.

Bounds fail closed.

## Separation from P6.7

P6.6 compares one supplied current/proposed frame.

It does not infer:
- previous proposal history;
- opportunity lifecycle;
- supersession;
- acceptance/rejection history;
- implementation history;
- rollback history.

Those concerns remain P6.7.

## Runtime and safety boundary

P6.6 is pure deterministic engineering only.

It adds no:
- route or OpenAPI change;
- provider request or credential use;
- AI/LLM request;
- current-state network fetch;
- source admission or refresh-plan mutation;
- observation/evidence/score/priority/explanation/actionability/preview persistence;
- database read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic apply/transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

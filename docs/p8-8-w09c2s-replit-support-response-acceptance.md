# P8.8 W09-C2S — Replit support-response acceptance contract

**Issue:** #626
**Status:** OFFLINE DECISION CONTRACT — NO LIVE SIDE-R AUTHORITY
**Canonical parent:** `7bbfb280b181610151671113cd8ad24425d57148`
**Inputs:** W09-C2Q blob `91226f7d4997ad1b2032410e9cf2ae1838768fc0`; W09-C2N verifier blob `1144fabecc1a994336e4f52af53729f67fe84491`.

## 1. Purpose

Classify a future Replit support response deterministically without weakening the W09-C2Q 12-point acceptance gate or treating natural-language support prose as Production binding evidence.

A support response can certify that a producer mechanism is eligible for engineering integration. It cannot by itself produce a W09-C2N PASS, a W09-C2I Side-R PASS, or authority to open a Production database session.

## 2. Classification

Exactly one classification is retained:

- `ACCEPTABLE_MECHANISM` — Replit identifies a concrete authoritative mechanism whose documented semantics satisfy every mandatory producer requirement below.
- `CONDITIONAL_MECHANISM` — Replit identifies a concrete potentially qualifying mechanism, but one or more semantics required for certification remain unanswered or require a bounded adapter/continuity proof. This remains UNPROVED for Side R.
- `INSUFFICIENT_RESPONSE` — the response supplies no qualifying mechanism, relies on forbidden credential/application/operator paths, or cannot establish exact deployment→database binding. This remains UNPROVED for Side R.

No ranking, inference, or fallback from architectural facts is allowed.

## 3. Mandatory producer requirements

For `ACCEPTABLE_MECHANISM`, all twelve must be explicitly supported by the mechanism or its authoritative documentation:

1. Replit/platform authoritative provenance.
2. Exact repl/app ID and exact deployment ID are producer inputs or immutable selectors.
3. Exact deployment→Production database binding association is resolved by Replit/platform metadata.
4. No credential return path is required or exercised.
5. Output can be mapped through a closed allowlist to W09-C2N.
6. Binding revision/association semantics are immutable or freshness-bounded.
7. Missing/ambiguous identity fails closed.
8. Deployment change invalidates or changes the receipt/association.
9. No database/SQL session is required.
10. No provider/public-site mutation is required.
11. Provider identity is resolved by the producer, not supplied by the operator for echo.
12. Producer/API/version/provenance is auditable.

If any requirement is contradicted, classify `INSUFFICIENT_RESPONSE`. If none is contradicted but one or more are materially unanswered, classify `CONDITIONAL_MECHANISM`.

## 4. Identity mapping requirements

The mechanism must be capable of yielding, directly or through a deterministic secret-free adapter:

- `schemaVersion = p8-8-w09c2n-v1` (adapter-owned constant is allowed);
- `provenanceKind`;
- `provenanceAuthority`;
- `replId`;
- `deploymentId`;
- `deploymentStatus`;
- `publicUrl`;
- `bindingRevisionId`;
- `provider`;
- `providerProjectId`;
- `branchId`;
- `databaseName`;
- `endpointId`;
- `observedAt`;
- `timelineId`, OR a separately certifiable authoritative continuity identifier whose semantics prove exact lineage continuity including endpoint rotation.

A support response that says only “Production uses Neon” does not satisfy this section.

## 5. Credential non-observability

Immediate `INSUFFICIENT_RESPONSE` if the proposed path requires any caller/application/operator step to retrieve, inspect, print, log, copy, parse, redact, hash, fingerprint, encode, decode, or otherwise derive identity from:

- `DATABASE_URL`;
- a connection string;
- username/password;
- token/API key;
- Secrets;
- arbitrary environment maps;
- credential-bearing URLs/hostnames obtained from secret material;
- any derivative of the above.

A producer implemented inside Replit's authoritative control-plane boundary may internally resolve credentials only if credential material cannot cross the producer boundary and is not required as caller input/output.

## 6. Support prose is not evidence

Natural-language support text may establish documented semantics of a named producer mechanism. It MUST NOT be transformed into a binding attestation by manually copying resource IDs from prose into W09-C2N fields.

Even when support names our current database resources, those names remain non-live explanatory material unless returned by the certified producer for the exact deployment under a later one-shot authorization.

## 7. Decision matrix

### ACCEPTABLE_MECHANISM

Require:
- a named API/control-plane operation, supported trusted integration, or Replit-generated signed/immutable manifest;
- all twelve mandatory requirements PASS;
- credential non-observability PASS;
- exact deployment binding semantics PASS;
- complete W09-C2N identity mapping, including timeline or separately certifiable continuity semantics.

Result:
- producer mechanism may proceed to an offline adapter/provenance certification milestone;
- no live invocation yet;
- no C2N/C2I PASS yet.

### CONDITIONAL_MECHANISM

Use only when:
- a concrete Replit-authoritative mechanism is identified;
- no forbidden credential path is required;
- exact deployment binding appears intended;
- but one or more details such as response field names, binding revision semantics, freshness, failure behavior, timeline continuity, scopes, or credential-return guarantees remain unresolved.

Result:
- ask only the minimum follow-up questions needed to close those gaps;
- do not invoke the mechanism;
- Side R remains UNPROVED.

### INSUFFICIENT_RESPONSE

Use when response:
- points to Secrets/`DATABASE_URL` or connection parsing;
- provides only Agent/support/operator prose as resource identity;
- confirms only Neon architecture;
- offers only manually entered IDs;
- exposes only a database name without exact deployment association;
- proposes Neon-side lookup without Replit-side deployment association;
- requires application runtime/shell/process environment inspection;
- cannot exclude credential return;
- cannot bind exact deployment and binding revision;
- states no such qualifying capability exists.

Result:
- Side R remains UNPROVED;
- W09-C2I/W09-C2H remain blocked;
- do not perform Side N as a substitute.

## 8. Required retained evaluation record

Retain only:
- support response date/reference/ticket ID when available;
- named mechanism and official documentation reference;
- classification;
- twelve requirement verdicts: `PASS | UNANSWERED | CONTRADICTED`;
- credentialNonObservability: `PASS | UNANSWERED | CONTRADICTED`;
- identityMapping: `PASS | UNANSWERED | CONTRADICTED`;
- lineageContinuity: `PASS | UNANSWERED | CONTRADICTED`;
- concise gaps;
- next permitted offline step.

Do not retain credentials or credential derivatives.

## 9. State transition

`ACCEPTABLE_MECHANISM` permits only a new offline producer-adapter/provenance certification milestone. After that milestone is merged, a new one-shot live Side-R authorization packet may be proposed and must receive fresh explicit authorization.

`CONDITIONAL_MECHANISM` permits only bounded support follow-up/research under appropriate authorization.

`INSUFFICIENT_RESPONSE` creates no new live authority.

In every classification, W09-C2R Gate-C v2 remains ready but dormant until Side-R lineage and the other preflight gates are independently satisfied.

## 10. Explicit exclusions

This artifact performs no Replit support submission, Replit API invocation, Neon metadata lookup, Production DB session, SQL, DDL/DML/migration, Secrets/config inspection or change, deployment/publication, provider/public-site access, scheduler/worker activation, Stage 0, or live attestation.

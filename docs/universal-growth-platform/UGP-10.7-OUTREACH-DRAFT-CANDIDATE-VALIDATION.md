# UGP-10.7 — Provider-Neutral Outreach Draft Candidate Validation

Version: `ugp-10-7-outreach-draft-candidate-validation-v1`

## Purpose

UGP-10.7 validates a supplied outreach draft candidate against one exact frozen UGP-10.6 generation request.

It does not invoke a model or provider.

This stage exists to ensure that any future generated candidate is mechanically well-formed, bound to the exact approved request, recipient-free, plain-text, and restricted to the exact owned target URL before a later semantic quality gate is even considered.

## Inputs

UGP-10.7 consumes:

- one exact `AuthorityOutreachDraftGenerationRequest` from UGP-10.6;
- one supplied candidate containing:
  - exact request fingerprint;
  - subject;
  - body.

The request is integrity-checked before the candidate is evaluated.

## UGP-10.6 request integrity

The validator independently verifies:

- exact UGP-10.6 version;
- request ID format;
- request fingerprint;
- target-binding projection fingerprint;
- preparation fingerprint;
- workspace fingerprint;
- workspace-item fingerprint;
- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- approval-review fingerprint;
- optional target-binding/resource lineage;
- evidence fingerprints;
- same-site HTTPS target;
- exact output-shape constraints;
- exact safety constraints;
- deterministic request fingerprint;
- request ID derived from the fingerprint.

A tampered UGP-10.6 request is rejected before candidate validation.

## Candidate shape

A candidate must provide:

- the exact request fingerprint;
- non-empty trimmed subject;
- non-empty trimmed body;
- no disallowed control characters;
- subject <= 120 characters;
- body <= 3000 characters.

The candidate receives a deterministic:

- `candidateFingerprint`.

## Mechanical checks

UGP-10.7 performs four deterministic checks.

### 1. Request lineage

The candidate must bind the exact frozen UGP-10.6 request fingerprint.

### 2. Plain-text shape

HTML-like tags are blocked because UGP-10.6 requested plain text.

### 3. Recipient/contact material

The mechanical validator blocks detected:

- email addresses;
- `mailto:` links;
- `tel:` links.

UGP-10.6 is recipient-free, so a candidate may not introduce contact-address material that was absent from the request.

### 4. Target URL integrity

Every detected HTTP/HTTPS URL, if any, must equal the exact UGP-10.6 owned target URL.

A candidate may not introduce:

- a different owned URL;
- an external URL;
- an affiliate/payment destination;
- a tracking URL.

The validator does not require that a URL be repeated in the message; it only prevents substitution when a URL is present.

## Result

The result contains:

- exact request/prospect/opportunity/approval lineage;
- exact target URL;
- candidate fingerprint;
- subject/body;
- deterministic check records;
- blocking reasons;
- mechanical validation status.

Possible status values:

- `candidate_valid`;
- `candidate_blocked`.

`candidate_valid` means only that the deterministic mechanical checks passed.

It does **not** mean the draft is approved for sending.

## Why semantic policy is not falsely certified here

Some constraints cannot be proven reliably with deterministic substring checks, including:

- whether all factual claims are truly supported by evidence;
- whether relationship history was subtly invented;
- whether wording implies payment or reciprocal exchange indirectly;
- whether the message makes an unsupported ranking promise;
- whether tone is misleading, manipulative, spammy, or brand-damaging;
- whether the draft is contextually appropriate for the prospect.

UGP-10.7 therefore explicitly records:

- `semanticQualityGatePassed = false`;
- `requiresUGP108SemanticQualityGate = true`.

A later UGP-10.8 quality gate must handle semantic/brand/reputation checks before any draft can become human-send-review eligible.

## Safety semantics

UGP-10.7 guarantees:

- deterministic: true;
- evidence-bound request required: true;
- candidate validation only: true;
- provider-neutral: true;
- built-in network transport: false;
- recipient data accepted: false;
- contact discovery authorized/performed: false;
- model execution authorized: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- semantic quality gate passed: false;
- UGP-10.8 semantic quality gate required: true;
- human review before send required: true;
- outreach sending authorized/performed: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Static capability certification

The executed static test confirms that the UGP-10.7 implementation contains no:

- OpenAI/Anthropic/Gemini invocation primitives;
- `fetch`, Axios, Undici, or Got network transport;
- PostgreSQL/Drizzle/database runtime;
- environment credential resolution;
- timers/cron;
- worker threads;
- child-process execution.

## Explicitly out of scope

UGP-10.7 does not add:

- model/provider invocation;
- a provider adapter;
- provider credentials;
- live model output;
- contact discovery;
- recipient selection;
- email verification;
- persistent draft storage;
- a draft-generation endpoint;
- a customer draft editor;
- semantic quality approval;
- send approval;
- sending;
- follow-up scheduling;
- scheduler/worker activation;
- provider writes;
- public-site writes;
- Railway/staging/production changes.

## Next bounded increment

UGP-10.8 may introduce the **semantic outreach draft quality gate**.

That gate should remain separate from model generation and should decide whether a mechanically valid candidate is eligible for human send review.

Even a future UGP-10.8 pass must not itself authorize transmission; sending remains a separate later boundary.

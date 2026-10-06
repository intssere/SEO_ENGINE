# UGP-10.6 — Provider-Free Outreach Draft Generation Request

Version: `ugp-10-6-outreach-draft-generation-request-v1`

## Purpose

UGP-10.6 introduces the bounded request envelope that a future outreach-draft generator may consume.

It does **not** generate outreach text and does not call a model.

The purpose of this increment is to freeze the exact approved prospect, owned target, evidence lineage, output limits, and safety constraints before any provider adapter is ever authorized.

## Inputs

UGP-10.6 consumes the exact upstream UGP state:

- UGP-9.4 prospect qualification;
- UGP-10.1/10.3 human review history;
- UGP-10.4 draft-preparation projection;
- UGP-10.5 explicit owned-target binding where required;
- verified Universal Resource identities used by UGP-10.5.

The request builder reconstructs and integrity-checks both UGP-10.4 and UGP-10.5 projections before producing a generation request.

Opaque client-supplied precomputed projections are not trusted.

## Eligible states

A request is emitted only for:

- `draft_brief_ready_existing_target`; or
- `draft_brief_ready_bound_target`.

The following states remain non-generative:

- `target_binding_required`;
- `human_review_required`;
- `rejected`;
- `deferred`;
- `qualification_blocked`.

## Exact lineage carried into every request

Each generation request binds:

- UGP-10.6 request version;
- UGP-10.5 target-binding projection fingerprint;
- UGP-10.4 preparation fingerprint;
- workspace fingerprint;
- workspace-item fingerprint;
- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- exact approval-review fingerprint;
- optional target-binding fingerprint;
- optional verified resource-identity fingerprint;
- opportunity kind;
- controlled draft-purpose code;
- source domain;
- source URL when present;
- target domain;
- exact owned target URL;
- qualification score;
- evidence coverage;
- risk class;
- evidence fingerprints.

The request receives deterministic:

- `requestFingerprint`;
- `requestId`.

The complete projection receives deterministic:

- `projectionFingerprint`.

## Recipient-free by construction

UGP-10.6 contains no recipient identity, email address, contact record, mailbox, or person-discovery field.

The request contract intentionally separates:

**what may be drafted**

from:

**who may eventually receive it**.

Contact discovery remains a later independent authorization boundary.

## Requested output contract

The future generator is asked for exactly one plain-text message with:

- subject required;
- subject maximum 120 characters;
- body required;
- body maximum 3000 characters;
- one message only.

These limits define the future adapter output shape only.

No output is generated in UGP-10.6.

## Mandatory drafting constraints

Every request declares:

- factual claims must use only supplied evidence;
- relationship history must not be invented;
- recipient identity must not be invented;
- contact details must not be invented;
- private or unverified contact data must not be used;
- target URL must remain exact;
- payment for links must not be offered;
- reciprocal links must not be offered;
- ranking outcomes must not be promised;
- the message must not be represented as already sent;
- human review is required before any future send;
- sending is not authorized.

## Existing-target and bound-target behavior

### Existing evidence-bound target

When UGP-10.4 already had an exact owned target:

- the request preserves that target;
- `targetBindingFingerprint = null`;
- `resourceIdentityFingerprint = null`.

UGP-10.6 does not replace or reinterpret the target.

### UGP-10.5 human-bound target

When UGP-10.5 resolved a missing target:

- the request carries the exact binding fingerprint;
- the request carries the verified resource-identity fingerprint;
- the exact canonical target selected in UGP-10.5 is preserved.

## Human approval lineage

Both ready paths must carry the exact latest UGP-10 workspace review:

- decision: `approved_for_draft`;
- reason: `editorial_fit_confirmed`.

The deterministic review fingerprint is copied into the generation request.

A target binding never substitutes for prospect approval.

## HTTPS target requirement

UGP-10.6 fails closed unless the final owned target URL is:

- HTTPS;
- same target-domain hostname;
- free of credentials;
- free of query string;
- free of fragment.

This is stricter than merely having an upstream target string.

## Safety semantics

UGP-10.6 explicitly records:

- deterministic: true;
- evidence bound: true;
- request envelope only: true;
- recipient data included: false;
- contact discovery authorized/performed: false;
- outreach draft-text generation authorized/performed: false;
- model execution authorized: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- outreach sending authorized/performed: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Static capability certification

The executed static regression verifies that the UGP-10.6 implementation does not contain:

- OpenAI/Anthropic/Gemini invocation primitives;
- `fetch`, Axios, Undici, or Got transport;
- PostgreSQL/Drizzle/database runtime primitives;
- environment credential resolution;
- timers/cron;
- worker threads;
- child processes.

## Explicitly out of scope

UGP-10.6 does not add:

- an AI/model adapter;
- provider credentials;
- provider HTTP;
- generated subject lines;
- generated message bodies;
- generated personalization;
- contact discovery;
- email verification;
- mailbox access;
- persistent drafts;
- a draft mutation endpoint;
- a customer draft editor;
- sending;
- follow-up scheduling;
- scheduler/worker activation;
- public-site writes;
- Railway/staging/production changes.

## Next authorization boundary

The next UGP-10 stage may define a bounded **draft generator adapter/output validation contract** that consumes an exact UGP-10.6 request.

Actual live model/provider execution must remain separately gated and cannot be inferred from UGP-10.6 merge authorization.

Contact discovery and outreach sending remain separate later boundaries.

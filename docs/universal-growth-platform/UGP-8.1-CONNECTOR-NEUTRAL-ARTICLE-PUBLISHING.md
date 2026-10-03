# UGP-8.1 — Connector-neutral article publishing

## Status

IMPLEMENTATION CANDIDATE — PLANNING/PREVIEW CONTRACT ONLY / FAIL-CLOSED / NO LIVE WRITE AUTHORITY

## Purpose

UGP-8.1 begins the publishing layer without weakening the authority boundaries established by UGP-1 and UGP-7.

The roadmap requires normalized support for:

- create article;
- update article;
- publish article;
- preview;
- verify.

This implementation binds a passing UGP-7.5 article-quality gate to the universal connector mutation model. It intentionally stops before execution.

## Contract

Version:

`ugp-8-1-connector-neutral-article-publishing-v1`

The contract accepts:

- one integrity-checked UGP-7.4 draft;
- one integrity-checked UGP-7.5 quality gate for that exact draft;
- one universal connector descriptor;
- one article/blog-post resource locator;
- one requested operation: `create`, `update`, or `publish`;
- expected and proposed state fingerprints.

The operation maps to the existing universal capabilities:

- `create` → `create.article`;
- `update` → `update.article`;
- `publish` → `publish.article`.

The connector must also expose:

- `preview.change`;
- `verify.change`.

## Quality-gate boundary

UGP-8.1 fails closed unless:

- the UGP-7.5 gate is `pass`;
- `approvalEligible = true`;
- the gate is bound to the exact supplied draft;
- the UGP-7.4 draft is complete;
- article body and finishing assets exist.

A quality-gate pass is a prerequisite for a publication plan, but it is still not publication authorization.

## Connector-neutral artifact

The plan creates a normalized JSON artifact containing:

- draft identity/fingerprint;
- quality-gate identity/fingerprint;
- target topic;
- article body;
- title/meta description;
- schema plan;
- media plan;
- frozen provenance.

That artifact is bound into the existing `UniversalMutationIntent`.

No provider-specific payload is emitted at this layer.

Provider adapters remain responsible for mapping the normalized artifact to Shopify, WordPress, another CMS, or Git-backed Markdown/MDX.

## Preview and verification

Every plan includes:

- a universal preview request for the same mutation intent;
- an explicit post-execution verification requirement against the proposed state fingerprint.

The plan never treats a provider mutation receipt as verified publication.

## Authorization boundary

UGP-8.1 deliberately does **not** construct a `UniversalExecuteMutationRequest`.

The existing universal connector contract requires a separate `UniversalAuthorizationReference` before an execution request can be built.

Therefore this milestone cannot itself authorize or perform:

- CMS writes;
- public-site writes;
- Git writes;
- publication;
- credential use;
- network execution.

## Safety semantics

Every plan declares:

- deterministic: true;
- connectorNeutral: true;
- qualityGateRequired: true;
- previewRequiredBeforeExecution: true;
- verificationRequiredAfterExecution: true;
- authorizationReferenceRequiredForExecution: true;
- executionRequestConstructed: false;
- performsNetworkOperation: false;
- performsPersistence: false;
- publicationAuthorized: false;
- executionAuthorized: false;
- providerWrites: false;
- publicSiteWrites: false.

## Initial target classes

The roadmap names these initial publication targets:

1. Shopify blog;
2. WordPress;
3. one additional CMS;
4. Git-backed Markdown/MDX.

This PR establishes the shared contract they must all use.

It does not falsely certify write support for connectors that have only been read-certified. Provider-specific write adapters and live certification remain separate bounded follow-on work under UGP-8.1 and require explicit authorization before any live mutation.

## Tests

Synthetic tests certify:

- deterministic create/update/publish planning;
- exact UGP-7.5 quality-gate dependency;
- preview requirement;
- verification capability requirement;
- article/blog-post target restriction;
- no implicit execution/publication authority;
- tamper detection on the final plan fingerprint.

No test performs provider or public-site I/O.

## Follow-on work

The next bounded UGP-8.1 work after this contract is merged should certify provider-specific mapping adapters in this order while preserving the same authority boundary:

1. Shopify blog mapping;
2. WordPress mapping;
3. one additional CMS mapping;
4. Git-backed Markdown/MDX mapping.

Live write execution remains separately gated and is not implied by adapter certification.

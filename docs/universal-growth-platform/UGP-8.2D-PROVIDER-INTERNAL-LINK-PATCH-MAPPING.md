# UGP-8.2D — Provider-specific internal-link patch mapping/certification

## Status
IMPLEMENTATION CANDIDATE — MAPPING-ONLY / SYNTHETIC CERTIFICATION / NO EXECUTION

## Purpose
UGP-8.2D translates the connector-neutral UGP-8.2C internal-link mutation preview into exact provider-specific content update plans for:
- Shopify;
- WordPress;
- Webflow;
- Git-backed Markdown/MDX.

It does not execute those plans.

## Exact proposed-content requirement
8.2D deliberately does not invent content-rewriting heuristics. The caller supplies the complete proposed content body.

The mapper requires the proposed body to contain exactly one deterministic link markup instance derived from the 8.2C entry:
- HTML providers: `<a href="TARGET">ANCHOR</a>`;
- Git Markdown/MDX: `[ANCHOR](<TARGET>)`.

The full proposed content receives a deterministic fingerprint and the provider patch plan carries the exact 8.2C preview-entry fingerprint.

## Shopify
For article/blog-post sources:
- GraphQL operation: `articleUpdate`;
- variables: `{ id, article: { body } }`.

For page/landing-page sources:
- GraphQL operation: `pageUpdate`;
- variables: `{ id, page: { body } }`.

The mapping requires one of `write_content` or `write_online_store_pages`. No publication-state field is included.

## WordPress
For article/blog-post sources:
- `POST /wp-json/wp/v2/posts/{id}`;
- body: `{ content }`.

For page/landing-page sources:
- `POST /wp-json/wp/v2/pages/{id}`;
- body: `{ content }`.

No status/publication field is included.

## Webflow
The mapping requires exact collection ID, item ID, and body-field slug:
- `PATCH /v2/collections/{collection_id}/items/{item_id}`;
- body: `{ fieldData: { [bodyFieldSlug]: content } }`.

Reserved system fields `name` and `slug` cannot be selected as the body field.

## Git-backed Markdown/MDX
The proposed Markdown/MDX content is fingerprinted and passed into the existing controlled Git plan as exactly one file patch.

The existing Git contract continues to require:
- immutable base commit;
- expected existing blob SHA;
- non-default working branch;
- pull request;
- no direct default-branch write.

## Certification
The cross-provider certification requires exactly one mapping from each provider family:
- Git Markdown/MDX;
- Shopify;
- Webflow;
- WordPress.

Every mapping must retain:
- exact UGP-8.2C preview-entry lineage;
- deterministic proposed-content fingerprint;
- exact-link-markup validation;
- mapping-only semantics;
- no execution request;
- no network or credential use;
- no persistence;
- no provider or public-site write.

## Safety boundary
UGP-8.2D creates no `UniversalExecuteMutationRequest`, authorization reference, provider request, Git commit, pull request, CMS update, database mutation, deployment, scheduler action, worker action, or autonomous mutation.

## Current provider API basis
The mapping follows the already-adopted UGP-8.1 provider contracts. Shopify's current Admin GraphQL page update accepts partial page updates including `body`; WordPress REST pages/posts accept content updates; Webflow Data API v2 supports staged collection-item PATCH updates using `fieldData`. These semantics are used only to construct deterministic plans, never to call the providers.

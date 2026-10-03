# UGP-8.1 — Shopify blog article publishing mapping

## Status

IMPLEMENTATION CANDIDATE — MAPPING-ONLY / SYNTHETIC CERTIFICATION / NO LIVE SHOPIFY WRITE

## Purpose

This bounded UGP-8.1 increment maps the merged connector-neutral article publishing plan to Shopify blog article GraphQL semantics.

It does not execute Shopify requests.

## Provider basis

The mapping is based on Shopify Admin GraphQL article semantics:

- article creation uses `articleCreate`;
- article updates use `articleUpdate`;
- articles belong to a Shopify Blog;
- the write surface requires either `write_content` or `write_online_store_pages`;
- article publication state is represented on the article input.

The mapping pins the provider contract to Admin API version `2026-07`.

## Operation mapping

### create

Universal `create.article` maps to `articleCreate`.

The mapped create request includes:

- blog GID;
- title;
- body;
- author;
- optional handle;
- `isPublished: false`.

Create deliberately does not publish.

### update

Universal `update.article` maps to `articleUpdate`.

The mapped update request includes:

- exact article GID;
- blog GID;
- title;
- body;
- optional author;
- optional handle.

It deliberately omits publication state so an update cannot implicitly publish or unpublish an article.

### publish

Universal `publish.article` maps to `articleUpdate` with only:

- exact article GID;
- `isPublished: true`.

The publish mapping rejects author/handle changes and does not rewrite the article body.

## Identity constraints

- blog IDs must be canonical Shopify `gid://shopify/Blog/<id>`;
- existing article IDs must be canonical `gid://shopify/Article/<id>`;
- update/publish article identity must match an Article GID already bound to the universal target when present;
- create rejects an existing article ID.

## Source-plan constraints

The adapter accepts only an integrity-checked merged UGP-8.1 `ArticlePublicationPlan` whose provider is Shopify.

The source plan must continue to declare:

- no execution authorization;
- no publication authorization;
- no provider writes;
- no public-site writes.

## Scope contract

The mapping records that Shopify accepts either:

- `write_content`; or
- `write_online_store_pages`.

The mapping itself never resolves, reads, or uses credentials.

## Safety semantics

Every mapping permanently declares:

- mappingOnly = true;
- deterministic = true;
- performsNetworkOperation = false;
- performsPersistence = false;
- usesCredentials = false;
- executionAuthorized = false;
- providerWrites = false;
- publicSiteWrites = false.

It emits no `UniversalExecuteMutationRequest`.

## Verification lineage

The mapping preserves the exact proposed-state fingerprint from the connector-neutral plan as the expected post-execution verification state.

A future live Shopify executor must still:

1. obtain a separately valid execution authorization;
2. satisfy Shopify write scope;
3. dispatch the mapped operation;
4. receive a provider receipt;
5. verify the resulting state;
6. fail closed on mismatch or unavailable verification.

## Tests

Synthetic certification verifies:

- create maps to unpublished `articleCreate`;
- update preserves publication state;
- publish maps to publication-only `articleUpdate`;
- create requires author identity;
- update/publish enforce exact article identity;
- publish rejects content-mutation fields;
- final mapping fingerprints are tamper-evident.

No test performs Shopify I/O.

## Explicit exclusions

This increment does not:

- call Shopify;
- resolve credentials;
- enable Shopify write scopes;
- alter the existing Task #53 Shopify production pilot;
- alter production gates;
- persist mapping state;
- deploy;
- change Railway;
- activate scheduler/worker/autonomous publishing.

After this mapping is merged, the next bounded UGP-8.1 provider mapping target is WordPress.

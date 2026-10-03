# UGP-8.1 — WordPress article publishing mapping

## Status

IMPLEMENTATION CANDIDATE — MAPPING-ONLY / SYNTHETIC CERTIFICATION / NO LIVE WORDPRESS WRITE

## Purpose

This bounded UGP-8.1 increment maps the merged connector-neutral article publication plan to WordPress core REST API post semantics.

It does not execute WordPress requests and does not alter the existing UGP-4.5 read-only WordPress certification path.

## Provider basis

The WordPress core REST API exposes posts at `/wp/v2/posts`.

Core documented write semantics used here are:

- create a post with `POST /wp/v2/posts`;
- update an existing post with `POST /wp/v2/posts/<id>`;
- `title`, `content`, `slug`, and `status` are writable fields;
- `status` accepts values including `draft` and `publish`;
- authenticated authorization is evaluated by the WordPress site when an execution request is made.

## Operation mapping

### create

Universal `create.article` maps to:

`POST /wp-json/wp/v2/posts`

with:

- title;
- content;
- optional slug;
- `status: "draft"`.

Create deliberately does not publish.

### update

Universal `update.article` maps to:

`POST /wp-json/wp/v2/posts/<id>`

with:

- title;
- content;
- optional slug.

The mapping deliberately omits `status`, so ordinary content update cannot implicitly publish or unpublish the post.

### publish

Universal `publish.article` maps to:

`POST /wp-json/wp/v2/posts/<id>`

with only:

`{ "status": "publish" }`

The publish mapping rejects slug/content mutation fields.

## Identity constraints

- existing WordPress post IDs must be positive safe integers;
- if the universal target already carries a numeric external ID, it must equal the mapped post ID;
- create rejects an existing post ID.

## Core-field loss transparency

The connector-neutral article artifact contains fields that WordPress core does not provide as direct generic article fields:

- `metaDescription`;
- `schemaPlan`;
- `mediaPlan`.

This adapter does not silently pretend they were applied. It records them in `deferredCoreUnsupportedFields`.

Future plugin-specific adapters may map those fields only after separate capability discovery and certification.

## Authority boundary

The mapping records that authenticated execution will be required and that provider-side authorization must be evaluated at execution time.

The mapping itself:

- does not resolve credentials;
- does not authenticate;
- does not call WordPress;
- does not grant WordPress permissions;
- does not construct a universal execute request.

## Safety semantics

Every mapping permanently declares:

- mappingOnly = true;
- deterministic = true;
- createCreatesDraftOnly = true;
- updatePreservesPublicationState = true;
- publishChangesStatusOnly = true;
- performsNetworkOperation = false;
- performsPersistence = false;
- usesCredentials = false;
- executionAuthorized = false;
- providerWrites = false;
- publicSiteWrites = false.

## Verification lineage

The adapter preserves the exact proposed-state fingerprint from the connector-neutral plan as the expected post-execution verification state.

A future live WordPress executor must still:

1. obtain an explicit SEO ENGINE execution authorization;
2. resolve an approved site-scoped authentication mechanism;
3. verify provider authorization for the requested operation;
4. execute only the mapped request;
5. capture a provider receipt;
6. read back and verify resulting state;
7. fail closed on mismatch, uncertainty, or unavailable verification.

## Synthetic certification

Tests prove:

- create produces draft-only creation;
- update omits publication state;
- publish changes status only;
- create rejects existing post identity;
- update/publish enforce exact post identity;
- publish rejects content-mutation fields;
- unsupported core fields are explicit rather than silently dropped;
- mapping fingerprints are tamper-evident.

No test performs WordPress I/O.

## Explicit exclusions

This increment does not:

- call WordPress;
- use credentials;
- expand OAuth/application-password scope;
- alter UGP-4.5 read-only behavior;
- persist mapping state;
- change Production DB/schema;
- deploy;
- change Railway;
- activate scheduler/worker/autonomous publication.

After this mapping is merged, the next bounded UGP-8.1 provider target is the additional CMS mapping.

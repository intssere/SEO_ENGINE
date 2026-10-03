# UGP-8.1 — Webflow article publishing mapping

## Status

IMPLEMENTATION CANDIDATE — MAPPING-ONLY / SYNTHETIC CERTIFICATION / NO LIVE WEBFLOW WRITE

## Purpose

This bounded UGP-8.1 increment maps the merged connector-neutral article publication plan to Webflow Data API v2 CMS item operations.

It does not execute Webflow requests and does not alter the existing UGP-4.6 read-only Webflow certification path.

## Current provider basis

The maintained Webflow CMS Data API separates staged content from publication.

For new integrations:

- create staged CMS items with `POST /v2/collections/{collection_id}/items/insert`;
- update a staged item with `PATCH /v2/collections/{collection_id}/items/{item_id}`;
- publish staged items with `POST /v2/collections/{collection_id}/items/publish`;
- write operations require provider scope `cms:write`.

Webflow collection fields are schema-defined by the site owner. This adapter therefore requires an explicit `bodyFieldSlug` instead of inventing a universal Webflow content field.

## Operation mapping

### create

Universal `create.article` maps to:

`POST /v2/collections/{collection_id}/items/insert`

with one staged item containing:

- `isDraft: true`;
- built-in `name` from article title;
- required item `slug`;
- the exact configured `bodyFieldSlug` containing article HTML.

Creation never uses the live endpoint and never publishes.

### update

Universal `update.article` maps to:

`PATCH /v2/collections/{collection_id}/items/{item_id}`

with only staged `fieldData`:

- `name`;
- optional `slug`;
- configured body field.

The mapping does not use Webflow's live update endpoint and does not include a publication operation.

### publish

Universal `publish.article` maps to:

`POST /v2/collections/{collection_id}/items/publish`

with:

`{ "itemIds": ["<item_id>"] }`

Publication does not rewrite article content.

## Identity constraints

- collection IDs and item IDs must be exact 24-character lowercase hexadecimal Webflow object IDs;
- create rejects an existing item ID;
- update/publish require an item ID;
- if the universal target already carries a Webflow object ID, it must match the mapped item ID exactly.

## Schema binding

Webflow CMS field names are collection-specific.

The mapping therefore requires an explicit safe `bodyFieldSlug`.

The system-reserved `name` and `slug` fields cannot be repurposed as the body field.

A future execution layer must obtain this binding from certified collection-schema evidence; the mapping does not discover or guess it.

## Deferred fields

The connector-neutral article artifact also carries:

- `metaDescription`;
- `schemaPlan`;
- `mediaPlan`.

Those are recorded as deferred rather than silently represented as applied.

Any future mapping of those fields requires separately certified Webflow collection or page capabilities.

## Authority boundary

This adapter:

- does not resolve OAuth/token material;
- does not authenticate;
- does not call Webflow;
- does not grant `cms:write`;
- does not construct a universal execute request;
- does not publish.

A future executor must separately validate site/connection scope, provider token scope, collection schema, execution authorization and verification lineage.

## Safety semantics

Every mapping declares:

- mappingOnly = true;
- deterministic = true;
- connectorProvider = webflow;
- createUsesStagedDraftEndpoint = true;
- updateUsesStagedEndpoint = true;
- publishUsesDedicatedPublishEndpoint = true;
- performsNetworkOperation = false;
- performsPersistence = false;
- usesCredentials = false;
- executionAuthorized = false;
- providerWrites = false;
- publicSiteWrites = false.

## Verification lineage

The exact proposed-state fingerprint from the connector-neutral publication plan remains the expected verification state.

A future live Webflow executor must:

1. obtain explicit SEO ENGINE execution authorization;
2. bind the exact certified Webflow site and collection;
3. obtain the certified collection schema and body-field mapping;
4. verify `cms:write` authority;
5. execute only the mapped request;
6. capture a provider receipt;
7. read back staged/live state as appropriate;
8. verify the expected state fingerprint;
9. fail closed on mismatch or uncertainty.

## Synthetic certification

Tests prove:

- create uses staged draft insertion;
- update uses staged single-item PATCH;
- publish uses the dedicated publish endpoint;
- create/update/publish enforce exact collection/item identity;
- publish rejects content mutation fields;
- body-field schema binding is explicit and fail closed;
- unsupported article fields remain visible as deferred;
- mapping fingerprints are deterministic and tamper-evident.

No test performs Webflow I/O.

## Explicit exclusions

This increment does not:

- call Webflow;
- use OAuth/token credentials;
- change provider scopes;
- mutate UGP-4.6 read-only certification code;
- persist state;
- change Production DB/schema;
- deploy;
- change Railway;
- activate scheduler/worker/autonomous publication.

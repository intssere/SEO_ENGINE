# P8.8 W04 — durable reservation/idempotency engineering closeout

**Issue:** #420  
**PR:** #422  
**Status on merge:** W04 E1–E5 engineering complete; Production DDL/DML and W05–W10 remain separately gated.

## Implemented scope

W04 implements the certified durable reservation/idempotency engineering boundary without activating it in Production.

Engineering files:

- `artifacts/api-server/src/lib/p8-8-reservation-intent.ts`
- `artifacts/api-server/src/lib/p8-8-reservation-intent.test.ts`
- `artifacts/api-server/src/lib/p8-8-reservation-store.ts`
- `artifacts/api-server/src/lib/p8-8-reservation-store.ephemeral.test.ts`
- `artifacts/api-server/src/lib/p8-8-w04-test-fixture.ts`
- `lib/db/migrations/0005_p8_8_policy_mutation_reservations.sql`
- `lib/db/src/p8-8-w04-reservation-migration.test.ts`

CI wiring uses only:

`P8_8_W04_EPHEMERAL_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/seo_engine_test`

There is no generic `DATABASE_URL` fallback in the W04 store or W04 migration/concurrency tests.

## E1 — pure reservation-intent projection

W04 projects one deterministic reservation identity from exact canonical W01 + W02 lineage.

The reservation fingerprint binds:

- policy class/site;
- policy ID/version/fingerprint;
- W01 evaluation ID/fingerprint;
- W02 materialization ID/fingerprint/idempotency fingerprint;
- proposal ID/fingerprint;
- recommendation fingerprint/idempotency key;
- target-binding fingerprint;
- provider/domain/resource/Product GID/URL/action/field/provider scope;
- before/after fingerprints.

The deterministic reservation ID is derived from that fingerprint.

Exact replay is stable. Any material lineage change changes the reservation fingerprint.

## W03 precommit binding

W03 v1 remains unchanged.

W04 requires the W03 synthetic/non-durable reservation descriptor to precommit exactly the W04-projected:

- reservation ID;
- reservation fingerprint.

Before durable materialization W04 canonically rebuilds W03 and validates its descriptor integrity.

An arbitrary caller-selected W03 reservation identity is rejected.

## E2 — migration/schema contract

Migration:

`0005_p8_8_policy_mutation_reservations.sql`

adds exactly one table:

`policy_mutation_reservations`

The migration is additive and transactional.

It stores bounded identities/fingerprints only and does not store:

- raw proposal text;
- raw provider request/response payloads;
- OAuth/API credentials;
- human approval payloads.

The first schema is closed by CHECK constraints to:

- `shopify.product.seo.meta_description`;
- Shopify;
- `diamondshelf.us`;
- Product GID;
- exact Diamond Shelf `/products/<handle>` URL shape;
- `update_meta_description`;
- `meta_description`;
- `write_products`;
- lowercase 64-hex fingerprints;
- before != after;
- expires > authorized.

Supported lifecycle:

- `authorized`;
- `claimed`;
- `consumed`;
- `released`;
- `expired`;
- `manual_intervention`.

Database partial unique indexes enforce:

- one active/blocking policy reservation per site;
- one active/blocking reservation per exact target field.

Active/blocking states are:

- `authorized`;
- `claimed`;
- `manual_intervention`.

## E3 — PostgreSQL reservation store

`P88W04ReservationStore` requires an explicit database URL in its constructor.

It never reads process `DATABASE_URL`.

Before reserve it verifies:

- expected 38-table engineering schema;
- exact W04 table columns;
- exact Diamond Shelf site identity.

One reserve attempt:

1. canonically rebuilds the reservation intent;
2. canonically rebuilds/binds W03;
3. opens one PostgreSQL transaction;
4. reads `transaction_timestamp()`;
5. rejects not-yet-issued or expired W03 authorization;
6. opportunistically expires only stale `authorized` reservations for the site;
7. inserts the deterministic reservation with `ON CONFLICT DO NOTHING RETURNING`;
8. if no insert occurred, classifies the durable conflict in the same transaction.

Exact replay classifications include:

- `existing_authorized`;
- `already_claimed`;
- `already_consumed`;
- `already_released`;
- `already_expired`;
- `manual_intervention_required`.

Fail-closed conflicts include:

- `identity_collision`;
- `site_concurrency_conflict`;
- `target_reservation_conflict`;
- `reservation_state_uncertain`.

No retry loop is introduced.

## Expiry behavior

Only stale unclaimed `authorized` reservations may be opportunistically moved to `expired`.

W04 does not automatically expire:

- `claimed`;
- `manual_intervention`.

Those remain blocking.

W04 itself does not expose claim/consume transitions.

## Durable receipt

Created/existing durable rows project a bounded receipt:

`p8-8-w04-durable-reservation-v1`

The receipt contains only bounded reservation/authorization/target/state identities, timestamps, status, source and receipt fingerprint.

It explicitly remains non-dispatchable.

## E4 — real PostgreSQL concurrency certification

The dedicated ephemeral test suite certifies real PostgreSQL races for:

- simultaneous exact duplicate reservations -> one row plus exact replay;
- site-level active reservation exclusivity;
- exact target-field exclusivity;
- deterministic identity collision without overwrite;
- stale authorized expiry/replacement;
- claimed reservation remains blocking;
- manual-intervention reservation remains blocking;
- terminal replay does not create another row;
- deterministic row count/state after races.

Tests run only against the dedicated localhost W04 ephemeral URL.

## E5 — W03/W04 pairing

`pairP88W03W04DurableReservation` verifies exact equality for:

- reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- Product GID/URL/field;
- before/after fingerprints;
- authorization/expiry timestamps.

Only an `authorized` durable receipt can produce the read-only pairing artifact.

The pairing means:

`policyAwareControlEligible=true`

It still keeps:

- `providerDispatchAuthorized=false`;
- `publicSiteWrites=false`.

W05/W06 must later revalidate the exact W03 + W04 pair.

## Runtime bootstrap change

The runtime schema recognizer now understands the 38-table W04 engineering state so read-only identity checks do not misclassify a future schema after explicit migration.

It does **not** automatically apply migration 0005.

Automatic runtime bootstrap still applies only the historical core/auth path.

Recognizing a W04-ready schema is not Production DDL authorization or W04 activation.

## CI certification

The code-only W04 head before closeout documentation:

`209bd9a96489176942e501a20b6e4983c94f521a`

passed canonical:

- CI #744 / run `35854780897`;
- W04 migration/schema test;
- real PostgreSQL W04 persistence/concurrency test;
- full workspace tests;
- P11.10 scale;
- Chromium critical paths;
- typecheck;
- build.

The final closeout head must pass fresh exact-head CI before merge.

## Capability boundary

W04 engineering does not authorize or perform:

- Production migration 0005;
- Production reservation creation;
- Replit Development/Production DDL/DML;
- provider/network request;
- provider/public-site write;
- Task #51/#53/#54 execution;
- human approval/action-row mutation;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config mutation;
- deployment;
- publication;
- W05–W10.

## Production DDL remains separately gated

After W04 engineering merges, migration 0005 exists only as certified source.

Applying it to Production requires a later explicit authorization naming:

- exact canonical GitHub SHA/tree;
- migration path;
- migration checksum;
- target Production database/schema.

That Production DDL authorization must still not imply reservation-row insertion, runtime activation, provider execution, worker activation, deployment or publication.

## Next boundary

The next P8.8 work package is W05 — durable mutation-control bridge.

W05 remains separately gated.

Production DDL for W04 is also separately gated and is not implied by W05 engineering.

# P8.8 W04 — durable reservation/idempotency specification

**Issue:** #418  
**Status:** SPECIFICATION / REVIEW ONLY — W04 IMPLEMENTATION AND PRODUCTION DDL BLOCKED

## Purpose

W04 defines the durable PostgreSQL replay/reservation boundary for the P8.8 policy-mutation path.

It converts a canonical, non-dispatchable W03 policy authorization plus its precommitted reservation identity into one durable reservation record that later W05–W07 stages can validate.

W04 itself does not:

- execute a provider request;
- create a human Task #51 action;
- create an approvals row;
- claim provider-write authority;
- activate a scheduler or worker;
- apply Production DDL under this specification.

## Existing persistence patterns and why W04 needs a dedicated table

The repository already has two persistence patterns that are useful references but are not the right authority for W04.

### Human `actions`

The existing Task #51 path:

- locks one `action_plans` row with `FOR UPDATE`;
- validates human approval;
- inserts one row into `actions`;
- stores the human `controlled_execution_foundation_v1` envelope.

That table does not currently provide a distinct durable policy-reservation fingerprint or the policy-path provenance contract required by P8.8.

W04 must not insert a fake human action row merely to obtain idempotency.

### Generic `jobs`

Task #70 uses:

- a deterministic job identity;
- `ON CONFLICT (id) DO NOTHING`;
- exact replay-vs-identity-collision checks.

That is a useful idempotency pattern.

However `jobs` carries queue/worker semantics such as:

- `run_after`;
- `attempts`;
- `locked_at`;
- generic pending/active worker lifecycle.

P8.8 policy mutation reservation is a governance/execution-control primitive, not a background-work queue.

W04 therefore specifies a dedicated table.

## Precommit-then-materialize sequencing

W03 v1 is already certified and intentionally accepts only a synthetic/non-durable reservation descriptor.

W04 must not silently rewrite W03 v1 semantics.

Instead the W04 flow is:

1. W01 produces exact policy admission.
2. W02 produces exact `materialized_unpersisted` proposal.
3. a pure W04 reservation-intent projector deterministically derives the reservation ID/fingerprint from exact W01/W02 lineage;
4. that exact projected identity is supplied to the existing W03 synthetic reservation descriptor;
5. W03 produces a non-dispatchable `policy_authorization` artifact binding that reservation identity;
6. W04 canonically rebuilds W01/W02/W03 and verifies that W03 carries exactly the W04-projected reservation identity;
7. only then may W04 materialize that exact identity as one durable PostgreSQL reservation.

This avoids the W03↔W04 cyclic dependency and preserves W03 v1 unchanged.

The W03 artifact alone remains non-durable and non-dispatchable.

The W04 durable reservation receipt alone remains non-dispatchable.

Later stages must require the exact W03 + W04 pair.

## Pure reservation-intent identity

Future W04 implementation should expose a pure function such as:

`projectP88W04ReservationIntent(...)`

It must canonically rebuild/verify the same W01 and W02 inputs used by W03.

The reservation fingerprint must bind at least:

- W04 intent version;
- policy class;
- site ID;
- policy ID/version/fingerprint;
- W01 evaluation ID/fingerprint;
- W02 materialization ID/fingerprint;
- W02 materialization-idempotency fingerprint;
- proposal ID/fingerprint;
- recommendation fingerprint/idempotency key;
- target-binding fingerprint;
- provider;
- domain;
- resource kind;
- Product GID;
- target URL;
- action type;
- field;
- required provider scope;
- before fingerprint;
- after fingerprint.

Recommended version:

`p8-8-w04-reservation-intent-v1`

Recommended deterministic ID:

`p88w04-reservation-<first-24-hex-of-reservation-fingerprint>`

The ID is an application identity, not a database-generated random UUID.

Exact canonical replay produces the same reservation ID/fingerprint.

Any material lineage change produces a different fingerprint.

## W03 reservation precommit requirement

Before durable insertion, W04 must verify that the W03 artifact's reservation descriptor contains exactly:

- `reservationId = projected W04 reservation ID`;
- `reservationFingerprint = projected W04 reservation fingerprint`;
- W03 synthetic reservation state/version/source/durability exactly as certified by W03;
- a valid W03 descriptor fingerprint.

An arbitrary caller-selected W03 reservation ID/fingerprint is not durably materializable.

This makes the W03 synthetic descriptor a cryptographic precommit, not a free-form reservation selector.

## Dedicated PostgreSQL schema

Future engineering should introduce a dedicated table:

`policy_mutation_reservations`

The planned engineering migration is:

`lib/db/migrations/0005_p8_8_policy_mutation_reservations.sql`

That migration may be authored and exercised only in isolated CI/test PostgreSQL when separately approved for W04 implementation.

It must not be applied to Production without a later explicit Production DDL authorization.

### Required columns

The table should contain explicit scalar identity columns, not opaque provider payloads.

Minimum columns:

- `reservation_id text PRIMARY KEY`;
- `reservation_version text NOT NULL`;
- `reservation_class text NOT NULL`;
- `reservation_fingerprint text NOT NULL UNIQUE`;
- `site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE`;
- `policy_id text NOT NULL`;
- `policy_version text NOT NULL`;
- `policy_fingerprint text NOT NULL`;
- `evaluation_id text NOT NULL`;
- `evaluation_fingerprint text NOT NULL`;
- `materialization_id text NOT NULL`;
- `materialization_fingerprint text NOT NULL`;
- `materialization_idempotency_fingerprint text NOT NULL`;
- `proposal_id text NOT NULL`;
- `proposal_fingerprint text NOT NULL`;
- `recommendation_fingerprint text NOT NULL`;
- `recommendation_idempotency_key text NOT NULL`;
- `target_binding_fingerprint text NOT NULL`;
- `provider text NOT NULL`;
- `domain text NOT NULL`;
- `resource_kind text NOT NULL`;
- `resource_gid text NOT NULL`;
- `target_url text NOT NULL`;
- `action_type text NOT NULL`;
- `field text NOT NULL`;
- `required_provider_scope text NOT NULL`;
- `before_fingerprint text NOT NULL`;
- `after_fingerprint text NOT NULL`;
- `w03_authorization_id text NOT NULL`;
- `w03_authorization_fingerprint text NOT NULL UNIQUE`;
- `policy_action_id text NOT NULL UNIQUE`;
- `w03_reservation_descriptor_fingerprint text NOT NULL`;
- `status text NOT NULL`;
- `authorized_at timestamptz NOT NULL`;
- `expires_at timestamptz NOT NULL`;
- `claimed_at timestamptz`;
- `terminal_at timestamptz`;
- `terminal_reason text`;
- `created_at timestamptz NOT NULL DEFAULT transaction_timestamp()`;
- `updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()`.

No raw before/after text is required in W04.

W02/W03 artifacts remain the supplied canonical source for exact proposal values.

## Initial-class database constraints

The first W04 schema is intentionally closed to the certified Stage-1 class.

Database checks should require:

- `reservation_version = 'p8-8-w04-durable-reservation-v1'`;
- `reservation_class = 'shopify.product.seo.meta_description'`;
- `provider = 'shopify'`;
- `domain = 'diamondshelf.us'`;
- `resource_kind = 'product'`;
- Product GID shape `gid://shopify/Product/<positive integer>`;
- canonical Diamond Shelf `/products/<handle>` URL semantics validated in application code and stored exactly;
- `action_type = 'update_meta_description'`;
- `field = 'meta_description'`;
- `required_provider_scope = 'write_products'`;
- all fingerprint columns use exactly 64 lowercase hex characters;
- `before_fingerprint <> after_fingerprint`;
- `expires_at > authorized_at`.

Schema constraints must not be weakened by caller input.

Broader resources/fields/providers require a later reviewed migration.

## Reservation lifecycle

Schema-supported lifecycle:

- `authorized`;
- `claimed`;
- `consumed`;
- `released`;
- `expired`;
- `manual_intervention`.

W04 initial materialization creates exactly:

`authorized`

because the W03 policy authorization already exists before durable insertion.

### Active/blocking states

These states block another mutation reservation:

- `authorized`;
- `claimed`;
- `manual_intervention`.

`manual_intervention` is intentionally blocking.

### Terminal/non-active states

- `consumed`;
- `released`;
- `expired`.

W04 implementation itself must not create `claimed` or `consumed`; those transitions belong to later W05–W07 work.

The schema may support those future states without granting transition authority now.

## Database-enforced concurrency invariants

W04 must enforce both of these independently.

### One active policy mutation per site

A partial unique index should prevent more than one active/blocking reservation for the same site:

`UNIQUE(site_id) WHERE status IN ('authorized','claimed','manual_intervention')`

This durably enforces the initial P8.8 concurrency limit of one.

### One active mutation per target field

A second partial unique index should prevent parallel mutation of the same exact target:

`UNIQUE(site_id, provider, resource_kind, resource_gid, field) WHERE status IN ('authorized','claimed','manual_intervention')`

This remains valuable even if site concurrency is widened in a future policy stage.

## Exact replay and collision semantics

The reservation insert must use deterministic identity plus database uniqueness.

Recommended pattern:

`INSERT ... ON CONFLICT DO NOTHING RETURNING ...`

A zero-row insert is never treated as success automatically.

After a conflict, W04 must classify the durable state.

### Exact replay

If a row exists at the deterministic `reservation_id` and every immutable identity field matches exactly, return the existing row/receipt.

Do not insert a second row.

Do not reset its lifecycle.

Possible exact-replay classifications include:

- `existing_authorized`;
- `already_claimed`;
- `already_consumed`;
- `already_released`;
- `already_expired`;
- `manual_intervention_required`.

### Identity collision

If the deterministic reservation ID exists but any immutable identity differs:

`identity_collision`

Fail closed.

Do not overwrite the row.

### Site concurrency conflict

If another active/blocking row owns the site uniqueness constraint:

`site_concurrency_conflict`

Fail closed.

### Target conflict

If another active/blocking row owns the target-field uniqueness constraint:

`target_reservation_conflict`

Fail closed.

### Uncertain conflict classification

If the insert reports conflict but no exact/collision/site/target row can be established consistently:

`reservation_state_uncertain`

Fail closed and require manual investigation.

No automatic retry is authorized.

## Transaction semantics

One W04 durable reservation attempt must run in a single PostgreSQL transaction.

Recommended order:

1. canonical rebuild/verification of W01/W02/W03 occurs before opening the transaction;
2. derive exact W04 reservation intent;
3. verify W03's precommitted reservation identity equals the W04 intent;
4. begin transaction;
5. read `transaction_timestamp()` as the authoritative durable clock;
6. reject if W03 `issuedAt` is after database transaction time;
7. reject if W03 `expiresAt <= transaction_timestamp()`;
8. expire only stale, unclaimed `authorized` reservations for the same site whose `expires_at <= transaction_timestamp()`;
9. never auto-expire `claimed` or `manual_intervention`;
10. attempt deterministic insert with `ON CONFLICT DO NOTHING RETURNING`;
11. if inserted, return the durable authorized reservation;
12. if not inserted, classify exact replay / identity collision / active site conflict / active target conflict inside the same transaction;
13. commit only a valid insert, exact replay read, or deterministic authorized-expiry reconciliation;
14. on any uncertain database outcome, return a manual-intervention/fail-closed result and do not authorize a retry.

W04 must not use a retry loop around an uncertain transaction.

## Expiry reconciliation without a worker

W04 does not activate a timer, scheduler, or cleanup worker.

Expiry is opportunistic and transaction-local.

A future reservation attempt may atomically mark a stale **unclaimed** `authorized` row as:

`expired`

only when:

`expires_at <= transaction_timestamp()`

W04 must never automatically expire:

- `claimed`;
- `manual_intervention`.

Those states remain blocking until a later explicitly authorized control/recovery path resolves them.

## Durable receipt

A successful insert or exact replay should project a bounded receipt such as:

`p8-8-w04-durable-reservation-v1`

Minimum receipt fields:

- reservation ID;
- reservation fingerprint;
- reservation class/version;
- site ID;
- W03 authorization ID/fingerprint;
- policy action ID;
- exact status;
- target Product GID/URL/field;
- before/after fingerprints;
- authorized-at;
- expires-at;
- durable = true;
- source = `policy_mutation_reservations`;
- deterministic receipt fingerprint over the persisted bounded row projection.

The receipt must not contain:

- raw proposal text;
- raw provider payloads;
- response headers/cookies;
- OAuth tokens;
- API keys;
- arbitrary database errors;
- human approval data.

## W03 pairing after W04

W03 v1 remains unchanged.

The W03 artifact still reports:

- synthetic/non-durable reservation descriptor;
- provider dispatch false;
- public write false.

The W04 receipt proves that the exact precommitted reservation identity was subsequently materialized durably.

Later W05/W06 must require an exact pair:

- canonical W03 authorization;
- canonical W04 durable reservation receipt;

with exact equality for:

- reservation ID/fingerprint;
- W03 authorization ID/fingerprint;
- policy action ID;
- site;
- target;
- before/after state;
- expiry window;
- lifecycle eligibility.

Neither artifact alone is enough for provider dispatch.

## Quota and cooldown boundary

W04 persistence creates durable history that later policy-aware checks can query.

However W04 itself does not reinterpret policy quota or cooldown rules.

W01 remains the pure policy-evaluation layer.

W05/W06 must later perform fresh control/current-state checks using durable W04 history before any claim or provider preflight.

W04 must not silently turn a reservation row into final policy admission.

## Human path separation

W04 must not mutate:

- `approvals`;
- human `actions`;
- Task #51 authorization envelopes;
- Task #54 human confirmations.

The durable policy reservation table is a separate namespace.

A future policy action may later create a distinct policy-execution record under separately reviewed work, but W04 does not reuse a human action row.

## Failure and manual-intervention semantics

W04 must fail closed on:

- W01/W02/W03 canonical rebuild failure;
- reservation-intent mismatch;
- W03 expired before durable insert;
- database clock / authorization window mismatch;
- deterministic ID collision;
- site concurrency conflict;
- target conflict;
- impossible row shape;
- uncertain transaction result.

Database implementation should map raw SQL errors to bounded categories.

Do not persist raw SQL exception text in the reservation row.

No automatic retry is authorized by W04.

## Future engineering work packages

A later explicit W04 implementation authorization should be split into bounded engineering work.

### W04-E1 — pure reservation-intent projection

- deterministic W04 intent builder;
- W01/W02 canonical integrity;
- W03 reservation precommit equality;
- no DB imports.

### W04-E2 — migration/schema contract

- add `0005_p8_8_policy_mutation_reservations.sql`;
- update schema contract only as required;
- migration tests in isolated PostgreSQL;
- no Production DDL.

### W04-E3 — PostgreSQL reservation store

- exact single-transaction reserve/replay/conflict classification;
- database clock checks;
- opportunistic authorized-only expiry;
- bounded durable receipt;
- no route/provider/worker.

### W04-E4 — PostgreSQL concurrency certification

Tests must prove with real concurrent transactions:

- exact duplicate simultaneous reservations produce one row and one exact replay;
- different lineages for one site cannot both become active;
- different lineages for one exact target cannot both become active;
- deterministic-ID mismatch is collision, never overwrite;
- expired authorized row can be reconciled then replaced;
- claimed/manual-intervention rows cannot be auto-expired;
- no deadlock leaves an ambiguous success;
- row count and state remain deterministic after races.

### W04-E5 — W03/W04 pairing projection

- read-only/pure projection over supplied W03 artifact + durable W04 receipt;
- proves exact pairing for later W05/W06;
- still no provider dispatch or runtime route.

Each engineering package may be combined in one PR only if a later user authorization explicitly covers them.

## Production DDL boundary

Even after W04 engineering and migration tests are certified, Production schema must remain unchanged.

Applying migration `0005_p8_8_policy_mutation_reservations.sql` to Production requires a separate explicit authorization similar to:

`AUTHORIZE P8.8 W04 PRODUCTION DDL — apply only certified migration 0005 ...`

That authorization must identify the exact canonical GitHub SHA/tree and migration checksum.

Production DDL authorization must not imply:

- row insertion;
- policy activation;
- W04 reservation creation;
- worker activation;
- provider execution;
- deployment/publication unless separately requested.

## Deployment/runtime boundary

Creating the table in Production is not runtime activation.

A future W04 runtime integration/deployment would require separate authorization after:

- engineering certification;
- migration certification;
- Production DDL certification;
- W05+ control integration as applicable.

W04 has no public route and no autonomous worker by default.

## Required regression coverage

Future implementation tests must prove at minimum:

1. deterministic reservation intent from exact W01/W02 lineage;
2. exact W03 precommit equality;
3. arbitrary W03 reservation identity rejected;
4. migration forward application in isolated PostgreSQL;
5. exact schema/check/index contract;
6. exact replay yields one durable row;
7. deterministic identity collision fails closed;
8. site concurrency conflict fails closed;
9. target conflict fails closed;
10. W03 expiry before insert rejects;
11. database transaction time is authoritative;
12. stale authorized reservation can become expired opportunistically;
13. claimed reservation never auto-expires;
14. manual-intervention reservation never auto-expires;
15. terminal replay does not create another row;
16. receipt contains only bounded fingerprints/identities;
17. no proposal text/secrets/provider payload persisted;
18. no human approvals/actions mutated;
19. no provider/network request;
20. no scheduler/worker activation;
21. real concurrent PostgreSQL race tests preserve one-row/one-active invariants;
22. source-level no-provider/no-Task-#51/#53/#54/no-public-write binding.

## Non-authorization

This specification authorizes no:

- W04 implementation;
- migration-file creation;
- schema/DDL/DML;
- Production database access;
- reservation row creation;
- action/approval row creation;
- provider/network request;
- Shopify/public-site mutation;
- Task #51/#53/#54 execution;
- policy activation;
- scheduler/worker/autonomous execution;
- credential/scope/config change;
- deployment;
- publication;
- W05–W10.

## Next explicit authorization boundary

After this W04 specification is merged and certified, the next safe engineering action would be a separate explicit approval for bounded W04 engineering.

That authorization should explicitly state whether it covers:

- W04-E1 only; or
- W04-E1 through W04-E5 plus migration/schema code in CI.

It must still keep Production DDL and Production reservation creation separately gated.

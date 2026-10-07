# P12.2-L10.17 — Packet 014 post-run durable outcome certification

## Purpose

L10.17 certifies the durable terminal outcome of the first post-0010 Packet 014 full-site crawl.

It never executes, resumes, retries, recovers or mutates the crawl. It reads the durable Production state only after the live one-shot reaches a terminal result.

## Exact execution binding

The certification is bound to:

- Packet fingerprint: `b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`;
- phase: `full_initial`;
- run ID: `p12-2-diamond-shelf-post-0010-full-014`;
- observed-at: `2026-10-06T16:15:00.000Z`;
- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin: `https://diamondshelf.us`;
- immutable execution image: `ghcr.io/intssere/seo-engine@sha256:afa1e3f7bc2b38b59b0fa36aa9eb4d0ed2a533122439d5d9647ed48ee63ecf93`;
- live execution deployment: `30e3ab20-20ce-4d22-acd6-39d7a3575597`;
- Railway project/environment/Postgres identities already used by P12.2.

The authorization fingerprint includes this complete binding.

## Ten SELECT-only checks

The certification performs exactly ten single-statement SELECT queries:

1. database identity;
2. exact Packet-014 invocation identity;
3. L2 invocation receipt;
4. final checkpoint state;
5. completed-run state;
6. post-0010 terminal-failure evidence, including exact canonical URL;
7. post-0010 accounting snapshot state;
8. recovery receipt state;
9. terminal outcome classification;
10. terminal outcome fail-closed guard.

## Allowed terminal outcomes

L10.17 accepts exactly one of two outcomes.

### 1. `clean_certified`

The guard requires:

- exactly one completed Packet-014 L2 invocation;
- invocation attempt 1;
- no automatic whole-run retry;
- L2 result `completed`;
- exactly one completed checkpoint for Packet 014;
- zero pending URLs;
- finalized URLs equal total URLs;
- zero terminal failures;
- exactly one accounting snapshot;
- accounting snapshot `whole_site_certified=true`;
- terminal-failure count zero;
- snapshot/checkpoint lineage consistent;
- exactly one certified completed-run snapshot sharing the accounting snapshot fingerprint;
- certification `wholeSiteCertified=true`;
- reason `certified_complete_accounting`;
- no Packet-014 terminal-failure events;
- no Packet-014 recovery receipts.

### 2. `accounting_complete_uncertified`

The guard requires:

- exactly one completed Packet-014 L2 invocation;
- invocation attempt 1;
- no automatic whole-run retry;
- L2 result `accounting_complete_uncertified`;
- one-or-more terminal failures;
- exact receipt checkpoint fingerprint/revision binding;
- exactly one completed checkpoint;
- zero pending URLs;
- finalized URLs equal total URLs;
- one-or-more checkpoint terminal failures;
- exactly one accounting snapshot;
- accounting snapshot fingerprint equals the L2 receipt;
- `whole_site_certified=false`;
- accounting terminal-failure count equals the checkpoint terminal-failure count;
- no certified completed-run row;
- exact post-0010 terminal-failure event count equals the accounting terminal-failure count;
- distinct exact failed canonical URL count equals the same terminal-failure count;
- events are initial `terminal_failure` events with no recovery source;
- no recovery receipt exists before separately authorized recovery.

This is the key post-0010 improvement over legacy Packet 013: failed URL identity must come from durable event evidence. L10.17 never guesses or reconstructs it.

## Non-terminal behavior

If Packet 014 is still running, only claimed, missing durable accounting state, has conflicting lineage, contains unexpected recovery state, or otherwise does not match exactly one allowed terminal outcome, the final guard fails closed.

Therefore the post-run certification cannot be used as a progress probe while the live crawl is still executing.

## Runtime safety

The dedicated CLI:

`artifacts/api-server/dist/p12-2-l10-17-packet-014-post-run-cert.mjs`

uses:

- `/usr/bin/psql`;
- PostgreSQL `default_transaction_read_only=on`;
- 15-second statement timeout;
- bounded output;
- no database credential in argv or emitted receipt;
- one attempt;
- zero retries;
- no fallback transport.

It has no crawl, recovery, Railway mutation, scheduler, worker, provider-write or public-site-write authority.

## Dedicated immutable certification image

Dockerfile:

`Dockerfile.p12-2-l10-17-packet-014-post-run-cert`

Release workflow:

`.github/workflows/p12-2-l10-17-packet-014-post-run-cert-image-release.yml`

After merge, its release authorization is bound to canonical source SHA/tree:

`AUTHORIZE:P12_2_L10_17_PACKET_014_POST_RUN_CERT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

The Production SELECT-only certification uses a separate deterministic authorization literal:

`AUTHORIZE:P12_2_L10_17_PACKET_014_POST_RUN_READ_ONLY:<AUTHORIZATION_FINGERPRINT>`

## Sequence

1. allow the already-running Packet 014 deployment to reach terminal state without intervention;
2. merge L10.17 only after exact-head CI succeeds;
3. require post-merge CI success;
4. separately release/attest the immutable L10.17 certification image;
5. verify the original Packet-014 deployment is terminal and no retry/redeploy occurred;
6. obtain the exact L10.17 Production read-only authorization;
7. run the certification exactly once;
8. if `clean_certified`, proceed to repeat/full-reconciliation and incremental proof;
9. if `accounting_complete_uncertified`, enter a separately designed and separately authorized exact-URL bounded recovery lane using the durable terminal-failure evidence;
10. never reuse the consumed Packet-014 crawl authorization.

## Safety boundary

This milestone grants no authority to:

- restart or redeploy Packet 014;
- query Production before a separately authorized certification run;
- mutate Production data/schema;
- perform recovery;
- activate a scheduler or worker;
- write to providers or the public site;
- transition the Production application image.

Merge, certification image release, Production read-only certification and any recovery remain separate boundaries.

# P12.2-L10.15 — post-0010 packet 014 fresh full-initial execution specification

## Result

**EXACT FRESH FULL-INITIAL PACKET MATERIALIZED / LIVE EXECUTION REMAINS CLOSED.**

L10.15 converts the L10.14 decision into a deterministic post-migration execution specification. It does not execute the packet.

Packet 013 remains immutable historical accounting evidence with no trustworthy exact failed-URL identity. L10.15 does not backfill, retry, resume, or recover packet 013.

## Canonical parent

This milestone was branched from:

- canonical main: `b3aa9ee057a3579a0a5e6a28a35c81cd551b4cf5`;
- canonical tree: `c3b5799e6570bfbbd5d44832a8d4d4d7bfa0f1b0`;
- post-merge CI: `37492536222` / run #2416, successful.

Migration 0010 has already completed its separately authorized Production A/B/C sequence and the 41-table post-state was SELECT-only certified before this milestone.

## Packet 014 identity

The packet is built by the existing L2 packet builder through the L10.14 fresh-run guard.

Exact identity:

- phase: `full_initial`;
- run ID: `p12-2-diamond-shelf-post-0010-full-014`;
- observed-at: `2026-10-06T16:15:00.000Z`;
- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin: `https://diamondshelf.us`;
- packet fingerprint: `b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`.

The exact packet-specific live authorization literal is therefore:

`AUTHORIZE:P12_2_L2_ONE_SHOT:b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`

That literal is documented for identity only. **It is not granted by this milestone or by merge.**

The packet has:

- no resume binding;
- no incremental binding;
- no intentional-interruption binding;
- maximum whole-run invocation attempts = 1;
- automatic whole-run retry = false;
- scheduler = false;
- autonomous worker = false;
- provider writes = false;
- public-site writes = false;
- deployment/publication authority = false.

## Bounded limits

L10.15 deliberately does not attempt to reproduce an unknown historical packet-013 limit object.

It establishes a new conservative post-0010 policy:

- hard page fuse: 5,000;
- absolute page ceiling: 25,000;
- sitemap max documents: 100;
- sitemap max depth: 4;
- sitemap max document bytes: 5,000,000;
- sitemap max inventory URLs: 5,000;
- sitemap max path segments: 32;
- execution batch size: 10;
- concurrency: 1;
- request rate: 30/minute;
- request timeout: 10,000 ms;
- redirects per request: 3;
- attempts per URL: 3;
- retry base delay: 10,000 ms;
- retry max delay: 60,000 ms;
- max URL length: 2,048;
- execution max path segments: 32;
- repeated path-segment run: 3;
- transient metadata/page-read cap: 262,144 bytes.

The 5,000-URL fuse provides bounded headroom above packet 013's historical 3,044-URL inventory without approaching the 25,000 absolute ceiling. If the live sitemap exceeds the selected fuse, execution must fail closed; the limit is not automatically widened.

## Exact-bound executable

The production build now emits:

`artifacts/api-server/dist/p12-2-l10-15-packet-014-live.mjs`

The source entrypoint is:

`artifacts/api-server/src/p12-2-l10-15-packet-014-live-cli.ts`

Unlike the generic L6.3 live operator, the L10.15 entrypoint accepts **no external envelope path or free-form packet material**.

Inspection mode takes no arguments and performs no DB/network work.

Execution mode accepts exactly:

`--execute`

Before calling the existing durable live operator, it requires:

1. `P12_2_L2_AUTHORIZATION_LITERAL` to equal the exact packet-014 authorization literal;
2. `P12_2_L10_15_POSTGRES_SERVICE_ID` to equal `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
3. a non-empty `DATABASE_URL`;
4. the exact internally rebuilt packet/envelope integrity checks.

The underlying L2/L6.3 path still performs the durable packet claim before network execution and retains one-attempt/no-whole-run-retry semantics.

## Build proof

`build.mjs` emits the dedicated packet-014 executable.

`verify-build.mjs` fails closed unless the emitted bundle/source map contains the exact packet version, run ID, fingerprint, packet authorization requirement, exact Postgres-service binding check, durable replay guard, and L10.13B recovery/accounting persistence surface.

This is source/build proof only. It is not an immutable-image release and not live Production proof.

## Required sequence after merge

If this milestone is merged and post-merge CI succeeds, the next sequence is intentionally split into separate boundaries:

1. release a new immutable `ghcr.io/intssere/seo-engine` image from the new canonical main using the existing P12.2 L2 Production image-release workflow;
2. attest and verify the exact image digest/SBOM/provenance;
3. perform a separate bounded SELECT-only Production preflight proving the current 41-table recovery/accounting state and no conflicting packet-014 invocation;
4. inspect a disposable Railway runner configuration with restart `NEVER`, no domain/volume/cron/GitHub source/autodeploy, exact image digest, exact Postgres binding, and exact packet authorization;
5. obtain a fresh explicit live execution authorization;
6. execute packet 014 exactly once;
7. once durable claim/network execution is crossed, never retry/redeploy/restart/reuse that packet authorization;
8. certify the resulting durable invocation/checkpoint/accounting state with a separate SELECT-only certification milestone before any recovery/reconciliation step.

## Expected result semantics

A clean full run may return `completed` and persist a certified completed snapshot.

If one or more URLs reach terminal failure, the post-0010 L10.13B runtime may return `accounting_complete_uncertified`. In that case:

- exact terminal-failure URL/signal/attempt evidence must already be durable;
- an accounting snapshot must be durable;
- no completed whole-site certification may be fabricated;
- recovery, if warranted, must be a separate exact evidence-bound action.

## Safety boundary

This milestone performs no:

- Diamond Shelf sitemap, robots, or page request;
- Production DB read or write;
- packet claim;
- packet execution;
- packet-013 recovery/backfill;
- Railway mutation or deployment;
- image release;
- scheduler/worker activation;
- provider/public-site write;
- application publication.

Merge is a separate exact authorization boundary. Image release, Production preflight, Railway execution, packet-014 live authorization, and all later certification/recovery work remain separately gated.

# P12.2-L2 — bounded one-shot operator caller engineering

## Result

**REPOSITORY-ONLY ONE-SHOT OPERATOR ENVELOPE IMPLEMENTED / LIVE EXECUTION REMAINS CLOSED.**

L2 adds no scheduler, startup binding, route, job, Production database access, network call, persistence action, Railway mutation or deployment.

## Baseline

Canonical parent:

`e8086b2ec3118e30116bc62e050fc562e85e68a3`

L2 reuses the certified P12.2 manual composition gate rather than replacing it.

The existing manual layer still owns:

- exact site ID `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- exact origin `https://diamondshelf.us`;
- exact manual confirmation;
- `networkReady`;
- `liveExecutionAuthorized`;
- `persistenceReady`;
- `persistenceAuthorized`;
- selected crawl/sitemap/execution/incremental/transient-byte limits.

L2 refuses to create a one-shot packet unless all of those existing gates are already true.

## Operator packet

The L2 packet binds:

- exact phase;
- exact run ID;
- exact caller-supplied ISO observation time;
- exact Diamond Shelf identity;
- exact existing P12.2 confirmation;
- exact selected manual limits;
- phase-specific interruption/resume/incremental lineage;
- maximum invocation attempts = 1;
- automatic whole-run retry = false;
- scheduler = false;
- autonomous worker = false;
- provider writes = false;
- public-site writes = false;
- deployment/publication authority = false;
- deterministic SHA-256 packet fingerprint.

Supported phases are exactly:

1. `full_initial`
2. `full_interrupt`
3. `full_resume`
4. `full_reconciliation`
5. `incremental`

No generic/free-form phase is accepted.

## Interruption and resume

`full_interrupt` requires an explicit checkpoint revision at which the injected executor must report an intentional interruption.

The returned interruption evidence must include:

- the same checkpoint revision;
- checkpoint fingerprint;
- execution-plan fingerprint;
- executor receipt fingerprint.

`full_resume` requires all three of those checkpoint/execution lineage values in advance. This prevents a resume packet from being created against an unspecified or merely "latest" checkpoint.

L2 itself performs no network or database work. The eventual live executor must implement the interruption behavior while preserving the existing P12.2 checkpoint persistence semantics.

## Incremental phase

`incremental` requires:

- exact incremental-plan fingerprint;
- exact current execution-plan fingerprint.

The packet does not create, infer or select an incremental plan.

## Packet-specific authorization

Each packet derives an exact authorization literal:

`AUTHORIZE:P12_2_L2_ONE_SHOT:<packetFingerprint>`

The one-shot dispatcher refuses to call the injected executor unless that exact literal is supplied.

The generic P12.2 manual confirmation is necessary but not sufficient for L2 dispatch.

## One-attempt rule

For one L2 packet:

- maximum invocation attempts = 1;
- automatic whole-run retry = false;
- a supplied prior receipt for the same packet fingerprint blocks replay;
- the dispatcher invokes the injected executor exactly once;
- a failure is returned to the operator; the dispatcher does not retry it.

A new attempt after failure requires a newly reviewed packet and new packet-specific authorization.

The pure repository module does not claim durable global replay prevention. A future live integration must persist/attest the consumed packet receipt or otherwise prove single consumption before execution.

## Injected executor boundary

L2 intentionally does not bundle a live executor.

The dispatcher accepts an injected executor with one method:

`execute(packet)`

This keeps repository tests network-free and persistence-free and prevents L2 merge from silently creating a runnable Production crawl command.

A later live integration must bind that injected executor to the existing certified P12.2 manual execution functions and must separately prove:

- current Production DB/schema/site readiness;
- migration 0004 readiness/application if needed;
- exact release containing L2;
- exact one-shot packet;
- packet-specific authorization;
- one-attempt consumption;
- bounded network and persistence authority.

## Testing

L2 tests use fake injected executors only.

They certify:

- deterministic packet identity;
- all four manual gates required;
- exact interruption boundary required;
- exact resume lineage required;
- exact incremental lineage required;
- packet-specific authorization required;
- executor is called at most once;
- prior consumed receipt blocks replay;
- no automatic retry;
- unexpected/mismatched interruption fails closed.

## Still blocked

L2 does not authorize or perform:

- Railway Production DB observation;
- migration 0004;
- Production DDL/DML;
- Diamond Shelf sitemap/robots/page requests;
- full or incremental crawl;
- persistence writes;
- provider/OAuth calls;
- scheduler/worker activation;
- credential/config mutation;
- Railway deployment;
- Production image transition.

## Next combined gate

P12.2 live execution cannot proceed until both lanes are complete:

1. **L1A/L1B** — current Railway Production DB/schema/site binding observed and migration readiness resolved;
2. **L2** — one-shot operator caller merged/certified, then included in a separately certified immutable release.

Only after both may a live execution packet freeze exact limits, run IDs, release digest, DB state, and the packet-specific authorization literal.

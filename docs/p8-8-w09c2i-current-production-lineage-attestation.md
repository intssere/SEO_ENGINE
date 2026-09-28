# P8.8 W09-C2I — Current Production lineage attestation contract

**Issue:** #605  
**Status:** OFFLINE CONTRACT ONLY — NO LIVE PRODUCTION ATTESTATION AUTHORIZED

## 1. Purpose

W09-C2H's authorized live preflight failed closed at Gate A because the current Production Neon project identity could not be resolved without supplying a project ID. This contract defines the minimum evidence required to resolve that identity without guessing, reading secret values, or opening a database session.

It does not retry W09-C2H and grants no Production access.

## 2. Immutable repository basis

- canonical source at contract creation: `c30d0bd6328e41e95445f39b535e2894398abb07`
- W09-C2B identity-resolution blob: `32b52a5bc840fc73e039825e5bce8c04aee10cc2`
- W09-C2H authorization-packet blob: `a7b46e2254cc8afed8591b5f6188c2745cb87b63`

The W09-C2B historical certified lineage is a **candidate only**:

- project: `late-sunset-42762033`
- branch: `br-super-frost-b341k9ms`
- database: `neondb`
- timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`
- historical read-only endpoint: `ep-lucky-river-b3sh13is`
- historical writable compute: `ep-muddy-mouse-b34bjs0w`

None of these identifiers may be promoted to a current Production fact solely because the resource still exists or remains internally coherent.

## 3. Required two-sided proof

Current Production lineage is PASS only when both sides below are independently established and agree.

### Side R — current Replit publication binding

From the currently published Replit SEO_ENGINE deployment, obtain a secret-free attestation of the database resource targeted by its Production `DATABASE_URL` binding.

Allowed attested fields are identity metadata only:
- Replit app/repl ID;
- current successful deployment/publication ID and URL;
- database provider;
- provider project/resource ID;
- branch ID;
- database name;
- timeline/lineage ID where exposed;
- endpoint/compute ID actually targeted by the binding;
- attestation timestamp.

The mechanism must not return, print, persist, hash, compare externally, or otherwise expose the raw `DATABASE_URL`, username, password, token, host credentials, query parameters containing secrets, or other secret values.

If Replit cannot expose resource identity independently of the secret value, Side R is UNPROVED.

### Side N — candidate Neon control-plane metadata

Using the candidate project ID only after separate explicit authorization, read non-secret Neon control-plane metadata for exactly `late-sunset-42762033`.

Allowed observations:
- project ID/name/status/settings relevant to identity/recovery;
- branches and default/protected state;
- branch parent/lineage/timeline identifiers where exposed;
- compute/endpoint IDs, types, branch association and status;
- database names/roles only as non-secret identity metadata;
- history-retention/recovery metadata needed later by Gate B.

No connection string, password, token, SQL, database catalog, application data, branch creation, restore, mutation, or configuration change is allowed.

Side N proves only what exists in Neon. It cannot prove that Replit currently points to it.

## 4. Equality rule

Gate-A lineage identity may be promoted to current only if:

1. Side R identifies provider/project as Neon / `late-sunset-42762033`;
2. Side R branch equals the branch independently returned by Side N and expected candidate `br-super-frost-b341k9ms`;
3. Side R database equals `neondb`;
4. current lineage/timeline evidence, when available on both sides, is equal and consistent with `07b8ce1a7a41f71ba395a1bab2b03de3`, or a documented provider lineage mapping proves continuity without inference;
5. Side R endpoint/compute exists on Side N and belongs to that exact branch;
6. the current Replit publication/deployment identity is independently current;
7. no observed metadata contradicts the historical continuity record.

An endpoint change is not automatically a lineage failure if both sides independently prove the new endpoint belongs to the exact same current project/branch/database/timeline. It must be recorded as an endpoint rotation, not silently substituted.

## 5. Fail-closed conditions

Result is FAIL/UNPROVED and no W09-C2H retry may start if:
- Side R cannot produce secret-free provider resource identity;
- either side is stale or ambiguous;
- project, branch, database, timeline/lineage or endpoint association conflicts;
- a candidate resource exists but cannot be tied to the current Replit binding;
- only schema/table similarity is available;
- proof relies on historical identifiers, URL continuity, resource naming, or absence of evidence of change;
- any tool would require exposing a raw secret to establish identity;
- any required observation errors or times out.

Do not search alternative projects by trial database connections.

## 6. Future bounded authorization

A live W09-C2I attestation requires a separate explicit authorization. The authorization must permit only:
- one current Replit publication/binding identity attestation with secret values suppressed;
- one bounded read-only Neon control-plane inspection of candidate project `late-sunset-42762033`;
- comparison under the equality rule above;
- sanitized evidence recording.

It must explicitly exclude DB sessions/SQL, connection-string retrieval, secrets, DDL/DML/migrations, branch/restore/snapshot creation, provider/public-site writes, config/gate changes, deployment/publication/restart, Railway/UGP, scheduler/worker/runtime activation, Task #51/#53/#54, W03–W07, W09-C Stage 0, and automatic retry.

## 7. Result receipt

Record:
- contract version/blob and canonical commit;
- Side R publication/deployment identity and timestamp;
- Side R sanitized resource-identity fields or UNPROVED reason;
- Side N sanitized project/branch/database/timeline/endpoint metadata and timestamp;
- field-by-field equality verdict;
- endpoint continuity/rotation verdict;
- overall PASS / FAIL / UNPROVED;
- prohibited-operation counters.

Never record raw secret values.

## 8. Consequence

A W09-C2I PASS only establishes the current Production lineage prerequisite for Gate A. It does not reuse or revive the consumed W09-C2H attempt.

After PASS:
1. review the attestation evidence;
2. establish current Gate-B recovery evidence if not already sufficiently proven by the same authorized control-plane observations;
3. issue a fresh explicit one-shot W09-C2H authorization;
4. rerun P0 and Gates A→B→C→D under the frozen W09-C2H contract.

No PASS here authorizes a Production DB session or Gate E.

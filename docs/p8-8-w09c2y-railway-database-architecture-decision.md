# P8.8 W09-C2Y — Railway database architecture decision

## Decision

**Select Path A for the current Railway migration: Railway application runtime with an explicitly certified external Neon Production lineage.**

Do not promote the currently inventoried Railway-managed `Postgres` service to SEO ENGINE Production authority as part of this migration.

This is an architecture decision only. It does not establish that any historical Neon resource is current, does not create a Railway→Neon binding, and grants no infrastructure authority.

## Canonical basis

- base main: `84eb2c6c60ead156c764986bf9d6b00ea3b4d6e8`
- C2V Railway Production binding contract: canonical
- C2W platform-neutral verifier v2: canonical
- C2X Railway producer feasibility: canonical
- PR #303 Railway single-service deployment adapter: already merged

## Alternatives compared

| Property | Path A — Railway runtime + explicit Neon | Path B — Railway-managed PostgreSQL |
| --- | --- | --- |
| Existing C2W provider model | Direct fit | Requires a new provider/lineage verifier contract |
| Existing historical Production lineage | Can be independently re-certified and reused if proven | Requires a separate data/lineage migration |
| Hosting migration vs DB migration | Keeps them separate | Couples hosting and database authority changes |
| Provider identity fields | Neon project/branch/database/endpoint/timeline semantics already defined | Railway service/volume/Postgres lineage semantics must be newly designed |
| Replit→Railway comparison | Can compare both runtimes against the same DB lineage | Changes runtime and DB simultaneously |
| Required new repository architecture | Producer/binding certification only | New provider-neutral DB identity + recovery/lineage model |
| Data movement required merely to move runtime | No, if intended Neon lineage is re-certified | Potentially yes |
| Risk of identity aliasing | Low if exact Neon control-plane IDs are proven | High unless a new schema is designed; Railway IDs cannot be put into Neon fields |

Path B remains a valid future architecture, but it is not the selected migration path.

## Why Path A is selected

### 1. Preserve one variable at a time

The immediate goal is to obtain a controllable, attestable application runtime. Moving both the runtime and Production database authority at once adds an independent data-migration, recovery, lineage, and rollback problem.

Path A changes the application hosting control plane while preserving the possibility of one certified database lineage.

### 2. Reuse the certified verifier model without weakening it

C2W already requires authoritative Neon:
- project/resource identity;
- branch identity;
- database identity;
- endpoint/compute identity;
- timeline/lineage or separately certified continuity.

Path A satisfies that model naturally once live evidence exists.

Path B would require a successor verifier with provider-specific Railway PostgreSQL semantics. C2Y does not weaken C2W or substitute Railway service/volume identifiers into Neon fields.

### 3. Preserve comparability during migration

If Replit and Railway can be independently shown to reference the same exact Neon lineage, runtime behavior can be certified without introducing database-content divergence merely because the hosting platform changed.

This is a design objective, not a current factual claim. Replit Side R remains UNPROVED.

### 4. Avoid unnecessary data movement

A hosting migration does not itself require copying Production data to a new database. Data migration should occur only for an independently justified database architecture change.

### 5. Cleaner rollback

Before traffic cutover, Replit can remain the serving fallback while Railway is certified against the intended database lineage. Application rollback can remain distinct from database rollback.

## Historical Neon identity is not automatically accepted

Historical candidate lineage remains:

- project: `late-sunset-42762033`
- branch: `br-super-frost-b341k9ms`
- database: `neondb`
- historical timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`
- historical read-only endpoint: `ep-lucky-river-b3sh13is`
- historical writable endpoint: `ep-muddy-mouse-b34bjs0w`

These identifiers are **candidate inputs only**. C2Y does not certify that they are current, intact, writable, recoverable, or bound to either runtime.

No future implementation may copy these constants into an attestation and call that proof.

## Required Railway structural binding

The future Railway application must be configured so its database association is structurally explicit and independently auditable without reading rendered credentials.

Preferred conceptual form:

```text
Railway project
  -> environment
  -> application service
  -> exact deployment/snapshot
  -> configuration/binding revision
  -> DATABASE_URL reference expression
  -> explicit Neon integration/resource reference
  -> exact provider resource identity
```

The evidence producer must return the reference/resource association, not the rendered connection value.

If Railway cannot expose the unresolved structural reference through an authoritative non-secret interface, the binding remains UNPROVED even if the application can technically connect.

## Credential boundary

The following are never attestation inputs:

- rendered `DATABASE_URL`;
- PostgreSQL connection strings;
- usernames or passwords;
- Railway variable value maps;
- Neon passwords/tokens/API keys;
- credential-bearing hostnames copied from connection details;
- hashes, fingerprints, encodings, or redactions derived from credentials.

Credentials may be used internally by the hosting platform to run the application, but they must not cross the attestation producer boundary.

## Staged Railway patch prerequisite

C2X observed an existing staged Railway patch containing:
- an application service resource update;
- staged `AUTH_PUBLIC_ORIGIN`.

Before any future Railway deployment authorization:

1. enumerate the staged patch using non-secret control-plane metadata;
2. classify each staged change as intended or unrelated;
3. do not accept the patch implicitly;
4. obtain explicit authorization for the exact reconciled patch;
5. verify no database/provider/scheduler/worker/write gate is accidentally enabled.

C2Y does not accept or discard the current staged patch.

## Railway deployment provenance exit criteria

Before a Railway deployment can be certified:

1. exact canonical Git commit is frozen;
2. exact Railway project ID is frozen;
3. exact environment ID is frozen;
4. exact application service ID is frozen;
5. staged changes are reconciled;
6. deployment completes with terminal `SUCCESS`;
7. Railway exposes exact deployment ID;
8. Railway exposes exact deployment snapshot/config revision;
9. deployment metadata independently reports the frozen Git commit;
10. healthcheck passes;
11. all mutation/provider/scheduler/worker gates remain explicitly disabled;
12. no traffic cutover occurs.

The currently observed deployment for C2W-era canonical main was FAILED and cannot satisfy these criteria.

## Neon identity exit criteria

Before the selected database can be called the Railway Production database, read-only provider/control-plane evidence must independently establish:

1. provider = Neon;
2. exact project/resource ID;
3. exact branch ID;
4. exact database name;
5. exact endpoint/compute ID intended for Railway;
6. exact timeline/lineage ID or certified immutable continuity semantics;
7. current resource state;
8. recovery/PITR capability required by the Production runbook;
9. no contradiction with the selected lineage;
10. no credential material used as identity evidence.

Historical IDs alone do not satisfy these gates.

## Cross-control-plane binding exit criteria

A PASS requires both sides to agree:

### Railway side
- exact project/environment/service/deployment/snapshot;
- exact structural database reference/binding revision;
- reference resolves to the selected provider resource without exposing credentials.

### Neon side
- exact provider resource identity and lineage;
- endpoint belongs to exact project/branch/database;
- current resource state is suitable for the separately authorized preflight.

If either side cannot independently establish the association, result is UNPROVED.

## Database safety before application use

Even after identity PASS, Railway must not be allowed to use the database for Production operations until a fresh C2H-equivalent read-only preflight passes.

That preflight must certify the exact expected schema/baseline, migration state, runtime assumptions, concurrency visibility requirements, and recovery readiness under its separately authorized query envelope.

Identity proof is not schema proof.

## No automatic migration

Selecting Path A does not authorize:
- migrations 0005/0006/0007;
- any DDL/DML;
- copying Replit data;
- copying Railway Postgres data;
- schema repair;
- credential rotation;
- endpoint creation/deletion;
- branch creation/deletion;
- database restore.

Each remains separately gated.

## Existing Railway Postgres disposition

The existing Railway `Postgres` service is not deleted, modified, queried, or promoted by C2Y.

Until a later explicit decision, treat it as a shadow/staging resource whose presence must not create ambiguity about which database is Production authority.

A future cleanup can remove or repurpose it only after the explicit Neon binding is certified and rollback requirements are understood.

## Exit from C2Y

C2Y is complete when this decision is canonical.

The next repository-only milestone is **W09-C2Z — Railway→Neon binding producer contract**, defining the exact sanitized producer schema and evidence sources needed to join:

```text
Railway deployment/snapshot
        +
Railway structural DB reference
        +
Neon provider identity/lineage
        ->
C2W sanitized attestation
        ->
safe receipt
```

C2Z must approve no live provenance authority unless a concrete control-plane mechanism is independently demonstrated.

## Hard exclusions

C2Y performs no Railway project/environment/service/config mutation, staged-patch acceptance, deployment/redeploy, variable-value read, Secrets access, database connection, SQL, DDL/DML/migration, Neon/provider access or mutation, Replit mutation, scheduler/worker/provider activation, DNS/custom-domain change, traffic cutover, Stage 0, or UGP integration.

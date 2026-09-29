# P8.8 W09-C2W — Platform-neutral binding attestation verifier v2

## Status

Repository-only implementation. No live provenance authority is approved and no infrastructure action is authorized.

## Basis

- canonical base: `737022c9e5632ccfbf4eb04ad2684634046c036c`
- C2N remains immutable as the historical Replit-specific verifier
- C2V requires a platform-neutral subject before Railway can ever produce a legitimate PASS

## Contract

C2W replaces the platform-specific `replId` concept for new evidence with:

- `platformKind`: closed to `replit | railway`
- `platformSubjectId`: the exact authoritative platform subject selected by verification context

The verifier still requires exact deployment identity, terminal success, binding revision, Neon provider/project/branch/database/endpoint identity, lineage or separately certified continuity, explicit freshness, approved provenance kind, and approved provenance authority.

It preserves C2N's recursive credential-shaped rejection and closed input schema.

## Backward compatibility

C2N code and schema are unchanged. Historical C2N evidence therefore keeps its original semantics.

`adaptLegacyC2NIdentity` accepts only an already-sanitized typed C2N identity and maps it to `platformKind="replit"` with `platformSubjectId=replId`. It performs no discovery and cannot approve provenance.

There is deliberately no adapter that maps Railway into C2N.

## Railway consequence

C2W makes the verifier structurally capable of representing Railway. It does **not** establish which Railway project/environment/service/deployment/database is current or approve any Railway control-plane producer.

A future live Railway PASS still requires:
1. separately certified authoritative producer/provenance;
2. exact Railway subject/deployment selection;
3. authoritative non-secret deployment-to-database binding association;
4. provider-side identity/lineage corroboration;
5. explicit verification context and freshness;
6. a separately authorized live observation.

## Safety

The module has no environment, clock, filesystem, network, DB, provider, persistence, deployment, scheduler, or worker dependency. Time is caller-supplied in verification context. Rejected raw input is never returned.

## Hard exclusions

No Railway/Replit action, deployment, config/Secrets, Neon/provider inspection, DB/SQL, DDL/DML/migration, OAuth change, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP merge.

# INT-02B — independent historical receipt intake contract (design only)

**Status:** no historical Production receipts certified; no database access or SQL execution permitted. The following is an evidence intake contract for a separately authorized, read-only review—not an installer.

## Accepted provenance tiers

1. **Observed disposable installation:** Capture the completed 0001–0015 SQL trace and catalog from the explicitly named ephemeral PostgreSQL service. Retain exact workflow run, source commit, target DB identity and contemporaneous SHA256. This proves only a fresh test installation.
2. **Controlled historical DB receipt:** A reviewer independently reads the migration ledger and target schema from a separately authorized, precisely identified database with a read-only credential. Record ledger schema/version, migration filename, applied-at timestamp, script digest, migration runner identity and transaction/commit evidence. Source file bytes are independently pinned to Git. Do not rely on a caller's `verifiedOrigin:true`.
3. **Independent attestation:** A separate accountable approver verifies exact provider project/environment/service/database resource, credential scope, and receipt origin (ideally signed/immutable audit artifact), and validates that both the application and reader observed the same DB target. A digest produced by the submitting application and then copied into an “anchor” is not independent.
4. **Missing ledger:** Classify `unknown`, never infer execution from matching tables or self-reported timestamps. Require a separately reviewed, authorized forensic plan. Do not backfill synthetic receipts or mark legacy migrations as applied.

## Portable evidence bundle v1 (proposed)

A complete immutable bundle should contain:
- `schemaVersion`, `evidenceId`, `collectedAtUtc`, `collectionPrincipal`, `readOnlyAuthorizationRef`
- `sourceCommit`, original script filename and SHA256 from immutable source, and ordered executed receipt list
- `target.provider`, exact project/environment/service/database identifiers, independently confirmed binding, and an opaque authorization reference
- `ledger.source`, `ledger.schemaVersion`, per-migration `appliedAtUtc`, `scriptSha256`, `runnerIdentity`, and transaction status
- `schemaFingerprint` computed from full expected catalog and independently observed catalog
- `witness.attestor`, `witness.method`, `witness.signatureOrImmutableLocation`, `witness.collectedAtUtc`
- explicit `evidenceLevel` and `limitations`

Never collect/store connection strings, secrets, raw Production row values, credentials, or opaque tokens. Merely having these fields populated is not attestation.

## Review outcomes

- `DISPOSABLE_COMPATIBLE`: independent test schema, not Production eligibility.
- `HISTORICAL_SOURCE_PENDING`: legacy DB read-only provenance absent or inadequate.
- `HISTORICAL_COLLISION`: original UGP 0008–0011 collides with main 0008–0011.
- `INCOMPLETE`: missing/duplicate/out-of-order receipts or broken lineage.
- `UNVERIFIED_DATABASE_AUTHORITY`: provider resource/source of truth not independently corroborated.
- `REVIEW_ELIGIBLE`: all inputs independently attested, *still not execution authorization*.

## Explicit approval handoff

Before any live inspection, require scoped user authorization for target, identity, read-only operations, intended outputs, and credential handling. Before any execution, require a separate exact-head reviewed installer plan and separate authorization; never infer approval from a successful preflight or an earlier unrelated migration authorization.

This document does not grant permission for Production SQL, migrations, runtime bootstrap, provider access or deployment.

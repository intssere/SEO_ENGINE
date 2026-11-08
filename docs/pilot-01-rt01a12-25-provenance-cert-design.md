# PILOT-01 RT01-A12.25 — Independent evidence provenance and migration authority certification design

## Status: disconnected source-only design; operational migration BLOCKED

This milestone is NOT a live identity verification mechanism, externally trusted evidence registry, independent signature verifier, cryptographic issuer, migration executor, production-readiness certification, or authorization to inspect a database. All A12.25 CI evidence is synthetic/mock-backed; a fixture PASS is *not* Production PASS. The API always returns `operationalExecutionAuthorized:false`.

## Deduplication and evidence authority
- A12.23 (`pilot-01-rt01a12-23-migration-lineage-gate.ts`) retains source IDs, SHA-256 inventory, exact name/version receipt checks, and conservative main vs legacy/integrated UGP `0008–0015` collision STOP. No renumbering or stamp is introduced.
- A12.24 (`pilot-01-rt01a12-24-disconnected-evidence-gate.ts`) retains the source gate, exact target-bound anchor/binding/ledger/catalog evidence, schema and privilege-drift checks, external witness port, and recovery completeness gate. A12.25 imports and delegates to `assessLineageEvidence`, not a competing ledger or second schema-audit implementation.
- INT-02C-05C/05D source-only consistency validators explicitly reject caller-set `provenanceVerified` and lack external authentication, so A12.25 does not infer trust from their flags. INT-02C-08 overlays selected future Railway Path B architecture, but no current production provider identity, application binding or SQL channel is independently certified. INT-02B PR #1072 references are not evidence of installed production migrations.
- The existing P12.2 recovery design remains a separate source of backup lineage, rollback, target-time and witness requirements. A12.25 inherits A12.24's recovery reference completeness check and makes no PITR/RPO/RTO assertions.

## New disconnected provenance contract

`pilot-01-rt01a12-25-provenance-cert-design.ts` accepts an envelope with exact resource, deployment and source revision, observation ID, SHA-256-shaped nonce, policy revision and bounded UTC issuance/expiry timestamps, plus the existing A12.24 evidence packet. It requires a separately injected authority with three independently trusted facilities:
1. `authenticateEnvelope`: must authenticate exact envelope digest, signature/provenance, target identity, revision, observation, policy revision and separate collector/witness identities against a trusted registry (not caller flags). This PR supplies no implementation.
2. `attestReplayState`: must independently authenticate a *durable append-only* nonce/observation history for the exact target; a reused nonce is rejected and missing/unavailable replay evidence yields UNVERIFIED. This interface performs no reservation or mutation and therefore does not prevent races between separate evaluators. Operational replay resistance requires a future atomic consume protocol, independently authorized.
3. `trustedNow`: supplies trusted time for a short validity window, preventing stale/future claims using caller time.

The result is strictly PASS/BLOCKED/UNVERIFIED as a **mock-evidence contract disposition**, never permission to execute operational SQL or deploy. The A12.24 mainline/UGP historical ambiguity remains BLOCKED even when the caller supplies a mapping reference. No code path connects to runtime, provider, SQL, credentials or authentication.

## Adversarial coverage and limitations

Dedicated offline CI reuses A12.23 and A12.24 tests, adding tests for missing envelope, stale/future/overlong evidence, reused nonce, unavailable or forged replay registry, missing trust verification, independent collector/reviewer separation, observation/policy mismatch, target/deployment substitution, incomplete or tampered migration receipts, legacy-UGP conflict, RLS/role definition drift and missing trusted time. These are mock-backed negative tests, not external provider certification.

**Known limitations:** String-shaped nonce and opaque reference fields are not cryptographic verification; port return values are mockable; no independent trust-anchor identity or append-only registry has been established; this pure module cannot prevent concurrent replay without atomic reservation; source checksums do not prove historical installed state; catalog definition digests are supplied, not collected; witness reference completeness is not a signed receipt; no installed 0008–0015 lineage resolution; no live RLS grants, tenant identity or privilege compatibility certification.

## Operational STOP gates

Before any operational inspection, require a separately reviewed and authorized exact provider/resource/deployment target; independently authenticated app-to-DB binding; segregated collectors and accountable witnesses; concrete signature and trust anchor provisioning; independently witnessed immutable migration receipts; resolved main/UGP collision; trusted digest and schema canonicalization; catalog/grant/RLS comparison; recovery, rollback, backfill/lock assessments; and an exact scoped read-only evidence collection procedure. Any provider access, credential handling, SQL, migration, runtime/worker or deployment requires separate owner approval.

## Governance

Dedicated branch/draft PR only. Standard CI and dedicated offline CI must both pass at exact HEAD, Tahseen must record formal GitHub APPROVED review, all review threads must be resolved, and owner must separately authorize merging the exact HEAD. No production changes, provider operations, operational SQL, migrations, worker activation, public-site writes or deployments are permitted.

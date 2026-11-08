# PILOT-01 RT01-A12.26 — disconnected atomic evidence replay and trust-anchor design

## Operational disposition: BLOCKED / historical lineage UNVERIFIED

A12.26 is a **source-only, mock-backed contract design**. It does not operate on a real database, issue signed trust anchors, establish independent issuer identity, implement a persistent replay registry, provision credentials, or authorize Production migration. Even a mock result of PASS has `operationalExecutionAuthorized:false`.

## Reused foundations — avoid a duplicate security stack

- **A12.23:** `pilot-01-rt01a12-23-migration-lineage-gate.ts` owns canonical source hash/sequence and conservative ledger checks. Legacy UGP `0008–0011` versus mainline `0008–0011` and integrated `0012–0015` remain STOP conditions; a renamed file is never historical execution proof.
- **A12.24:** `pilot-01-rt01a12-24-disconnected-evidence-gate.ts` owns the independently witnessed anchor/binding/ledger/catalog evidence, exact resource/deployment revision checks, grants/roles/RLS catalog drift, backup and rollback completeness.
- **A12.25:** `pilot-01-rt01a12-25-provenance-cert-design.ts` owns externally authenticated evidence/provenance, independent reviewer separation, issuance/expiry and read-only replay state. A12.26 calls `assessProvenanceEnvelope` instead of reimplementing these checks.
- **A12.20:** `pilot-01-rt01a12-20-atomic-custody-adapter.ts` demonstrates ordered locks and DB-clock rechecks in a disposable PG17 context; it is **not** an authorized adapter to the new evidence contract and is not imported or deployed here. Operational DB transactions and roles remain prohibited.
- **INT-02B/INT-02C and P12.2:** Existing authority and recovery documents restrict historic migration attribution, provider binding and recovery certification. A12.26 does not upgrade reported Railway resources, restore observations or CI fixtures into authenticated Production evidence.

## New offline contracts

`pilot-01-rt01a12-26-atomic-evidence-contract.ts` defines:
1. `AnchorCertificate`: issuer ID, key ID, monotonic epoch, exact provider/project/environment/service/database/deployment/revision identity, validity interval and opaque witness reference.
2. `IndependentAnchorAuthority.inspect`: an **unimplemented independent trust verification port** to authenticate trusted root, issuer/key, epoch, rotation and revocation state for the exact target. Caller-provided strings or Boolean flags are never enough for real-world trust.
3. `AtomicEvidenceConsumptionPort.consume`: a **required durable, linearizable single-use compare-and-consume contract**, scoped to authority, target, issuer and epoch. An operational implementation must recheck revocation within the same durable atomic boundary. No production adapter exists in A12.26.
4. `assessAndConsumeEvidence`: composes A12.25 verification, validates anchor identity and trusted-time freshness, rejects revoked/rotated/unknown anchors, and then calls the supplied atomic consumption interface. The result is PASS, BLOCKED or UNVERIFIED, with explicit consumed state for synthetic fixtures and `operationalExecutionAuthorized:false` always.

## Adversarial tests

Dedicated **offline-only** CI runs the existing A12.23–A12.25 suites and additional A12.26 tests: 32 concurrently submitted attempts to consume one synthetic nonce must yield exactly one consumed receipt; subsequent attempts and mismatched package collisions fail; revoked/rotated/unknown or expired issuer anchors fail closed; unavailable verifier/custody store and ambiguous consumption yield UNVERIFIED; cross-target issuer and key substitutions fail; legacy UGP receipts and role fingerprint drift prevent all consumption.

The synthetic adapter uses one JavaScript process with a synchronous map check/set. This is deterministic evidence of the *contract's intended one-use behavior*, **NOT certification of transactional durability, multi-process concurrency, Postgres isolation, serializability, crash recovery or distributed linearizability**.

## Known limitations / production STOP

- The independent anchor verifier and durable ledger are interfaces only, with synthetic mocks. No trust-root registry, signed envelope verification, issuer key material, rotation history or revocation feed is authenticated.
- Separate anchor inspection and consumption create a TOCTOU gap. A future operational transaction must lock/recheck current revocation, issuer key epoch, target and nonce at the same linearization point. If the trust authority is unavailable, consumption must fail closed.
- A12.25's read-only replay attestation is deliberately retained; A12.26's *synthetic* compare-and-consume alone cannot guarantee live atomicity or revocation-order correctness.
- Unknown commit outcomes must not be retried as fresh nonces. Recovery requires an independently authorized read-only lookup bound to the same target, authority and operation.
- Real app binding, installed historical migration receipts, canonical schema, roles/grants/RLS, backup and PITR lineage, and historical main/UGP `0008–0015` resolution remain unverified.

**No operational database access, SQL, credentials, provider operations, migrations, production roles, runtime wiring, workers, public-site writes or deployments** are allowed under this milestone.

## Governance

Draft PR against `main`, no merge. Require exact-HEAD Standard CI and applicable dedicated offline CI SUCCESS, Tahseen formal GitHub APPROVED, zero unresolved threads and separate owner exact-HEAD merge authorization. Beyond A12.26, prioritize separately authorized bounded *evidence acquisition* over more speculative disconnected layers.

# RT01-A12.27 — Bounded operational evidence acquisition readiness (OFFLINE ONLY)

## Decision and limitation

**Design readiness is not live data authority.** This PR supplies an auditable, no-network, no-SQL request specification and mock-backed negative tests. It does not read Railway resources, resolve environment variables, run catalog queries, inspect history, verify independent signatures, or allow production migration. `executionAuthorized:false` and `operationalDatabaseCertified:false` are invariant for every result, including synthetic PASS. **Actual operational identity, historical lineage and production compatibility remain BLOCKED / UNVERIFIED.**

## Existing authoritative contracts reused

| Source | Authority and contribution | Constraint preserved |
| --- | --- | --- |
| `docs/integration/int-02c-05a-railway-metadata-query-contract.mjs` | Existing candidate target IDs, four exact query shapes, SHA-256 query-set fingerprint | Imported directly; no SQL copied, generated, executed or broadened |
| `docs/integration/int-02c-06-railway-operator-inspection-procedure.md` | G0–G5 gates, private least-privilege access, independent binding and witness | G1–G5 are open; no connector-based safe SQL transport established |
| `docs/integration/int-02c-08-authority-recovery-design-reconciliation.md` | Railway Path B is approved as FUTURE architecture; current authority not certified | Historical Path A descriptions not treated as current source of truth |
| `docs/integration/int-02c-05c-independent-evidence-gate.mjs` and `05d-trusted-evidence-source.mjs` | Caller-controlled flags never authenticate provenance | No self-attested approval |
| `lib/db/src/pilot-01-rt01a12-23-migration-lineage-gate.ts` | Canonical source SHA-256 and main/UGP 0008–0015 collision STOP | Source checksum is never installed-history proof |
| `lib/db/src/pilot-01-rt01a12-24-disconnected-evidence-gate.ts` | Exact target identity, witnessed ledger/catalog, drift, recovery requirements | Future **authenticated evidence** still required, not fabricated here |
| `lib/db/src/pilot-01-rt01a12-25-provenance-cert-design.ts` | Independent source/witness, freshness and replay-state contracts | No live trust adapter |
| `lib/db/src/pilot-01-rt01a12-26-atomic-evidence-contract.ts` | Synthetic atomic consumption, issuer, revocation and replay controls | No durable operational implementation and no implicit nonce consume |
| `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` | Separate backup/PITR/rollback/provenance governance | Recovery continuity and RPO/RTO are NOT certified |

## Collection plan (not an execution order)

**G0 architecture:** Record owner-approved Railway Path B as a *target architecture*, not an operational binding. Provider `Postgres` remains only a candidate until independently attested. Exclude isolated restore resources.

**G1 binding (operator-origin evidence later, separately authorized):** Request an independently witnessed unresolved structural binding of the exact running app deployment to the precise provider/project/environment/service/volume and database. Never resolve, copy or output `DATABASE_URL` or its value. A variable **name** or historical expression alone does not satisfy G1.

**G2 access:** Verify a pre-existing private, bounded, read-only metadata principal is neither superuser nor database owner, cannot escalate roles, has no customer-data SELECT, uses a short statement timeout and one attempt, and emits no credentials. No proxy, new role/service, worker, provider mutation or CI connection can be introduced under A12.27.

**G3 scope:** Submit a NEW exact target, operator, immutable collection/approval artifact, independent reviewer, allowlisted query-set fingerprint, output redaction limits and explicitly bounded execution authorization for review. This PR **does not** grant that authorization or authenticate anyone.

**G4 catalog candidate discovery (only after separate approval):** The preexisting INT-02C-05A fixed query shapes are `session_identity`, `catalog_table_names`, `catalog_constraint_names`, and `migration_ledger_candidates`. Those return limited public metadata and candidate ledger TABLE NAMES only; they do **not** establish actual historical ledger rows, checksums, timestamps or RLS/grant/role integrity. If no safe independent channel exists, stop.

**G5 historical receipts (future authorization ONLY):** Independently verify exact migration ledger table/column schema first; then separately review a new source-pinned, fingerprinted, read-only ledger metadata query limited to sanctioned migration identifiers, timestamps and original recorded checksums. Resolve conflicting canonical-main `0008–0011`, legacy UGP `0008–0011` and proposed integrated `0012–0015` from independently witnessed target-bound receipts, not renamed source scripts or source hashes. No ledger-row query exists or is authorized in A12.27.

**Later schema and recovery:** Target-bound catalog comparisons for tables, columns, constraints, extensions, indexes, grants, roles and RLS require additional independently reviewed allowlists and evidence. PITR/backup validation and customer-record integrity remain separate recovery workstreams; no row reads, counts, record hashes, migration apply, cutover or deployment are allowed.

## Non-sensitive collection manifest: REQUIRED fields (future handoff)

- Request and authorization record IDs, exact selected target IDs, exact unresolved app-binding source observation, deployed revision, UTC observation scope and independent witness.
- Fixed 05A query-set SHA-256 fingerprint and four query IDs, collection principal and least-privilege attestation, read-only transaction and timeout plan, private-transport review, one-attempt limit, immutable digest and review custody.
- Explicit source labels: independently observed versus historical operator report versus synthetic/source-derived. No source-file hash or synthetic fixture can be relabeled an operational receipt.
- Negative claims: no provider access, no SQL execution, no resolved credentials, no customer records, no warehouse data, no public-site changes, no role creation, no deployments.
- Stage G5 is a separately approved proposal and cannot be included inside G4 access rights.
- Missing binding proof, role, witness, transport, ledger structure, catalog completeness, or historical receipts must remain `UNVERIFIED` or `BLOCKED` as applicable.

## Delivery

`docs/integration/pilot-01-rt01a12-27-bounded-acquisition-readiness.mjs` imports the exact INT-02C-05A `TARGET`, `QUERY_SET`, validator and fingerprint. It evaluates a **synthetic offline design manifest**, enforcing target, scope, witness separation, private least-privilege session plan, unresolved binding-only requirement, distinct historical follow-up, recovery boundaries and secret redaction. `PASS` means only that the paperwork fixture meets the proposed design. No live collection adapter is present. Dedicated node:test CI exercises query substitutions, target substitution, scope creep, elevated privileges, credential leakage, false lineage resolution, and history row requests.

## Governance

Draft PR, no merge. Exact-HEAD Standard CI and dedicated offline CI SUCCESS, Tahseen formal GitHub APPROVED, zero unresolved review threads and separate owner exact-HEAD merge authorization required. No operational database, SQL, credentials, provider access, migrations, production roles, runtime, workers, public writes or deployment under A12.27.

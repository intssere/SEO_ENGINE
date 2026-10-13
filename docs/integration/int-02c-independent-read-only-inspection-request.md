# INT-02C — independently witnessed metadata inspection request (NOT authorized)

**Scope:** review packet for a future, separately authorized READ-ONLY examination. Neither this document, PR #1108, nor `continue` authorizes connecting to any provider, database, runtime, or credentials.

## Authority chain and independent corroboration

Before any inspection, assign and record named accountable architecture owner, database owner, privacy/security reviewers, collector and independent attestor. Resolve the *current approved* architecture decision. C2Y Path A (Railway runtime with externally certified Neon lineage) remains normative until a new approved ADR; a Railway-managed Postgres resource or a successful Railway PITR test is not automatically Production authority.

Evidence classes must have **separate origins**:

| Class | Required evidence | Not adequate on its own |
| --- | --- | --- |
| Provider control plane | Exact account/project/branch or service/volume/endpoint/database identity, immutable revision/reference, observed-at and collector metadata | Old IDs copied from source, application environment labels |
| Application binding | Deployment identity/config revision and independently resolved non-secret structural database reference matching provider resource | Database URL, hostname text, a successful TCP connection |
| Database metadata | Independently read system/database identities, migration ledger metadata, catalog structure in a named read-only snapshot | Matching table count, fixture schema, self-declared ready flag |
| Execution history | Each actually recorded migration identity and source hash, ordering, runner, time, transaction/audit reference and original-vs-renumbered UGP namespace | File hashes generated from repository, simulated receipts or inferred SQL effects |
| Attestation | Separate reviewer signature or immutable audit artifact, explicit target binding, collection method and limitations | Same submitter acting as their own independent anchor |

## Proposed exact-scope request fields

- **Target:** provider/account/project; Neon branch/endpoint/database OR a separately approved alternative with native lineage fields. No substitutions of Railway IDs into Neon fields.
- **Purpose:** independently determine DB authority and migration history; **not** write, repair, classify ready automatically, or validate personal data.
- **Inspection method:** allowlisted provider metadata and read-only catalog/ledger metadata; least-privilege account, bounded session, statement timeout, repeatable-read read-only where feasible, no database client with migration or DDL capabilities.
- **Exclusions:** connection strings, tokens, environment-variable dumps, personal records, business row values, log payloads, write SQL, DDL, replay/backfill, schema alterations and provider configuration changes.
- **Outputs:** redacted metadata-only evidence, capture UTC and source/revision, separately witnessed digest/location, explicit UNKNOWN for missing ledger, and discrepancy report; no secrets.
- **Approval:** exact target IDs; specific permitted operations; collection principal, expiration, approvers, destination, artifact retention/deletion rules, and revocation path.
- **Stop conditions:** any identity ambiguity, absent read-only permission, unexpected non-target resource, ledger gap, legacy 0008–0011 collision, suspected PII leakage, drift or uncertain source of truth.

## Evidence processing decision table

| Finding | Disposition |
| --- | --- |
| Independent resource and binding not corroborated | `UNVERIFIED_DATABASE_AUTHORITY`; stop |
| No historical migration ledger | `HISTORICAL_SOURCE_PENDING`; stop; do not synthesize |
| Original UGP 0008–0011 found on target | `HISTORICAL_COLLISION`; stop; investigate separately |
| Partial, conflicting, unknown or mixed history | `INCOMPLETE`; stop; no repairs |
| Source/observed schema compatible but receipts untrusted | `HISTORICAL_SOURCE_PENDING`; stop |
| Fully independently authenticated evidence | May become **review eligible only** after independent reviewers agree; never execution authorized by this packet |

## Authorization boundary

Any future inspection needs separate user approval of exact target and read-only operations. Production migration execution requires yet another exact-target, exact-head installer review, rollback design and explicit authorization. Do not wire evidence capture into app startup, CI, schedulers or normal deployment. PR #1108 is deliberately documentation-only.

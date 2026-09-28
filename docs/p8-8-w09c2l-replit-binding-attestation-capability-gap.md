# P8.8 W09-C2L — Replit binding-attestation capability gap review

**Issue:** #612  
**Status:** OFFLINE CAPABILITY REVIEW — NO LIVE OPERATION AUTHORIZED

## 1. Decision

The currently available Replit interfaces cannot satisfy W09-C2K Side-R recovery.

This is a capability-gap finding, not evidence that the Production database binding changed or is incorrect.

## 2. Certified basis

- canonical main at review creation: `7cb4ecdd71367ae2b3cdc59215c93915597cd6fc`
- W09-C2K blob: `6175983bb5f1b4ef797d8b6e0b2408e7c78d4a2b`
- Replit app/repl: `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`

No secret or Production database observation was used for this review.

## 3. Available Replit capability matrix

| Interface | Structured | Authority | Exposed identity | W09-C2K eligible |
|---|---:|---|---|---:|
| publication status | yes | Replit deployment control plane | repl input, deployment ID, status, public URL | partial only |
| app list/search/resolve | yes | Replit app catalog | repl ID, title, app URL, update time | no |
| Agent question | no; natural-language answer | interpretation over app/code behavior | unconstrained prose | no |
| app update | mutation | Replit Agent | not an evidence read | forbidden |
| publish/republish | mutation | Replit deployment control plane | schedules deployment | forbidden |

The structured publication-status interface does not expose database provider, provider project/resource ID, branch, database, timeline/lineage, endpoint/compute, or an immutable database-binding association.

## 4. Why Agent inspection does not close the gap

A Replit Agent answer can describe configuration or code, but it is not a structured authoritative binding object tied to the exact deployed revision. It therefore cannot independently prove what database resource the current Production deployment is bound to.

Using Agent prose would weaken W09-C2K and is prohibited as certification evidence.

## 5. Why secret parsing does not close the gap

Reading `DATABASE_URL`, an environment variable, a secret UI value, process environment, logs containing credentials, or a connection string and then redacting/parsing it violates W09-C2K's secret-non-observability invariant.

No implementation may retrieve the secret merely to derive non-secret endpoint/project identity.

## 6. Required trust boundary

A qualifying attestation must originate on the authoritative side of the credential boundary. The platform or a trusted binding broker must map the deployment's secret binding to resource identity before any output crosses into the application/operator/assistant boundary.

Required properties:
1. input is the exact repl/deployment or immutable deployment revision;
2. binding lookup occurs inside the trusted platform boundary;
3. credential material is never returned to the caller;
4. output is a typed allowlist of sanitized identity metadata;
5. output is cryptographically or control-plane associated with the exact deployment/binding revision where possible;
6. absence/ambiguity fails closed;
7. the mechanism is read-only and has no database session.

## 7. Minimum attestation contract

The smallest useful response is a typed object containing:
- repl ID;
- deployment/publication ID;
- deployment status;
- binding association/revision ID;
- provider;
- provider project/resource ID;
- branch ID;
- database name;
- timeline/lineage ID if available;
- endpoint/compute ID;
- observed-at timestamp;
- authoritative provenance identifier.

The implementation must allowlist these fields and reject unexpected credential-bearing fields.

## 8. Preferred implementation order

### A. Native Replit structured metadata
Prefer a Replit control-plane API/metadata surface that directly exposes attached database resource identity with credentials suppressed. If such an interface becomes available, certify it before use.

### B. Platform-side attestation broker
If Replit supports an internal deployment/binding integration that can resolve resource identity without exposing credential values to the application/operator, implement a narrow read-only broker returning only the allowlisted attestation object.

### C. Application-side secret parsing
Not acceptable. Do not implement.

A repository endpoint that reads its own `DATABASE_URL` and emits parsed metadata is also not acceptable because the secret crosses into application execution and is observed by code outside the authoritative binding boundary.

## 9. Engineering gates

Any future broker/seam work must be split:

1. **offline design/certification** — interface, provenance, allowlist, fail-closed tests;
2. **implementation** — isolated code/config only within an explicitly certified boundary;
3. **deployment/configuration** — separate explicit Production authorization;
4. **live Side-R attestation** — fresh one-shot explicit authorization;
5. **Side-N/equality** — only under a fresh W09-C2I-compatible authorization.

A generic continuation does not authorize gates 3–5.

## 10. Testing requirements

Before deployment, synthetic tests must prove:
- credential-shaped input cannot appear in output;
- unknown fields fail closed;
- missing project/branch/database/endpoint identity yields UNPROVED;
- deployment mismatch yields UNPROVED;
- stale attestation yields UNPROVED;
- provider mismatch yields UNPROVED;
- no network/database connection is made by the verifier;
- no raw or hashed secret is persisted/logged;
- receipts contain only allowlisted sanitized fields.

## 11. Current consequence

W09-C2K is correctly specified, but no currently exposed Replit interface available to this project meets it.

Therefore:
- Side R remains UNPROVED;
- do not retry W09-C2J;
- do not perform Side N merely because the candidate Neon project exists;
- do not retry W09-C2H;
- do not start Production Stage 0.

The next milestone is to identify or implement an authoritative platform-side attestation capability. If that requires Replit configuration, deployment, credentials, or a new platform integration, it requires a separately reviewed implementation plan and explicit authorization before any live change.

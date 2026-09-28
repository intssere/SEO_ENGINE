# P8.8 W09-C2K — Secret-free Replit Production binding identity recovery specification

**Issue:** #610  
**Status:** OFFLINE SPECIFICATION ONLY — NO LIVE PRODUCTION OPERATION AUTHORIZED

## 1. Purpose

The consumed W09-C2J attempt correctly failed closed at Side R. Replit's current publication-status control-plane observation independently established the current deployment identity, status, and public URL, but did not expose the database provider/resource identity required by W09-C2I.

This specification defines the minimum acceptable recovery mechanism. It does not retry W09-C2J and grants no Production access.

## 2. Frozen evidence basis

- canonical main at specification creation: `36af586562075e5ef1586ef24b51f49d7e3f7614`
- W09-C2I contract blob: `4b038eec0529027e2cb7d1fa1a4845083409c434`
- W09-C2J authorization packet blob: `fdcd944df4979071441983bae7000e717e381170`
- Replit app/repl ID: `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`
- W09-C2J observed deployment: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- observed publication status: `success`
- observed public URL: `https://dsseoengine.replit.app`

The deployment observation above is historical after this specification is merged. A future live attempt must independently re-establish current deployment identity.

## 3. Recovery requirement

Side R may be recovered only through an independently verifiable, secret-suppressing Replit/platform mechanism that derives identity from the database binding actually attached to the current Production deployment.

The mechanism must establish provenance tying the sanitized identity to:
1. the exact Replit app/repl;
2. the exact current successful Production deployment/publication;
3. the exact database binding consumed by that deployment.

A repository constant, operator assertion, historical receipt, app source value, resource name, public URL, or candidate Neon resource is not sufficient.

A Replit Agent natural-language answer is not sufficient independent control-plane evidence because it is an interpretation layer rather than authoritative binding metadata.

## 4. Allowed sanitized output

The mechanism may emit only:
- Replit app/repl ID;
- current deployment/publication ID;
- publication status and public URL;
- database provider;
- provider project/resource ID;
- branch ID;
- database name;
- timeline/lineage ID where the platform safely exposes it;
- endpoint/compute ID actually targeted by the current binding;
- binding/deployment revision or immutable association ID where available;
- attestation timestamp;
- provenance/mechanism identifier sufficient to distinguish authoritative control-plane evidence from application inference.

No field is required to be emitted when the platform cannot expose it safely; missing identity required by W09-C2I makes Side R UNPROVED.

## 5. Secret non-observability invariant

The recovery mechanism must not return, print, persist, log, hash, transform, compare externally, or transmit through chat:
- `DATABASE_URL`;
- connection strings;
- usernames;
- passwords;
- tokens;
- credential-bearing hosts;
- secret query parameters;
- environment-variable values;
- reversible or irreversible derivatives of secret values.

The operator/assistant must not retrieve a raw secret and then redact it. Secret suppression must occur before the evidence crosses the authoritative platform boundary.

## 6. Disallowed recovery mechanisms

The following cannot certify Side R:
- reading Replit Secrets/environment values;
- shell/process environment inspection;
- application debug endpoints exposing environment/configuration;
- parsing a raw connection string locally or remotely;
- database connection or SQL;
- DNS/hostname inference derived from a secret;
- Replit Agent prose;
- source-code constants or comments;
- GitHub configuration/history alone;
- Neon candidate existence alone;
- table/schema similarity;
- historical endpoint continuity;
- operator memory or manual transcription of a secret.

## 7. Acceptable mechanism classes

A future implementation may qualify only if its interface contract itself guarantees secret suppression and authoritative provenance. Examples of potentially acceptable classes are:
- a Replit control-plane API that returns attached database resource IDs without returning credential material;
- a platform-generated binding metadata/attestation object scoped to a deployment;
- a Replit UI/control-plane metadata surface whose structured fields can be captured without revealing secret values.

This specification does not assert that any such mechanism currently exists.

If the only available platform interface exposes the secret value, recovery is UNPROVED. Do not access that interface merely to test whether redaction is possible.

## 8. Freshness and deployment binding

A future live Side-R receipt must:
1. first obtain current publication status for the exact repl;
2. require a successful current deployment;
3. obtain sanitized binding identity from an authoritative source tied to that exact deployment or an immutable deployment revision;
4. record both observations in the same bounded attempt;
5. fail closed if the binding evidence is stale, app-wide but not deployment-bound, ambiguous, or associated with another deployment.

A deployment change between publication observation and binding attestation invalidates the attempt.

## 9. Verification rule

Recovery PASS means only that a compliant Side-R mechanism exists and produced current sanitized identity with authoritative provenance.

It does not itself establish W09-C2I equality with Neon. After a recovered Side R, a separately authorized one-shot lineage attestation must perform the bounded Side N observation and equality comparison required by W09-C2I.

If project, branch, database, lineage, or endpoint identity required for that comparison remains unavailable, classify UNPROVED.

## 10. Receipt schema

Record only:
- specification blob and canonical commit;
- attempt authorization identity;
- repl ID;
- current deployment/publication ID/status/URL;
- authoritative mechanism/provenance identifier;
- sanitized provider/project/branch/database/timeline/endpoint identity fields;
- deployment-binding/freshness verdict;
- secret-non-observability verdict;
- overall PASS / FAIL / UNPROVED;
- counters confirming zero secret reads, DB sessions, SQL, mutations, deployments, retries, and provider/public-site writes.

Never record secret values or derivatives.

## 11. Future authorization requirements

No live recovery attempt is authorized by this specification.

A future authorization packet must freeze this specification's merged blob and canonical source identity and permit exactly:
- one current Replit publication-status observation;
- one secret-suppressing authoritative Replit binding-identity observation using a pre-certified mechanism;
- sanitized receipt recording;
- fail-closed stop.

It must explicitly forbid secret/environment reads, raw connection-string retrieval, SQL/database sessions, Neon inspection unless separately included for a full W09-C2I attempt, configuration/credential changes, deployment/publication/restart, migrations/DDL/DML, provider/public-site writes, scheduler/worker/autonomous activation, Railway/UGP, W03–W07, Stage 0, and automatic retry.

A second attempt requires fresh explicit authorization.

## 12. Consequence

Until an acceptable authoritative Replit binding metadata mechanism is identified and certified, current Production lineage remains UNPROVED and W09-C2H may not be retried.

Do not weaken W09-C2I by substituting candidate Neon coherence for current Replit binding proof.

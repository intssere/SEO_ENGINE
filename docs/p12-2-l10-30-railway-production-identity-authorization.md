# P12.2 L10.30 — Railway Production identity inspection authorization packet

**Issue:** #952. **Phase:** repository-only specification; this document is NOT live authorization.
**Certified GitHub base:** `aff7b79b7e3642e792c0413aa747a4df57c85975` (PR #947, push-to-main CI #37902549713: SUCCESS).
**Prerequisite:** `docs/p12-2-l10-29-packet-014-production-readonly-readiness.md`.

## Objective and boundary

Obtain fresh, independently sourced **Railway control-plane metadata only** to identify the currently deployed service/image and distinguish it from GitHub source history. This packet defines a potential future inspection; **L10.30 does not execute it**. It cannot establish Production database contents, the eligibility of the historical Packet 014 reconciliation, website freshness, or completed live certification.

## Historical selectors — require fresh identity matching

The following values were recorded in `CURRENT_STATE.md` at the historical F24 closeout. They are **expected selectors, not fresh assertions**:

| Field | Historical recorded value |
|---|---|
| Railway project ID | `52265e29-921b-4652-ac0d-9da4e5e69936` |
| Railway Production environment ID | `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` |
| Railway SEO service ID | `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` |
| Service alias | `seo-engine-shadow` |
| Historical deployed image | `ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22` |
| Historical deployment | `18486079-d88f-4376-bc5c-abc14e190b7c` |
| Historical Railway Postgres service ID | `b69e0633-7ab9-40ab-85f3-c9edd6acb031` |

**Never assume the current deployment equals the historical deployment.** A matching image digest alone does not prove identity of database, schema, or application runtime state.

## Future control-plane request — operation allowlist (not executed)

An operator must first identify which *specific Railway connector actions* currently support read-only metadata retrieval, and record their exact action names, argument schemas and access scope in a separate approval request. Do not assume connector availability or substitute mutating actions.

Only after a separate exact authorization, allow at most:

1. **One** read-only lookup of the specified project and its Production environment identity, with a timestamped response.
2. **One** read-only lookup of the exact service identity, environment membership and configured deployment source **without retrieving configuration variables or secrets**.
3. **One** read-only lookup of the most recent/active deployment's ID, status, source image digest and immutable source reference, with time fields.
4. **One** read-only status verification of that exact deployment, if the first deployment response lacks final health/state information. This fourth call is optional and requires its own explicit inclusion in the approved operation count.

No broad enumeration of unrelated projects or environments, and no repeated polling. If any needed field is unavailable, classify it as UNKNOWN and stop. Do not try an alternate API, shell, terminal, logs, deployment actions, or privilege escalation.

## Expected matching and receipt

Bind all results to the approved project/environment/service selector triple. Reject mismatched project scope, environment confusion, missing/ambiguous active deployment, changing active IDs between responses, absent source digest, unstable/nonterminal status, or inaccessible metadata.

Produce one redacted receipt whose minimum fields are:
- inspection timestamp (UTC), source connector/action identifiers and response references;
- approved GitHub main SHA and source provenance;
- Railway project/environment/service IDs, **freshly observed** deployment ID, immutable digest, deployment state and relevant timestamps;
- comparison against historical F24 image/deployment with `MATCH`, `CHANGED`, or `UNKNOWN` separately for each attribute;
- operation-count tally, explicit forbidden-operation tally of zero and `PASS_IDENTITY` or `BLOCKED` outcome;
- unresolved evidence gaps and required next human approval.

Keep passwords, connection URLs, tokens, variable values, log bodies, credentials and secret-bearing payloads **out of the receipt**. Prefer immutable evidence references or sanitized hashed extracts rather than dumping provider responses.

A `PASS_IDENTITY` receipt means **only** that the Railway control-plane identity was established at inspection time. It does **not** mean the database contains Packet 014 records or that Production SQL is authorized.

## Future authorization envelope

The operator must present a request explicitly specifying:
- one exact project/environment/service tuple, relevant expected historical image, and GitHub source baseline;
- enumerated connector action names and exact argument selectors;
- maximum three required metadata reads, plus a clearly authorized optional fourth status read;
- one bounded session with explicit expiration and zero automatic retries;
- receipt location/redaction policy and the stop-on-unknown conditions.

Illustrative **inert** approval shape (not executable as written):

`AUTHORIZE:P12_2_L10_30_RAILWAY_METADATA_ONLY:<exact-target-and-action-fingerprint>:<expiry-and-receipt-fingerprint>`

Only a future value derived from freshly reviewed immutable action definitions and explicitly approved by the user can become authorization. A generic `continue`, GitHub merge, or an approval for SQL does not grant this metadata-inspection scope.

## Transition gate to L10.31 or later Production SQL

A newly evidenced, nonambiguous Railway deployment/image identity may justify *proposing* a subsequent schema and SQL-read-only authorization. The next proposal must independently pin: Production database identity, allowed read-only role, source query-set fingerprint from L10.26, exact three SELECTs and their order, expected values, timeout/cardinality ceilings, no-write transaction conditions, secure receipt destination and expiration.

An older immutable image may lack newer code; if so, **stop** and evaluate the separately governed image-release process. Never deploy automatically to make the packet pass. Never treat control-plane metadata as proof that the historical Packet 014 SQL preflight passed on Production.

## Explicit prohibitions for this milestone

No Railway Production metadata inspection has been performed by this work. No Production database connection/SELECT, DML/DDL, migrations, deployment/image transition, Railway configuration or secrets read/write, environment variable lookup, providers/OAuth, live crawl, Shopify/public-site activity, scheduler/worker activation, retries or mutation of any historical Packet 014 evidence.

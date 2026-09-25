# P8.8 W09-C2D — Production Binding Attestation Bridge

**Issue:** #533  
**Status:** SPECIFICATION — REAL PRODUCTION BINDING EXECUTION NOT AUTHORIZED  
**Baseline:** `9116b9bba4230d0787200ef7d627eac6a66e27e6`

## 1. Problem

W09-C2C exhausted the currently exposed read-only Replit and Neon control-plane metadata paths without proving the current Replit Production publication-to-database binding. Gate A therefore remains fail-closed.

W09-C2D defines a minimal bridge that can inspect the *shape* of an already-configured Production database binding locally, redact secret material before any output, and emit only identity hints suitable for independent provider control-plane corroboration.

This document does not authorize execution against the real Production binding.

## 2. Security invariant

The bridge is a pure parser/normalizer.

It MUST NOT:

- open a database session;
- perform DNS resolution;
- open a socket;
- make HTTP/provider/public-site requests;
- execute SQL;
- call a database client;
- log, persist, hash, echo, or return the raw binding;
- return username, password, token, query-string secret, or full URI;
- modify environment/configuration/secrets;
- deploy, restart, publish, schedule or activate runtime work.

The input exists only in process memory for the duration of parsing.

## 3. Input contract

The bridge accepts exactly one caller-supplied opaque string representing an already-resolved database binding.

It MUST NOT read `process.env` itself. Environment selection and authorization remain outside the bridge.

The caller owns:

- proving that the supplied value came from the current Production publication;
- ensuring the value is passed without display/logging;
- preventing fallback to Development, Railway staging or another environment.

Missing, empty, malformed or unsupported input fails closed.

## 4. Supported binding family

Initial implementation may recognize only PostgreSQL-style URI schemes:

- `postgres:`
- `postgresql:`

Any other scheme fails closed.

Recognition of a PostgreSQL URI does not establish that the resource is Neon.

## 5. Sanitized output contract

The bridge may emit only:

```text
parser_version
scheme_family
host
port
database_name
provider_hint
endpoint_or_compute_hint
project_hint
branch_hint
timeline_or_equivalent_hint
binding_fingerprint
secret_material_exposed
network_access_performed
database_session_opened
state_mutated
result
code
```

### Required redaction

Output MUST NOT include:

- raw URI;
- username;
- password;
- query string;
- URL fragment;
- environment-variable value;
- secret-bearing error text.

Errors use fixed codes, not interpolated input.

## 6. Identity hints

Hints are non-authoritative.

### Host

The normalized hostname may be emitted because it is needed to correlate the binding with provider control-plane endpoint metadata.

### Database name

The decoded path database name may be emitted after strict validation. It is identity metadata, not a credential.

### Provider hint

A provider hint may be derived only from a frozen hostname grammar. For Neon, a recognized Neon endpoint hostname may yield `provider_hint=neon`. Otherwise use `unknown`.

### Endpoint/compute hint

If the frozen provider hostname grammar embeds a provider endpoint identifier, that identifier may be extracted. The parser must not invent an endpoint from arbitrary host text.

### Project/branch/timeline hints

These fields remain null unless the URI itself contains an independently specified, non-secret identity component with a frozen grammar. Historical P3.6 values must never be injected as defaults.

## 7. Binding fingerprint

A fingerprint is optional defense-in-depth evidence, not identity authority.

If emitted, it MUST be calculated only from the already-sanitized identity projection, never from the raw URI or credentials. This prevents the evidence artifact from becoming a stable hash of secret material.

The canonical projection must have fixed field order and explicit nulls.

## 8. Fail-closed codes

At minimum:

- `missing_binding`
- `binding_too_large`
- `unsupported_scheme`
- `malformed_binding`
- `missing_host`
- `invalid_host`
- `missing_database_name`
- `invalid_database_name`
- `unsupported_provider_shape`
- `sanitization_failure`

No failure message may contain input substrings.

## 9. Synthetic implementation tests

Implementation certification requires synthetic fixtures only.

Tests must prove:

1. username/password never appear in success output;
2. query parameters and fragments never appear;
3. raw URI never appears;
4. malformed input fails with fixed codes;
5. unsupported schemes fail closed;
6. no ambient `DATABASE_URL` is read;
7. no network/database client is invoked;
8. Neon-shaped synthetic hosts yield only grammar-supported hints;
9. non-Neon PostgreSQL hosts do not become Neon by inference;
10. fingerprints change only when sanitized identity fields change, not when credentials/query secrets change;
11. historical P3.6 identifiers are never defaulted into output;
12. output keys are exactly allowlisted.

## 10. Production execution boundary

After implementation and CI certification, a separate explicit authorization is required to invoke the bridge with the real Production binding.

That invocation must:

1. resolve the current Replit Production binding without displaying it;
2. pass it once to the pure parser;
3. retain only the sanitized output;
4. prove `secret_material_exposed=false`;
5. prove `network_access_performed=false`;
6. prove `database_session_opened=false`;
7. prove `state_mutated=false`;
8. perform no retry after an ambiguous result unless separately authorized.

A successful parse is not by itself Gate A PASS. Extracted host/endpoint/database hints must be independently corroborated against provider control-plane metadata and tied to the current Production publication.

## 11. Gate progression

Possible bridge outcomes:

- **sanitized identity hints available:** freeze them and proceed to a separately reviewed provider-control-plane corroboration step;
- **unsupported/ambiguous binding:** Gate A remains blocked;
- **binding points somewhere other than the historical candidate:** classify lineage change before any catalog access.

No outcome authorizes SQL, recovery certification, schema inspection or migration.

## 12. Explicit non-authorization

This specification authorizes no real Production binding inspection, Production DB session/catalog query, SQL, DDL/DML/migration, credential/config/gate change, secret disclosure, provider/public-site network request, Railway staging mutation, deployment/publication/restart, scheduler/worker/runtime activation, W03–W07 execution, Task #51/#53/#54 execution, W09-C Stage 0, provider-read addendum, W10, or UGP reconciliation/merge.

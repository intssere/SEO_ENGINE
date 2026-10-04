# P12.2-L10.4 — packet 007 durable robots-attribution certification

Packet 007 is the fresh post-L10.3 bounded pilot:

- packet fingerprint: `dffb4db56c41d024f97fef80fd37e2f93adeb260136cbcd9554fefe6c43706a1`
- run ID: `p12-2-diamond-shelf-bounded-pilot-007`
- observed at: `2026-10-04T15:39:52.448Z`
- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`
- canonical origin: `https://diamondshelf.us`
- phase: `bounded_pilot`

Its packet-specific live-crawl authorization has already been consumed and must never be replayed.

## Certification purpose

L10.4 is a separate SELECT-only Production Postgres certification. It does not execute a crawl.

The certification returns and validates:

- the exact durable packet/invocation identity;
- the latest durable checkpoint and terminal-failure counter;
- zero `first_party_crawl_completed_runs` rows for this bounded pilot;
- `terminalFailures`;
- `policyRejections`;
- `robotsPolicyRejections.total`;
- the aggregate `robotsPolicyRejections.reasons` array;
- `otherPolicyRejections`;
- permanent HTTP failures;
- attempts-exhausted network timeout, connection reset, transport unavailable, and HTTP failures.

The closed robots reason set is:

- `http_unavailable`
- `redirect_limit`
- `response_oversize`
- `malformed_policy`
- `scope_validation`
- `secure_transport_rejection`
- `transport_error`
- `unclassified`

## Integrity guards

The SELECT-only guards fail closed unless:

1. exactly one invocation row matches packet 007's immutable identity;
2. the stored receipt is completed, single-attempt, non-retried, and fingerprint-linked;
3. robots attribution is an object containing a numeric total and reasons array;
4. every persisted reason belongs to the closed reason set;
5. every reason count is a positive integer;
6. no robots reason appears more than once;
7. the sum of robots reason counts equals `robotsPolicyRejections.total`;
8. `robotsPolicyRejections.total + otherPolicyRejections = policyRejections`;
9. policy rejections + permanent HTTP + exhausted transient classes = `terminalFailures`;
10. durable attribution `terminalFailures` equals the latest checkpoint's `terminalFailures`;
11. a durable checkpoint exists with matching payload/checkpoint fingerprint;
12. no completed whole-site run exists for packet 007.

## Query and execution boundary

The runner contains exactly nine single-statement `SELECT` queries. It rejects mutation keywords and semicolons before any database invocation.

At runtime it additionally enforces:

- exact Railway project/environment/Postgres service identity;
- exact L10.4 authorization literal;
- one execution attempt;
- zero retries;
- no fallback transport;
- `default_transaction_read_only=on`;
- a 15-second statement timeout;
- no database credential in `psql` argv;
- bounded stdout/stderr;
- no crawl execution;
- no provider writes;
- no public-site writes.

The L10.4 read-only authorization is derived from the immutable query set and packet identity:

`AUTHORIZE:P12_2_L10_4_PACKET_007_READ_ONLY:<authorization-fingerprint>`

Generic `continue` is not authorization to run the Production certification.

## Release boundary

The certification image may be released only from canonical `main` through the dedicated manual workflow. Its release authorization is:

`AUTHORIZE:P12_2_L10_4_PACKET_007_CERT_IMAGE_RELEASE:<canonical-commit>:<canonical-tree>`

The release workflow requires exact `main`, run attempt 1, exact authorization/source identity, immutable GHCR push, `linux/amd64`, provenance `mode=max`, SBOM, registry digest readback, and published attestation.

After the image is released, a separate explicit Railway mutation/deployment authorization is still required before staging or running the SELECT-only Production certification.

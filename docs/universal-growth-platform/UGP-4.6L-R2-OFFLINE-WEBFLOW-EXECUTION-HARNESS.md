# UGP-4.6L-R2 — Offline Webflow captured-evidence execution harness

This harness executes the already-merged UGP-4.6L-R attestation against the two successful Webflow captures without making another provider request.

## Certified boundary

The CLI accepts exactly two positional local filesystem paths, in this order: Pages JSON, Collections JSON. All provider metadata is fixed in source: Webflow Site ID `6ab94b0baca74bd07f84a09e`, API origin `https://api.webflow.com`, GET-derived effective routes, HTTP 200, JSON content type, Pages acquisition size 576 bytes, and Collections acquisition size 214 bytes.

It has no URL, token, Authorization-header, credential, method, status, content-type, resource, site-ID, or byte-count options. It reads the two files, parses JSON, delegates to `attestCapturedWebflowEvidence()`, and writes only sanitized deterministic JSON to stdout. Missing/extra arguments, filesystem errors, malformed JSON, and attestation failures terminate non-zero.

The harness performs no network/provider call, provider/public-site write, credential access, persistence, database/schema operation, scheduler/worker activation, deployment, or publication.

## Operator command after merge

From `artifacts/api-server`, use the repository script with the existing captures:

`pnpm ugp:4.6l-r:attest -- "%TEMP%\\ugp46l-webflow-pages.json" "%TEMP%\\ugp46l-webflow-collections.json"`

PowerShell may alternatively pass `$env:TEMP`-expanded paths. Do not supply or paste a Webflow token; the harness does not accept one.

The resulting request/state/receipt fingerprints are the inputs for the separate durable UGP-4.6 certification-evidence review.

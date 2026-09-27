# UGP-4.6L-R — Offline captured Webflow evidence receipt attestation

## Purpose
Normalize the already-acquired bounded Webflow Data API v2 evidence through the merged UGP-4.6 provider contract without performing any additional provider or network operation.

## Bound live target
- customer site: `https://seo-engine-ugp-test.webflow.io`
- Webflow site ID: `6ab94b0baca74bd07f84a09e`
- provider API origin: `https://api.webflow.com`
- Pages capture: GET `/v2/sites/6ab94b0baca74bd07f84a09e/pages`, HTTP 200, JSON, 576 acquisition bytes
- Collections capture: GET `/v2/sites/6ab94b0baca74bd07f84a09e/collections`, HTTP 200, JSON, 214 acquisition bytes

The earlier Collections 403 attempts are fail-closed diagnostics and are not successful receipt inputs.

## Offline attestation contract
`attestCapturedWebflowEvidence` requires exactly one Pages observation and one Collections observation. It verifies exact API URL, HTTP 200, JSON content type, bounded acquisition size, and then delegates normalized payload validation and deterministic request/state/receipt fingerprinting to `ugp-4-6-webflow-read-provider-v1`.

The Webflow connection identity is bound to the exact site ID through `externalAccountId`. Pages maps to `read.content` + `pages:read`; Collections maps to `read.resource` + `cms:read`.

## Tamper evidence
Normalized payload content participates in the state and receipt fingerprints. A changed payload therefore changes both fingerprints even if acquisition metadata such as the reported byte count is unchanged.

## Safety assertions
The attestation is offline only: zero network calls, zero credentials, GET evidence only, zero provider/public-site writes, zero persistence, zero DB/schema work, zero runtime activation, and zero deployment/publication.

No token value, Authorization header, or other credential material belongs in source, tests, receipts, logs, or durable certification evidence.

## Exit
After exact-head CI and merge, execute the offline attestation against the two existing local captures. Record only sanitized deterministic receipt evidence in a separate reviewed certification artifact. UGP-4.6 is complete only after that durable evidence is reviewed and merged.

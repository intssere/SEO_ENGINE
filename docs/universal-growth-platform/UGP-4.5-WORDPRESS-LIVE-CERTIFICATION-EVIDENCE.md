# UGP-4.5 — WordPress live read-only certification evidence

Status: certification evidence candidate

This record binds the UGP-4.5 WordPress read-only provider harness, the separately authorized UGP-4.5L live observations, and the UGP-4.5L-R offline canonical normalization receipts. It does not certify WordPress write support or grant any execution authority.

## Certified lineage

- Initiative baseline and offline attestation implementation: `5e654c2396443a3097eaa754c6d4acd5a1f6ac1c`
- Canonical production source observed during offline attestation: `main@6ba9ea97aefa03bfe55cbf67bb8743c19f8d8d06`
- Production tree observed unchanged: `cd4cf383353e4c874217a4ee2a2e6d151f56ea73`
- WordPress certification harness version: `ugp-4-5-wordpress-read-provider-v1`
- Captured-evidence attestation version: `ugp-4-5l-captured-evidence-attestation-v1`
- Canonical origin: `https://kalkeenwellness.com`

## Authorized live observations

Only these two unauthenticated GET observations were acquired. No additional WordPress route or method is part of this certification.

### Pages

- Route: `/wp-json/wp/v2/pages`
- Effective URL: `https://kalkeenwellness.com/wp-json/wp/v2/pages`
- HTTP status: `200`
- Content type: `application/json; charset=UTF-8`
- Acquisition response bytes: `264467`
- Response Date header: `Sun, 27 Sep 2026 11:45:55 GMT`
- WordPress total: `11`
- WordPress total pages: `2`
- JSON parse: valid
- Redirect/origin drift: none observed

### Posts

- Route: `/wp-json/wp/v2/posts`
- Effective URL: `https://kalkeenwellness.com/wp-json/wp/v2/posts`
- HTTP status: `200`
- Content type: `application/json; charset=UTF-8`
- Acquisition response bytes: `1942`
- Response Date header: `Sun, 27 Sep 2026 11:46:24 GMT`
- WordPress total: `1`
- WordPress total pages: `1`
- JSON parse: valid
- Redirect/origin drift: none observed

## Canonical offline normalization

The already-captured payloads were normalized once through the merged UGP-4.5L-R offline attestation path. The attestation itself made no HTTP/provider request and performed no database operation.

### Pages receipt

- Canonical payload bytes: `259556`
- Request fingerprint: `8187b89baaae80fc53ed8b8f5a5abc0332c0ba1420037cc966b6a97c672e7963`
- State fingerprint: `6f559f5d0d7abc0a21fe0550e3fba1b634d20eb040ee9f520a459da914f47c38`
- Receipt fingerprint: `8954690b44631c7ead37b53937260ad2c55020e595e762b5778838cc2459829a`

### Posts receipt

- Canonical payload bytes: `1871`
- Request fingerprint: `72ae74f1ea4c9589677a61378b002a395deabb749b07212e84173350b0b0fad4`
- State fingerprint: `be9c43fb2641059b479f5b02b594de75359cb6181996663e31db49fc7469ade6`
- Receipt fingerprint: `2865171a030f7bb8285f6f407ec2604bf6e27fa924e453a2f5a4cd26039a8c46`

The acquisition `responseBytes` and normalized `payloadBytes` intentionally differ: the former is the captured response-file size and the latter is the stable normalized JSON byte count produced by the canonical receipt normalizer.

## Safety assertions

The offline attestation returned:

- `offlineOnly=true`
- `networkCalls=false`
- `getOnly=true`
- `credentials=false`
- `providerWrites=false`
- `publicSiteWrites=false`
- `persistence=false`

The production Replit checkout remained on `main@6ba9ea97aefa03bfe55cbf67bb8743c19f8d8d06`, tree `cd4cf383353e4c874217a4ee2a2e6d151f56ea73`, with zero working-tree changes after the offline run. The isolated attestation worktree was also clean.

The only network activity associated with the offline attestation step was the separately authorized GitHub fetch of exact initiative commit `5e654c2396443a3097eaa754c6d4acd5a1f6ac1c` needed to construct the isolated worktree. That Git fetch was not a WordPress/provider request.

## Certification conclusion

The UGP-4.5 WordPress read-only provider boundary has evidence for the two allowlisted WordPress REST GET routes at the named canonical origin: exact-origin HTTP 200 JSON observations within the configured byte bound, followed by deterministic normalization through the merged UGP-4.5 harness and durable request/state/receipt fingerprints.

This certification is strictly read-only. It does not certify credentials, authenticated WordPress access, discovery beyond the two routes, write operations, provider/public-site mutation, persistence, Production DB access, scheduler/worker activation, deployment, or publication.

UGP-4 remains exit-blocked until the remaining connector-plane exit criteria are independently certified, including an additional non-Shopify CMS and the Git-backed custom-site read/PR path.

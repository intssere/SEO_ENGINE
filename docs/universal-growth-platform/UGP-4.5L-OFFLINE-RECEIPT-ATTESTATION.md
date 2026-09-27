# UGP-4.5L-R — Offline captured WordPress evidence receipt attestation

This step closes the normalization portion of UGP-4.5L without performing another provider request.

## Boundary

The attestor accepts only the two already-authorized WordPress REST routes at `https://kalkeenwellness.com`:
- `/wp-json/wp/v2/pages`
- `/wp-json/wp/v2/posts`

It reconstructs the exact live certification descriptor (`wp-live-site`, `wp-live-rest`, `wordpress-live-read`) and delegates request/state/receipt fingerprint generation to the merged UGP-4.5 normalizer.

The module contains no HTTP client and grants no authorization. Credentials, provider writes, public-site writes, persistence, Production DB access, scheduler/worker activation, deployment, and publication remain out of scope.

## Acquisition versus normalized bytes

`responseBytes` records the captured file size from the acquisition. `payloadBytes` remains the canonical stable-JSON byte count produced by the existing UGP-4.5 receipt normalizer. These values intentionally have different semantics and are not substituted for each other.

## Offline invocation

From `artifacts/api-server`:

```sh
pnpm exec tsx src/lib/wordpress-captured-evidence-cli.ts /tmp/ugp45l-pages.json /tmp/ugp45l-posts.json
```

The CLI reads those two local files only and prints bounded receipt metadata/fingerprints; it does not print or persist the payload bodies.

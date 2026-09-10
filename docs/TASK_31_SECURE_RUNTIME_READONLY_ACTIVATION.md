# Task #31 — Secure Runtime Read-Only Activation v1

## Purpose
Move from software-complete V1 to the first operational Diamond Shelf activation step: live, read-only identity and access probes for Shopify, Google Search Console, GA4, and the configured SEO provider.

This task does not perform crawling, baseline ingestion, optimization planning, or any public-site mutation.

## Safety boundary
- locked to `diamondshelf.us`
- requires the permanent `*.myshopify.com` domain
- requires the exact Search Console property `https://diamondshelf.us/`
- requires a numeric GA4 property ID
- requires runtime credentials only; no secrets are committed or included in probe output
- refuses to run live probes when `PUBLIC_SITE_WRITES_ENABLED=true`
- Shopify probe is a read-only `shop` identity query
- GSC probe lists accessible properties and verifies the exact Diamond Shelf property
- GA4 probe requests property metadata only
- SEO provider verification is injected through a provider-specific read-only probe so Task #31 does not hard-code a transport contract

## Result
`runSecureReadOnlyActivation()` returns `ready` only when all five checks are ready:
1. write gate disabled
2. Shopify identity verified
3. GSC property access verified
4. GA4 property access verified
5. SEO provider read probe verified

Any failed or exceptional probe returns a sanitized blocker and keeps `readOnlyReady=false`.

## Runtime use
Run this only in the secure deployment environment where credentials are provided through environment/secrets management. Do not paste runtime tokens into source code, CI variables committed to the repository, logs, screenshots, or certification reports.

A successful Task #31 live run can satisfy the live-connection portion of the Task #30 production-certification chain. It does not by itself certify the baseline or the product.

## Next operational step
After all Task #31 probes succeed with public writes disabled, execute the real bounded Diamond Shelf baseline collection and persist its evidence. Only after that baseline is certified should the real opportunity queue be generated.

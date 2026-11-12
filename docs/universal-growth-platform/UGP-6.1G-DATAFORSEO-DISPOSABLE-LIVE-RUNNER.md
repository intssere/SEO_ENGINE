# UGP-6.1G — Disposable DataForSEO Live Runner

## Status

**AUTHORIZED DISPOSABLE CERTIFICATION RUNNER — NO GENERAL RUNTIME INTEGRATION**

## Purpose

UGP-6.1G supplies the smallest executable surface needed to perform the already-authorized UGP-6.1 one-shot DataForSEO certification without changing the normal SEO Engine service.

## Isolation

The runner is deployed as a separate disposable Railway service.

It:

- does not alter `seo-engine-shadow`;
- exposes no HTTP server or public API;
- requests no domain;
- uses `restartPolicyType: NEVER`;
- exits after one attempt;
- reads only `DATAFORSEO_PRIMARY_LOGIN` and `DATAFORSEO_PRIMARY_PASSWORD`;
- has no database requirement;
- performs no persistence.

## Exact provider scope

The runner delegates request construction to the merged UGP-6.1B transport and execution semantics to UGP-6.1E.

The only allowed sequence is:

1. `POST /v3/dataforseo_labs/google/keyword_overview/live`
2. `POST /v3/dataforseo_labs/google/related_keywords/live`
3. `POST /v3/serp/google/organic/live/advanced`

The scope remains:

- keyword: `stress relief journal`;
- Google;
- location code `2840`;
- language `en`;
- desktop;
- one task per request;
- concurrency one;
- one attempt per call;
- no automatic retry;
- maximum three calls.

There is no arbitrary URL, request body, keyword, market, or command-line input.

## Cost guard

After each provider response, the runner requires exactly one task and a finite non-negative provider-reported task cost.

It accumulates cost before permitting the next call. If cumulative reported cost exceeds USD 1.00, execution fails closed immediately and no later call is attempted.

The final UGP-6.1D evaluation independently checks the total cost again.

## Credential handling

Credentials are resolved through the merged `dataforseo-primary` profile.

The disposable service must receive only:

- `DATAFORSEO_PRIMARY_LOGIN`
- `DATAFORSEO_PRIMARY_PASSWORD`

No credential value or Authorization header is included in the final receipt.

## Receipt

On success the process prints exactly one JSON object containing the sanitized UGP-6.1E certification result.

On failure it prints only a sanitized error identifier.

Raw provider responses exist only in process memory while the certification is being normalized and attested.

## Post-run disablement

After the run result is captured, the disposable Railway execution authority must be disabled. Because the available Railway connector does not expose service deletion, the service is made inert by:

1. replacing its start command with an immediate-exit command; and
2. clearing its two credential-reference variables.

No further DataForSEO call is authorized by the completed run.

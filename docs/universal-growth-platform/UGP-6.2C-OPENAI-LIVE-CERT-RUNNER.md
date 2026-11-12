# UGP-6.2C — Disposable OpenAI Embedding Live-Certification Runner

## Status

**IMPLEMENTATION CANDIDATE — LIVE EXECUTION NOT YET AUTHORIZED**

## Purpose

This disposable runner is the execution surface for the already-merged UGP-6.2C OpenAI embedding transport and certification plan.

It exists solely to execute one bounded certification call after:

1. the OpenAI API-key binding is verified in the approved execution environment; and
2. the user explicitly authorizes the one-shot live provider call.

## Isolation

The runner:

- is deployed as a separate disposable Railway service;
- exposes no HTTP server and receives no public domain;
- uses `restartPolicyType: NEVER`;
- reads only `AI_INTEGRATIONS_OPENAI_API_KEY`;
- does not require `AI_INTEGRATIONS_OPENAI_BASE_URL` because the merged 6.2C transport hard-pins `https://api.openai.com`;
- has no database dependency;
- performs no persistence.

## Exact certification scope

The source certification commit is fixed to:

`1c3e4dada5465fee265fbf6e813b478313b693a1`

The runner delegates all provider request construction and response validation to merged UGP-6.2C.

The only allowed provider operation is:

`POST https://api.openai.com/v1/embeddings`

with:

- model `text-embedding-3-small`;
- exactly the two fixed certification documents;
- one provider call maximum;
- one attempt;
- no retry;
- concurrency one;
- timeout 30 seconds;
- prompt-token ceiling 100,000;
- estimated-cost ceiling USD 0.01.

## Output

On success the process emits one sanitized JSON object containing:

- runner version;
- source certification commit;
- provider call count;
- model;
- provider-reported prompt and total tokens;
- estimated cost;
- certification decision;
- request/receipt/plan fingerprints.

It does not emit:

- the API key;
- Authorization header;
- raw embeddings;
- raw provider response;
- credentials.

## Failure behavior

If the API key is absent, execution fails before any network call.

Any transport, HTTP, model, index, vector-shape, token-ceiling, cost, or safety failure terminates the process. No retry is performed.

## Post-run kill switch

After the certification result is captured, the disposable service must be neutralized by:

1. removing its API-key reference;
2. replacing its start command with an immediate-exit command;
3. preserving `restartPolicyType: NEVER`.

No subsequent provider call is authorized by the completed certification run.

## Explicit exclusions

This runner does not:

- mutate `seo-engine-shadow`;
- change the OpenAI API key;
- add an API route;
- persist vectors or matrices;
- access Postgres;
- schedule or repeat itself;
- generate or publish content;
- merge this feature branch;
- modify PR #656 or PR #737.

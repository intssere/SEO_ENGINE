# UGP-6.2C — OpenAI Embedding Transport and Bounded Live Certification

## Status

**IMPLEMENTATION CANDIDATE — PROVIDER-SPECIFIC TRANSPORT / LIVE CALL NOT YET AUTHORIZED**

## Provider decision

UGP-6.2C uses OpenAI as the initial embedding provider and pins:

- endpoint: `https://api.openai.com/v1/embeddings`;
- model: `text-embedding-3-small`;
- encoding format: `float`;
- default vector dimensions: 1,536.

OpenAI documents `text-embedding-3-small` as an embedding model for search and clustering and currently lists input pricing at USD 0.02 per million tokens.

## Repository integration boundary

The repository already has an OpenAI integration package using:

- `AI_INTEGRATIONS_OPENAI_BASE_URL`;
- `AI_INTEGRATIONS_OPENAI_API_KEY`.

UGP-6.2C does **not** import the existing eager `process.env` OpenAI client into Content Intelligence.

Instead, the transport uses injected:

- credential resolver;
- HTTP client.

This keeps the contract testable and prevents repository import-time credential/runtime coupling.

The future certified credential profile is named:

`openai-primary`

and its API-key binding is intended to resolve from the established:

`AI_INTEGRATIONS_OPENAI_API_KEY`

environment variable.

## Controlled request

The transport accepts only deterministic UGP-6.2B semantic documents.

It constructs one request:

`POST https://api.openai.com/v1/embeddings`

with:

- model exactly `text-embedding-3-small`;
- input exactly the ordered semantic document texts;
- `encoding_format: "float"`.

No arbitrary URL, provider model, dimensions, user, encoding, request header, or provider-specific option is exposed through the controlled request builder.

## Transport policy

The versioned transport policy requires:

- maximum 200 documents;
- maximum one provider call;
- one attempt per call;
- concurrency one;
- automatic retry false;
- timeout 30 seconds;
- maximum response size 20 MB;
- maximum provider-reported prompt tokens 100,000;
- no provider writes;
- no public-site writes;
- no persistence.

## Provider response validation

A successful response must:

- be HTTP 2xx;
- be JSON;
- come from the exact effective URL;
- fit the response-size bound;
- report model exactly `text-embedding-3-small`;
- return exactly one embedding per submitted document;
- use each index exactly once from 0 to N-1;
- return exactly 1,536 finite components per vector;
- contain no zero-norm vector;
- include valid `prompt_tokens` and `total_tokens` usage;
- remain within the prompt-token ceiling.

The transport reorders provider rows by their explicit index before returning the batch.

## Usage and cost evidence

OpenAI's embeddings response reports token usage rather than dollar cost.

UGP-6.2C calculates an estimated cost using the versioned certification price:

USD 0.02 per 1,000,000 input tokens.

The certification ceiling is USD 0.01.

The estimated cost is evidence for certification only; future pricing changes require a new reviewed contract/version rather than silently changing the meaning of an existing certification receipt.

## Credential handling

Credentials are injected only at execution time.

The API key:

- is validated in memory;
- is used only to construct the Bearer authorization header;
- is never placed in the controlled request;
- is never returned in the embedding batch;
- is never returned in the execution receipt;
- is never included in fingerprints.

## UGP-6.2B compatibility

`createOpenAiEmbeddingEncoder` implements the UGP-6.2B `SemanticEmbeddingEncoder` seam.

The adapter therefore remains provider-neutral while the provider transport owns:

- endpoint;
- authentication;
- provider response parsing;
- provider usage accounting.

UGP-6.2A clustering policy remains unchanged.

## Fixed live-certification plan

The one-shot certification plan is intentionally small and deterministic.

It embeds exactly two documents:

1. `stress relief journal`;
2. `stress relief journal prompts`.

Both are represented as informational semantic documents.

Certification policy:

- exactly one provider call;
- one attempt;
- no retry;
- concurrency one;
- model `text-embedding-3-small`;
- prompt-token ceiling 100,000;
- estimated-cost ceiling USD 0.01;
- zero provider/public-site writes;
- zero persistence;
- zero scheduling;
- zero publication.

A live provider call is **not** authorized merely by merging UGP-6.2C.

## Live certification decision

The certification decision fails if any of these drift:

- model;
- call count;
- retry policy;
- concurrency;
- prompt-token ceiling;
- estimated cost ceiling;
- vector count/dimensions;
- read-only/non-persistent execution assertions.

A passing receipt carries deterministic request and receipt fingerprints without raw credentials.

## Explicit exclusions

UGP-6.2C does not:

- perform a live OpenAI request during repository tests;
- add or rotate OpenAI credentials;
- modify Railway variables;
- add an API route;
- add a worker or scheduler;
- persist embeddings or matrices;
- change UGP-6.2A clustering weights/thresholds;
- change UGP-6.2B semantic document construction;
- call DataForSEO;
- access GSC/crawl/index inventory;
- generate or publish content;
- deploy or mutate Production.

## Follow-on live-certification boundary

After this contract passes CI and is merged, a separate explicit authorization is required to:

1. verify the `openai-primary` credential binding;
2. establish a bounded executable surface;
3. execute exactly one OpenAI embeddings call for the fixed two-document plan;
4. capture only the sanitized execution/certification receipt;
5. disable the disposable execution surface after completion.

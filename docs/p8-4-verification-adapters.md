# P8.4 — Verification Adapters for Certified Mutation Classes

## Purpose

P8.4 adds a deterministic, read-only verification-adapter layer for the mutation classes that are already bounded by the existing execution foundation.

This task does **not** add a new mutation class, does not expand Shopify OAuth scopes, does not perform provider writes, does not persist verification results, and does not activate any scheduler, worker, autonomous execution, deployment, or publication path.

## Supported mutation classes

The registry is deliberately closed to exactly four combinations:

- Shopify product SEO `title`;
- Shopify product SEO `meta_description`;
- Shopify collection SEO `title`;
- Shopify collection SEO `meta_description`.

Everything else fails closed as an unsupported mutation class.

P8.3 product media alt text remains separately blocked because the non-deprecated Shopify path requires a separately reviewed isolated `write_files` credential architecture.

## Reused verification surfaces

P8.4 reuses the existing Task #53 read-only verification primitives:

- `readTask53ShopifyState` for an independent provider read;
- `verifyTask53Storefront` for an independent storefront read;
- `assertTask53Resource` and `assertTask53TargetUrl` for exact Shopify resource/Diamond Shelf target identity;
- `executionStateFingerprint` for exact expected/observed state comparison.

There is no second Shopify GraphQL query path and no new storefront parser.

## Verification contract

Each adapter result contains:

- adapter version;
- resolved mutation-class identity;
- deterministic adapter fingerprint;
- exact resource identity and target URL;
- exact expected value/fingerprint;
- provider observed value/fingerprint/request ID;
- storefront observed value/fingerprint/status code;
- independent provider/storefront verification booleans;
- overall `verified | failed | unavailable` status;
- deterministic sorted failure categories;
- deterministic result fingerprint;
- explicit `providerWritePerformed:false`;
- explicit `databaseMutationPerformed:false`;
- explicit `automaticTransition:false`.

### Status semantics

`verified` requires both independently observed provider and storefront fingerprints to equal the exact expected fingerprint.

`failed` is used when authoritative evidence proves a mismatch or identity/policy violation, including:

- unsupported mutation class;
- invalid Shopify resource identity;
- target URL/resource-kind mismatch;
- expected fingerprint mismatch;
- provider resource/field/fingerprint integrity mismatch;
- provider state mismatch;
- storefront state mismatch;
- provider/storefront disagreement.

`unavailable` is used only when an otherwise-valid verification surface cannot be observed safely, such as provider transport/read unavailability or storefront transport/HTTP unavailability, and there is no already-proven authoritative mismatch.

A mutation receipt or action lifecycle state is never treated as verification proof.

## Registry and dispatcher

The module exports a deterministic closed registry keyed by resource kind + executable field. Later P8.5/P8.6 workflows can resolve the exact verifier without broadening the allowed action surface.

## Test boundary

The focused suite is network-free. It covers:

- all four supported classes;
- unsupported resource/field combinations;
- invalid resource identity;
- target URL mismatch;
- expected-fingerprint mismatch;
- provider unavailable;
- provider identity mismatch;
- provider authoritative mismatch;
- storefront unavailable;
- storefront authoritative mismatch;
- provider/storefront disagreement;
- deterministic failure ordering/fingerprint stability;
- explicit proof that no provider write, database mutation, or automatic transition occurs;
- the real Task #53 provider/storefront read wrappers exercised only through an injected fake `fetch` implementation.

## Safety boundary

P8.4 engineering does not authorize:

- product media alt text;
- `write_files`;
- merchant-visible product/collection title or description HTML;
- handle/URL changes;
- price/inventory/status/theme changes;
- live Shopify/provider requests;
- provider/public-site writes;
- verification persistence;
- Production or Development database mutation;
- scheduler/worker/autonomous activation;
- deployment or publication.

P8.7 live execution and P8.8 progressive policy-authorized execution remain separately gated.


## Engineering certification

P8.4 is certified complete.

- issue: #391;
- PR: #392;
- exact tested head: `0016f3b93842f295cb4b3bf88ce935c9c0860fdd`;
- exact-head PR CI #690 / run `35732605837`: success;
- merge: `c956c14bbb990090bca79391a77fe527c0d49675`;
- merge tree: `759174ed4404e0aa4b8500bc6a2fdc6bbb8569a0`;
- post-merge main CI #691 / run `35733144418`: success.

The canonical CI passed schema validation, all workspace packages, P11.10 synthetic scale, Chromium critical paths, typecheck and build.

Certification is engineering-only. No live provider call, provider/public-site write, database persistence/mutation, OAuth scope change, scheduler/worker activation, deployment or publication occurred.

The next safe engineering boundary is P8.5 deterministic rollback/manual-intervention workflows.

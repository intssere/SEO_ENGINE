# UGP-8.1 — Cross-provider article publication certification

## Status
IMPLEMENTATION CANDIDATE — SYNTHETIC INTEGRATION CERTIFICATION / NO LIVE WRITE

## Purpose
This layer closes the initial UGP-8.1 target matrix by certifying that Shopify, WordPress, Webflow, and Git-backed Markdown/MDX mappings conform to one normalized publication lifecycle without adding an executor.

## Certification model
Each provider mapping first passes its own existing integrity assertion. It is then normalized to evidence containing:
- provider and operation;
- exact connector-neutral source-plan fingerprint;
- exact provider mapping fingerprint;
- exact expected verification-state fingerprint;
- deterministic/mapping-only semantics;
- explicit absence of network, persistence, credentials, execution authority, provider writes, and public-site writes.

The certification requires exactly 12 coordinates:
- four providers;
- create, update, and publish for each provider.

For each operation, all four provider mappings must bind the same connector-neutral source-plan fingerprint and the same expected verification-state fingerprint. This proves provider mapping is a projection of the same publication intent rather than an independent provider-specific workflow.

## Provider-specific semantics remain intact
The common certification does not erase provider differences:
- Shopify create does not publish; update preserves publication state; publish does not rewrite article body.
- WordPress create is draft-only; update preserves publication state; publish changes status only.
- Webflow create/update use staged CMS operations; publish uses the dedicated publish endpoint.
- Git Markdown/MDX requires a non-default working branch and PR plan; publication is an explicit frontmatter-state patch and never implies PR merge or deployment.

Those details remain certified inside each provider adapter.

## Safety boundary
This layer:
- performs no provider/Git/network operation;
- resolves no credentials;
- constructs no execution request;
- persists nothing;
- grants no authorization;
- performs no provider/public-site write;
- changes no DB/schema, Railway, deployment, scheduler, worker, or autonomy state.

## Exit meaning
A passing artifact proves the initial UGP-8.1 mappings are structurally interoperable under one normalized lifecycle. It does not prove a live article was published. Live execution/verification remains a later separately authorized certification boundary.

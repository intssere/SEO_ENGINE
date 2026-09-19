# P8.3A — Individual Action-Class Review: Product Media Alt Text

**Review date:** 2026-09-20  
**Issue:** #291  
**Status:** REVIEW COMPLETE / IMPLEMENTATION BLOCKED

## Purpose

Roadmap P8.3 requires each additional Shopify/public-site mutation class to be reviewed individually before implementation. This review evaluates candidate classes and defines the safety contract for exactly one preferred future class. It does not authorize implementation, OAuth scope changes, credentials, provider writes, persistence, deployment, or publication.

## Verified current execution baseline

Canonical execution code currently permits only:

- resource kinds: Shopify `product` and `collection`;
- executable fields: `title` and `meta_description`;
- those fields map to Shopify SEO `title` / `description`, not merchant-visible product/collection titles;
- isolated write authority: `write_products`;
- exact Product/Collection GID binding;
- exact current-state fingerprint and stale-state pre-read;
- exact proposal/action/preflight lineage and short-lived authorization;
- explicit per-action confirmation;
- one forward provider mutation;
- independent provider and storefront read-after-write verification;
- deterministic restore to the exact approved before-state;
- bounded rollback propagation verification;
- manual intervention after failed rollback convergence;
- duplicate/parallel execution guards;
- global `PUBLIC_SITE_WRITES_ENABLED` fail-closed gate;
- no autonomous scheduler or batch execution.

## Candidate review

### Product media alt text — selected future candidate

Reason for selection:
- a single scalar metadata field;
- no URL or handle change;
- no price, inventory, publication status, product membership, or theme mutation;
- lower storefront blast radius than merchant-visible title or description HTML;
- exact before/after values are fingerprintable and reversibly restorable.

Current Shopify Admin GraphQL contract:
- the current `fileUpdate` mutation accepts file alt text via `FileUpdateInput.alt`;
- `fileUpdate` requires `write_files` or `write_themes`;
- the older `productUpdateMedia` mutation can update media alt under `write_products`, but it is deprecated in favor of `fileUpdate`.

Repository consequence:
- Task #53 deliberately uses an isolated `write_products` credential;
- adding `write_files` expands provider authority;
- generic continuation cannot authorize that expansion;
- deprecated `productUpdateMedia` must not be selected merely to avoid a proper scope/credential review.

Official Shopify references:
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/input-objects/FileUpdateInput
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdateMedia

### Merchant-visible product/collection title — deferred

This remains technically possible under `write_products`, but it changes visible merchandising/search/feed text and has wider customer-facing blast radius than SEO metadata.

### Product/collection description HTML — deferred

This remains technically possible under `write_products`, but it mutates visible rich content and introduces HTML normalization/sanitization plus more complex independent storefront verification.

### Product/collection handle — not accepted as first expansion

Handle mutation changes URL identity and can affect redirects, canonicals, backlinks, navigation and indexing. It is not an appropriate first expansion.

Additional Shopify references:
- https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductUpdateInput
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionUpdate

## Required media-alt contract if separately authorized later

### Identity

One action must bind:
- one Diamond Shelf site;
- one exact owning Product GID;
- one exact MediaImage/File GID;
- one exact field identity such as `media_alt`;
- no wildcard, query-selected batch, inferred media target or implicit “first image”.

Provider pre-read must prove the media/file identity and current alt value before authorization.

### Credential and scope isolation

Do not modify or broaden the existing Task #53 `task53_write_products` credential.

A future implementation must use a separately reviewed isolated credential/profile containing only the scopes required for the selected file-alt operation. If `write_files` is selected, its OAuth enrollment, storage, capability reporting and secret handling require separate explicit authorization while public writes remain disabled.

### Preflight

The preflight must bind:
- Product GID;
- File/MediaImage GID;
- field;
- exact before value and fingerprint;
- exact proposed value and fingerprint;
- proposal/action identity and fingerprint;
- credential profile and required scope;
- authorization expiry.

It must fail closed on:
- stale alt value;
- changed or missing file/media identity;
- product/media ownership/reference mismatch;
- non-ready/invalid file state;
- missing required scope;
- duplicate deployment;
- active parallel public-site execution;
- expired/stale authorization;
- public-write gate disabled at execution time.

### Forward mutation

If separately authorized:
- use one `fileUpdate`;
- target exactly one file/media object;
- change only `alt`;
- do not change filename, original source, preview source, product references, product content, inventory, price, status, handle or theme;
- perform no second forward mutation during propagation verification.

### Independent verification

Provider verification:
- independently re-read the exact File/MediaImage;
- require the exact expected alt value/fingerprint.

Storefront verification:
- fetch the intended public product surface read-only;
- uniquely bind the rendered image to the intended media asset before evaluating alt;
- if asset identity cannot be proven uniquely, verification is unavailable/failed rather than assumed successful;
- lifecycle or provider mutation acceptance is never verification proof.

### Rollback and manual intervention

On verification failure:
- perform at most one deterministic `fileUpdate` restoring the exact approved before-alt value;
- independently re-read provider and storefront state on a bounded schedule;
- do not issue a second rollback mutation;
- enter manual intervention if convergence cannot be verified.

### Audit and idempotency

Persisted execution, if separately authorized in a future milestone, must preserve exact:
- proposal;
- approval;
- authorization;
- target identity;
- preflight;
- provider receipt;
- verification;
- rollback;
- rollback verification;
- manual-intervention lineage.

Stale or duplicate replay must fail closed. No automatic approval-to-execution transition, batch mutation, scheduler-triggered mutation or self-authorization is permitted.

## Review conclusion

**Selected future class:** product media alt text.  
**Implementation:** BLOCKED.  
**Blocker:** separate explicit authorization for an isolated `write_files` scope/credential architecture and its bounded implementation.

Current executable production mutation classes remain unchanged: product/collection SEO `title` and `meta_description` only.

This review performed no live Shopify/provider request, OAuth enrollment, credential/scope mutation, public-site write, execution, persistence, Production DB activity, scheduler/worker activation, environment/config mutation, deployment or publication.

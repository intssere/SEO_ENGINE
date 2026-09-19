# P8.3 Action-Class Review Closeout

## Result

The first roadmap P8.3 individual mutation-action-class review is complete under issue #291.

The preferred future class is **Shopify product media alt text**, but implementation is **blocked** pending separate explicit authorization for a new isolated `write_files` scope/credential architecture.

The existing certified executable surface is unchanged:
- resources: `product`, `collection`;
- fields: SEO `title`, `meta_description`;
- isolated scope: `write_products`.

## Why media alt was selected

Compared with the other reviewed candidates, media alt is:
- scalar and reversible;
- independent of URL identity;
- independent of price/inventory/status;
- lower storefront blast radius than merchant-visible title or description HTML.

## Why implementation is blocked

Current Shopify `fileUpdate` is the non-deprecated path for file alt updates and requires `write_files` or `write_themes`. The current Task #53 credential is deliberately `write_products` only.

Expanding that credential or enrolling a new write credential changes external authority. A generic `continue` does not authorize that action.

The deprecated `productUpdateMedia` path is not accepted as a scope-review bypass.

## Future implementation contract

Issue #291 and `docs/p8-3-action-class-review.md` define:
- exact Product + File/MediaImage identity;
- alt-only field mutation;
- separately isolated credential;
- stale-state provider pre-read;
- exact short-lived authorization and confirmation;
- one forward mutation;
- independent provider + uniquely bound storefront verification;
- one deterministic restore mutation;
- bounded rollback re-verification;
- manual intervention on failed convergence;
- complete idempotency/audit lineage.

## Safety closeout

This review made no application execution change and performed no:
- provider request or write;
- OAuth enrollment;
- credential/scope change;
- public-site mutation;
- execution;
- rollback or verification mutation;
- persistence or Production DB activity;
- scheduler/worker activation;
- environment/config change;
- deployment or publication.

P8.4–P8.8 are not automatically unlocked. The next mutation-class implementation step requires a new, explicit authorization identifying the isolated `write_files` engineering scope.

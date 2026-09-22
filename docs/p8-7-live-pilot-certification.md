# P8.7 — first persistent live low-risk action pilot certification

P8.7 certifies one bounded, human-authorized, persistent Shopify production mutation through the existing Task #51/#53/#54 safety path.

## Scope

The pilot used the already-supported Shopify collection SEO `meta_description` mutation class only.

- site: Diamond Shelf / `https://diamondshelf.us`
- action plan: `f35d29f6-e0da-45fb-a98c-d36a28eb7403`
- action: `48a8237b-9b71-4a43-84e1-0fc291f4cc35`
- page: `7282df97-7f7a-4e1d-8887-08b7101054be`
- target URL: `https://diamondshelf.us/collections/home-fragrance`
- Shopify resource: `gid://shopify/Collection/335423963335`
- field: `meta_description`

No second action was created.

## Approved state transition

Before:

- value: `null`
- fingerprint: `3d9c5c368a99141b37890291afa6d16da2d33b45c418d0fb060a27d145ca7b29`

After:

- value: `The Home Fragrance collection combines Candles, Diffusers, and Other Home Fragrance, placing these related product types together for easier comparison.`
- fingerprint: `cdecc199596be9bca5d0a4960d892774a88c97a210ba6d7e6173aa7ae4f27dbd`

## Authorization and final preflight

The existing action authorization was renewed immediately before the final pilot.

- renewal approval: `125b5354-0a63-465c-84ea-d2c9db7d4468`
- authorization fingerprint: `d468009fec625521e4c1ae247b7a75cf84a51032c34893db197629cfdc330235`
- issued: `2026-09-22T19:11:35.553Z`
- expiry: `2026-09-22T19:26:35.553Z`
- final Task #54 preflight fingerprint: `dc4fcc32ab126e476ca3aafeb50393921cc3e9d2c9bba57bdf45bf5f7a4c2904`
- source Task #53 preflight fingerprint: `ed959d144ee0f825b10faf276492ab208a693fc9de22cbfece2e03f5ef1178c4`
- provider pre-read request ID: `40dca322-bf2d-4086-bc4d-ccb11b14fcc0-1790104403`

The final preflight reported:

- `authorizationFresh=true`
- `providerStateMatchesApprovedSnapshot=true`
- `writeScopePresent=true`
- `publicWriteGateEnabled=true`
- `otherActiveExecutionCount=0`
- `priorDeploymentCount=0`
- `blockers=[]`
- `readyForPersistentApply=true`
- `mutationPerformed=false`

The exact one-shot confirmation was:

`APPLY_AND_VERIFY_TASK54:48a8237b-9b71-4a43-84e1-0fc291f4cc35:dc4fcc32ab126e476ca3aafeb50393921cc3e9d2c9bba57bdf45bf5f7a4c2904`

## Persistent apply result

The operator invoked the Task #54 apply endpoint exactly once.

Result:

- HTTP status: `200`
- orchestrator: `task54_persistent_apply_v1`
- final state: `production_change_verified_live`
- deployment: `a1b5f5cd-8ead-4a6e-bbb5-4b2347dff209`
- deployment status: `completed`
- provider: `shopify`
- forward verification: `7c74b5e4-c014-48db-8d2b-c3184818adfe`
- forward verification status: `verified`
- provider verified: `true`
- storefront verified: `true`
- `publicWriteOccurred=true`
- `change_left_live=true`
- `measurementEligible=true`
- propagation attempts: `1`
- propagation delay: `0 ms`
- rollback performed: `false`
- rollback rows: `0`
- manual intervention required: `false`

The apply response reported provider write request ID `213cfa45-296a-4e49-a7aa-49c67cc4760c-1790104592`, which is also the persisted deployment external reference. Deployment metadata also retains the additional provider request lineage `8538402b-105d-4960-b364-10cc1e8f8eb0-1790104593`.

Production persistence after the apply contained exactly one action and exactly one deployment for the plan. The action and plan were both completed, with plan lifecycle `production_change_verified_live`.

## P8.4 / P8.5 / P8.6 interpretation

P8.4 verification semantics are satisfied by the persisted independent provider + storefront agreement on the exact approved after state. A mutation receipt alone was not treated as verification.

P8.5 rollback/manual-intervention safety remained available but was not exercised. Forward verification succeeded, no rollback mutation was performed, and manual intervention was not required. The persisted result therefore has no rollback-attempt evidence to reinterpret.

P8.6 remains the deterministic read-only audit/history projection layer. P8.7 does not create a competing event authority. The persisted action, approval, preflight, deployment and verification identifiers above provide exact direct lineage for later P8.6 projection; no plan-level or timestamp-only inference is required.

## Gate closure and production posture

The live write gate was opened only for the bounded renewal/preflight/apply window.

After the successful pilot:

1. secure `PUBLIC_SITE_WRITES_ENABLED` was returned to `false`;
2. Replit was reconciled to canonical GitHub `main` source `78f8e69d07aa4e853ab0c815e7ba24d284d93e97`, tree `271d82d2c3e3a1bef5eeca567e96f924189166f7`;
3. the existing autoscale deployment `fbef9788-c08d-475d-a85d-88ede16e92c7` was republished successfully;
4. no Task #51/#53/#54 call, Production DB mutation, Shopify/provider request, rollback, migration, scheduler/worker activation or additional public-site mutation was performed during the gate-close republish.

The default production posture is therefore closed again.

## What P8.7 proves

P8.7 proves that one already-supported low-risk Shopify SEO mutation can move through the existing governed path with:

- exact human authorization;
- short-lived executable-action authorization;
- live provider pre-read;
- stale-state and duplicate-execution guards;
- a separately enabled public-write gate;
- exactly one forward mutation;
- independent provider + storefront verification;
- bounded single-rollback semantics;
- persisted deployment/verification lineage;
- fail-closed manual-intervention semantics;
- explicit post-operation gate closure.

## What P8.7 does not authorize

P8.7 does not authorize:

- autonomous mutation;
- policy-created authorization;
- repeated/bulk provider writes;
- scheduler/worker execution;
- additional mutation classes or fields;
- media-alt/`write_files`;
- OAuth scope expansion;
- Production schema migration/DDL;
- P12.2 live crawling;
- P8.8 implementation or activation.

P8.8 progressive policy-authorized low-risk execution remains a separate architecture/certification boundary.

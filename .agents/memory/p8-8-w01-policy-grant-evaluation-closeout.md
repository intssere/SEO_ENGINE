# P8.8 W01 policy grant/evaluation — closeout

W01 implements the pure/default-off policy grant and policy admission layer for the initial P8.8 autonomous class.

- issue: #408
- PR: #409
- class: `shopify.product.seo.meta_description`
- domain: `diamondshelf.us`
- provider/resource/action/field/scope: Shopify / Product / `update_meta_description` / `meta_description` / `write_products`
- proposal method: `p9.7_deterministic_preview`
- maximum risk: exactly `low`
- minimum evidence refs: 2
- minimum quality score: 90
- concurrency: 1
- quota: 1 / 24h
- same-target cooldown: >=14 days

The grant is deep-frozen and deterministically fingerprinted. Integrity checks fail closed on fingerprint or safety-marker tampering.

The pure evaluator consumes caller-supplied recommendation/proposal/evidence/quality/risk/target/current-state/control facts and returns deterministic `admit` or `reject` plus sorted reason codes and a bound evaluation fingerprint.

`admit` means policy-layer admission only. It is not human approval, policy activation, Task #51 authorization, Task #54 confirmation, provider-write permission or autonomous execution authority.

W01 performs zero DB read/write/persistence/schema work, zero provider/network request/write, zero approval creation, zero Task #51/#53/#54 execution, zero scheduler/worker activation, zero credential/scope/config change, zero deployment/publication, and cannot enable the public-write gate.

The initial code-only head passed CI #706. Final exact-head/merge/post-merge lineage is recorded on issue #408 after certification.

Next boundary: W02 P9.7 proposal materialization bridge, separately authorized. W01 grants no W02–W10 authority.

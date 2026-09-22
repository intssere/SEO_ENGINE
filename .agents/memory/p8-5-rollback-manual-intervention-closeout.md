# P8.5 rollback/manual-intervention workflows — closeout

P8.5 is certified complete.

## Certified lineage

- issue: #395
- PR: #396
- exact tested head: `61717d2e99528636d66b35c5f78303073e449417`
- exact-head CI #694 / run `35739798444`, attempt 2: success
- merge: `6ef508a0a14c68aa4462b5af3b8aa1f3276cfc4a`
- post-merge main CI #695 / run `35742915788`: success

Attempt 1 of CI #694 had one existing P11.6 `/connections` phone touch-target failure. The unchanged exact head passed the full Chromium suite on attempt 2; no P8.5 code change was made for that runner-specific failure.

## Certified scope

P8.5 remains closed to exactly the P8.4 classes:

- Shopify product SEO `title`;
- Shopify product SEO `meta_description`;
- Shopify collection SEO `title`;
- Shopify collection SEO `meta_description`.

No media-alt/`write_files`, visible content, handles, price/inventory, publication, theme, or new provider scope was added.

## Workflow contract

The deterministic planner emits exactly one of:

- `no_rollback_needed`;
- `rollback_ready`;
- `rollback_verification_pending`;
- `rollback_verified_closed`;
- `manual_intervention_required`.

Important invariants:

- P8.4 result integrity is recomputed and fail-closed on mismatch.
- Captured pre-change state must recompute to the supplied fingerprint.
- Mutation class/resource/target/field/lineage must match exactly.
- Only one rollback attempt may participate in bounded closure.
- `rollback_ready` is planning only and grants no write authority.
- `rollback_verified_closed` requires independent provider + storefront agreement on the exact pre-change fingerprint.
- A mutation receipt, action status, lifecycle label or one-sided read is never verification proof.
- Possible/uncertain write outcome, exhausted unavailable evidence, restore corruption, rollback rejection/uncertainty, provider/storefront disagreement, duplicate/conflicting rollback attempts or incompatible lineage fail closed to deterministic manual intervention.
- Manual-intervention artifacts are descriptive only and contain no credential or execution authority.

Every result records:

- `providerWritePerformed:false`;
- `rollbackWritePerformed:false`;
- `databaseMutationPerformed:false`;
- `automaticTransition:false`;
- `liveExecutionAuthorized:false`.

## Deliberate boundary

P8.5 performed no live provider/network request, provider/public-site write, rollback mutation, DB mutation/persistence, automatic transition, scheduler/worker/autonomous activation, OAuth scope change, deployment or publication.

P8.6 action history/audit ledger is the next safe engineering boundary. P8.7/P8.8 live/policy execution remain separately authorization-gated. P12.6 remains incomplete.

# Task #72 — Engineering Closeout

Task #72 — GSC Read-Only OAuth + Property Binding Foundation v1 — is engineering-complete, CI-certified, merged, and Git-only synchronized to Replit without publication.

## Canonical lineage

- issue: #123 — completed
- PR: #125
- exact tested PR head: `f2cc11785773ce9644bff4effbf61ec5d3b36a1e`
- PR CI: #225 — success
- merge: `6dd743afd44225ee62a2bfc1944bfd9899170eed`
- tree: `3f29182b109ff181a20d5c42950182b33e9ba1c6`
- post-merge main CI: #226 — success

## Engineering boundary

Task #72 added a GSC-purpose delegated OAuth/property-readiness foundation only. It models exact Search Console readonly scope `https://www.googleapis.com/auth/webmasters.readonly`, stable purpose identity `google#gsc-read-only-v1`, bounded supplied/fake `sites.list` discovery normalization, exact discovered-property membership, supported `sc-domain:<domain>` selection, explicit permission policy, and sanitized readiness.

It reuses existing OAuth state/PKCE/encrypted-secret primitives but creates no live Google transport or alternate Task #70 executor. Existing app OIDC/login remains distinct from provider OAuth.

No schema migration was added. The existing `connections` table remains the persistence design for a future separately authorized credential binding.

## Replit synchronization

After post-merge CI, Replit was Git-only synchronized to the canonical Task #72 merge and verified:

- branch: `main`
- SHA: `6dd743afd44225ee62a2bfc1944bfd9899170eed`
- tree: `3f29182b109ff181a20d5c42950182b33e9ba1c6`
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- clean: true

All Task #70/competitor/public-write gates were false. Task #72 configured, credential, scope, property-discovery, selected-property, network, Task #70 execution, and live-read readiness were all false.

## Non-events

Task #72 engineering did not create/configure a real Google OAuth client or secret, initiate consent, obtain/refresh/use tokens, call Google/Search Console, bind a real property, execute Task #70, persist observations/evidence, mutate DB/schema/data, activate scheduler/batch/worker/retry, write to provider/public-site state, or publish/redeploy.

## Next boundary

Task #73 adds a deterministic first-live-read pilot-readiness packet and staged authorization design while preserving the same default-off/no-provider-interaction boundary.
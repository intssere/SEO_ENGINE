# Task #72 — GSC Read-Only OAuth + Property Binding Foundation v1

## Status

Engineering foundation only. Default-off, network-free under tests, no real Google credentials or property binding, no Task #70 execution, no persistence of Task #68 observations/evidence, no production DDL, no publication.

## Purpose

Task #72 adds the least-privileged credential/property boundary needed between the published Task #71 GSC Search Analytics runner and any future first live Search Console read.

The existing generic Google OAuth flow is intentionally left unchanged because it requests both Search Console and GA4 readonly scopes and discovers/selects both resource families. The first GSC pilot must not inherit that broader consent surface.

## GSC-only profile

The Task #72 profile is:

- profile: `gsc_read_only_v1`
- provider: `google`
- stable external connection identity: `google#gsc-read-only-v1`
- required scope: `https://www.googleapis.com/auth/webmasters.readonly`
- incremental granted scopes disabled in the authorization contract
- OAuth state + PKCE retained
- provider OAuth credentials remain distinct from application login/OIDC

The profile reuses the existing OAuth manager's state validation, encryption, token metadata sanitization, and the existing `connections` persistence model. It does not alter the existing combined Google/GA4 flow.

## No schema migration

The existing `connections` table already supports multiple Google-purpose connections because identity is unique by `(site_id, provider, external_account_id)` and provider/external identifiers are text. The GSC-only identity is non-null and distinct from the existing generic Google identity.

No migration or DDL is part of Task #72.

## Property discovery and selection

Engineering models Search Console `sites.list` through an injected transport only. The Task #72 module itself has no default network client.

Supplied discovery responses are bounded to 256 entries and accept only modeled fields:

- `siteUrl`
- `permissionLevel`

Unknown fields fail closed rather than crossing the boundary.

Task #71 v1 supports only `sc-domain:<domain>` properties. URL-prefix properties may be represented as discovered context but are never selection-ready under Task #72 v1.

Selection is valid only when the exact normalized `sc-domain` property exists in the exact discovery set and its permission level is accepted.

Accepted first-pilot permission levels are deliberately limited to:

- `siteRestrictedUser`
- `siteFullUser`

`siteOwner` is not required or selection-ready for the first pilot. This encodes the reviewed least-privilege policy: prefer restricted access where sufficient, otherwise full-user access, without requiring owner access.

Historical `sc-domain:diamondshelf.us` evidence is not auto-selection and is not current proof of authorization.

## Readiness

Task #72 exposes a sanitized fail-closed readiness projection:

- supported
- configured
- credentialReady
- scopeReady
- propertyDiscoveryReady
- selectedPropertyReady
- networkReady
- task70ExecutionEnabled
- liveReadAuthorized

Provider credential readiness requires an explicit `provider_oauth` source. Application OIDC/login material is not accepted as provider credential readiness.

The exact GSC readonly scope set is required; adding `analytics.readonly` or any other extra scope makes `scopeReady=false`.

All mutation/autonomy fields remain false in this foundation:

- providerWrites=false
- publicSiteWrites=false
- observationPersistenceAuthorized=false
- evidencePersistenceAuthorized=false
- schedulerEnabled=false
- batchExecutorEnabled=false
- autonomousWorkerEnabled=false
- retryLoopEnabled=false

## Execution chain remains authoritative

Task #72 does not add an executor or an alternate live-read route. Any future live Search Analytics read must still pass through:

Task #67 reviewed source/refresh lineage
→ Task #68 adapter request
→ Task #69 exact expiring job packet and authorization
→ Task #70 durable single-job execution/replay lock
→ Task #71 GSC source runner
→ Task #72 verified GSC-only credential/property readiness.

## Real-provider boundary

Task #72 engineering does not authorize:

- real Google OAuth client configuration
- OAuth consent
- access/refresh token creation, storage, refresh, or use
- real Search Console `sites.list` or property verification
- real property binding
- Search Analytics requests
- Task #70 enablement/execution
- observation/evidence persistence
- scheduler/worker/retry activation
- DDL
- provider/public-site mutation
- publication/redeployment.

A first real GSC read requires separate explicit authorization after engineering and publication certification, with exact credential/property lineage and a fresh Task #67→#71 job chain.

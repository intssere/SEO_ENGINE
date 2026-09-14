# Task #73 — GSC First-Live-Read Pilot Readiness v1

## Purpose

Task #73 defines the final default-off engineering boundary before any real Google Search Console consent, property discovery, property binding, or Search Analytics read.

It does **not** perform any provider interaction. It produces only deterministic metadata packets and readiness projections that can later be evaluated under separately authorized production configuration.

## Provider facts reviewed

Current Google documentation confirms:

- Search Console `sites.list` is `GET https://www.googleapis.com/webmasters/v3/sites`, returns accessible Search Console properties plus permission levels, and accepts `https://www.googleapis.com/auth/webmasters.readonly`.
- Search Analytics `query` requires authorization and also accepts `webmasters.readonly`.
- Search Analytics does not guarantee an exhaustive row set; top rows may be returned. Dimensional pilot output therefore remains conservative `partial` evidence.
- Web-server OAuth requires a Google OAuth client, an exact authorized redirect URI, user authorization, and token exchange before provider requests.
- Google recommends least-privilege scopes. Production applications using sensitive/restricted scopes may require verification; testing/staging and limited-use exceptions remain policy-dependent and must not be assumed by code.

## Task #72 dependency

Task #73 builds only on the Task #72 GSC-only profile:

- profile: `gsc_read_only_v1`
- external account identity: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property shape: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`
- property selection must originate from exact GSC discovery membership
- application OIDC/login is not provider OAuth credential material.

Task #73 does not add an alternate OAuth flow, discovery path, transport, executor, or persistence surface.

## Pilot packet

`buildGscPilotPacket()` creates a deterministic, fingerprinted metadata packet binding:

- packet version and purpose
- environment (`test` or `production`)
- sanitized Google Cloud project identifier
- public OAuth client ID
- exact callback/redirect URI
- explicit consent mode (`testing` or `production`)
- exact Task #72 profile and external-account identity
- exact readonly scope
- exact selected supported GSC domain property
- exact accepted permission level
- fresh Task #67 refresh-plan fingerprint
- fresh Task #68 adapter-request fingerprint
- exact Task #69 job ID/fingerprint
- bounded first-pilot query policy
- issued/expiry timestamps
- deterministic SHA-256 fingerprint.

No client secret, access token, refresh token, authorization header, cookie, credential envelope, raw provider payload, or arbitrary provider response is represented in the packet.

## Redirect/OAuth deployment contract

Production packets fail closed unless:

- redirect URI is an exact member of the supplied allowlist
- redirect URI uses HTTPS
- redirect host is not localhost/loopback
- consent mode is explicitly `production`
- profile is exactly Task #72 GSC readonly
- external account identity is exactly the GSC-purpose identity
- granted scope set is exactly `webmasters.readonly` and no broader Google scope is present.

Test packets may model non-production values, but that does not make production readiness true.

## Time and replay identity

The packet TTL is bounded to at most 30 minutes.

The deterministic fingerprint covers all packet fields other than the fingerprint itself. Mutation of property, OAuth metadata, lineage, query policy, or timestamps invalidates the packet.

Task #73 does not consume or persist replay state. Durable Task #69/Task #70 job authorization and replay locking remain authoritative.

## First pilot query policy

The default first-read policy is intentionally narrow:

- one supported `sc-domain` property
- 7-day date range by default
- maximum date range remains 31 days
- dimensions must include `query`; optional `page` is allowed
- maximum 5,000 rows per page
- maximum 2 pages
- no provider write
- no automatic retry
- dimensional/top-row semantics remain `partial`.

These bounds do not authorize a live request.

## Readiness composition

`assessGscPilotReadiness()` can report `livePilotReady=true` only when every independent condition is true:

1. valid, unexpired Task #73 pilot packet
2. Task #72 configured
3. Task #72 credential ready from provider OAuth
4. exact GSC scope ready
5. property discovery ready
6. selected property ready
7. network ready
8. fresh Task #67 lineage
9. fresh Task #68 lineage
10. fresh Task #69 lineage
11. exact Task #69 authorization present
12. Task #70 execution gate separately ready
13. exact first-live-read authorization present
14. no conflicting write/autonomy gate unexpectedly open.

Default engineering state remains closed.

## Separate future provider-interaction stages

The future live pilot is intentionally split into independently authorized stages:

1. `oauth_client_config_binding`
2. `google_oauth_consent`
3. `gsc_sites_list_discovery`
4. `gsc_property_selection_binding`
5. `task70_gate_deployment`
6. `task69_exact_job_authorization`
7. `gsc_first_search_analytics_read`
8. `observation_evidence_persistence`

No stage implies or authorizes any later stage.

## Safety invariants

Task #73 engineering contains:

- no HTTP/fetch/Google SDK transport
- no provider endpoint invocation
- no token exchange or refresh
- no real credential creation/storage
- no Search Console property binding
- no DB migration or DDL
- no route changes
- no Task #70 execution
- no observation/evidence persistence
- no scheduler/batch/worker/retry activation
- no provider/public-site writes
- no publication/redeployment.

The readiness projection hard-codes provider/public writes, observation/evidence persistence, scheduler, batch execution, autonomous worker, and retry loop to false.

## Tests

Deterministic tests cover:

- stable packet fingerprinting
- exact GSC scope/profile/external identity
- rejection of broader Google scopes
- rejection of unsupported URL-prefix properties
- rejection of unaccepted permission levels
- exact production redirect allowlist
- production HTTPS/non-local requirement
- production consent-mode requirement
- packet TTL bound
- Task #71 date/row/page limits
- required query dimension
- fingerprint tamper detection and expiry
- full independent readiness composition
- default closed state
- explicit provider-interaction ordering
- absence of secret/token fields.

All tests are local and network-free.

## Authorization boundary

Generic `continue` can authorize Task #73 engineering, tests/docs, PR/CI/merge, post-merge CI, Git-only Replit synchronization, and read-only prepublication certification while safety checks remain green.

It does **not** authorize:

- creating/configuring a real Google OAuth client or secret
- OAuth consent or consent-screen mutation
- real token acquisition/refresh/use
- real `sites.list` or Search Analytics requests
- real property binding or permission changes
- Task #70 gate enablement/execution
- observation/evidence persistence
- scheduler/batch/worker/retry activation
- DDL/migration
- Task #53/#54/#64 execution
- provider/public-site mutation
- publication/redeployment.

Each real-provider stage requires a separate explicit authorization after Task #73 engineering and certification.
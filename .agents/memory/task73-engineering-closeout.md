# Task #73 — Engineering Closeout

Task #73 — GSC First-Live-Read Pilot Readiness v1 — is engineering-complete, CI-certified, merged, and Git-only synchronized to Replit without publication.

## Canonical lineage

- issue: #126
- engineering PR: #129
- initial PR head: `8a4bda45893587078a59e727332159fdcd844125`
- CI #227: failed in full workspace tests because the deterministic test packet used fixed timestamps that had expired by runtime; no merge occurred
- corrected exact tested head: `0a998bea96f442f00a235086bcada1e8b8f7beeb`
- corrected PR CI #228: success
- merge: `d6a7a4b7cb1f3802e1fd9934b5de72d52a221dd2`
- tree: `d105bf916e15333efef5f7f07fb416e2dcfa4f1b`
- post-merge main CI #229: success

## Effective engineering change

Task #73 adds only:

1. deterministic GSC first-live-read pilot packet/readiness module
2. deterministic tests
3. package export
4. architecture/safety documentation.

No route, migration, runtime configuration, deployment configuration, provider transport, persistence executor, or scheduler was added.

## Pilot packet

The packet binds only sanitized public metadata and control lineage:

- version/purpose `gsc_search_analytics_first_pilot`
- environment
- Google project ID and public OAuth client ID
- exact redirect URI and consent mode
- exact Task #72 profile/external-account identity
- exact `webmasters.readonly` scope
- exact supported `sc-domain:<domain>` property
- accepted permission level
- Task #67/#68/#69 lineage
- bounded query policy
- issued/expiry timestamps
- SHA-256 fingerprint.

It contains no client secret, access token, refresh token, authorization header, raw provider payload, or arbitrary provider response.

## Fail-closed production contract

Production packets require an exact allowlisted HTTPS redirect URI, non-localhost callback, production consent-mode descriptor, exact GSC-purpose identity, exact readonly scope, supported domain property, accepted permission policy, maximum 30-minute TTL, and inherited Task #71 query bounds.

Default first-pilot query policy is 7 days, query dimension required, optional page dimension, max 5,000 rows/page and 2 pages, no provider write, no automatic retry, and dimensional/top-row semantics remain `partial`.

## Readiness composition

`livePilotReady` cannot be true unless all independent conditions are true:

- valid unexpired Task #73 packet
- Task #72 configured/credential/scope/discovery/selection/network readiness
- fresh Task #67/#68/#69 lineage
- exact Task #69 authorization
- separately ready Task #70 execution gate
- exact first-live-read authorization
- no conflicting write/autonomy gate.

Provider/public writes, observation/evidence persistence, scheduler, batch executor, autonomous worker, and retry loop remain hard-false in the Task #73 readiness projection.

## Future provider-interaction stages

Task #73 explicitly separates eight future stages:

1. OAuth client/config binding
2. Google OAuth consent
3. GSC `sites.list` discovery
4. exact GSC property selection/binding
5. Task #70 gate/deployment
6. exact Task #69 job authorization
7. first Search Analytics read
8. observation/evidence persistence.

No stage authorizes any later stage.

## Replit synchronization

After post-merge CI, Replit was Git-only synchronized and verified:

- branch `main`
- SHA `d6a7a4b7cb1f3802e1fd9934b5de72d52a221dd2`
- tree `d105bf916e15333efef5f7f07fb416e2dcfa4f1b`
- ahead/behind `0/0`
- tracked/untracked `0/0`
- clean true
- all five execution/write gates false
- Task #72 readiness all false
- Task #73 packet/lineage/Task69 authorization/Task70/live-read readiness all false
- `livePilotReady=false`
- all persistence/write/autonomy flags false.

## Non-events

No publish/redeploy, DB/schema/data mutation, real OAuth/client/secret/token configuration, Google consent, live Google/GSC/provider request, real property binding, Task #70 execution, observation/evidence persistence, scheduler/batch/worker/retry activation, or provider/public-site mutation occurred.

## Next safe milestone

Read-only Task #73 prepublication certification may verify canonical GitHub/Replit alignment, CI lineage, closed gates/readiness, schema/auth parity, zero Task #70/Task #73 job activity, and absence of provider/persistence/write activity.

Publication of Task #72/#73 remains a separate explicit authorization boundary. Even after publication, every real-provider stage above remains separately gated.
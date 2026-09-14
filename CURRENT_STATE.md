# SEO ENGINE — Current State Checkpoint

This file is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree before acting. `AGENTS.md` remains the durable operating contract and GitHub `main` remains canonical.

## Published production

Task #73 — **GSC First-Live-Read Pilot Readiness v1** — remains the currently published and production-certified application release.

Published application source:

- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Detailed production record: `.agents/memory/task73-production-closeout.md`.

Task #74 is architecture/planning only and has **not** been published. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering architecture — Task #74

Task #74 — **GSC OAuth Client/Config Binding Architecture & Authorization Planning v1** — is architecture-complete.

Authoritative issue:

- issue #132

Architecture document:

- `docs/task74-gsc-oauth-client-config-binding-architecture.md`

Architecture PR lineage:

- PR #137
- exact tested head: `e401396a05fa12a329956ef2042e96b5a48e9207`
- PR CI #238: success
- merge: `b8280828917e394e0c959487e1a8d44198237aa3`
- tree: `cd8c61e7b326c5380bcf939600e6358833ace36d`
- post-merge main CI #239: success

After post-merge CI, Replit was Git-only synchronized and verified at the exact architecture merge:

- branch: `main`
- HEAD: `b8280828917e394e0c959487e1a8d44198237aa3`
- tree: `cd8c61e7b326c5380bcf939600e6358833ace36d`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- clean: true
- extra local commit: false

No publication/redeploy or runtime/provider mutation occurred.

Detailed record: `.agents/memory/task74-architecture-closeout.md`.

## GSC control chain

The controlled architecture is now:

`Task #66 market/category identity`

→ `Task #67 reviewed signal-source registry + refresh planning`

→ `Task #68 exact adapter request + normalization`

→ `Task #69 exact expiring collection-job packet + authorization`

→ `Task #70 durable default-off single-job execution + replay lock`

→ `Task #71 GSC Search Analytics runner foundation`

→ `Task #72 GSC delegated OAuth/property readiness`

→ `Task #73 first-live-read pilot packet/readiness composition`

→ `Task #74 GSC OAuth client/config binding architecture`

Task #70 remains authoritative for durable execution and replay protection. Tasks #71–#74 do not create an alternate executor.

## Task #72 GSC identity remains exact

The future GSC provider connection must preserve:

- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property identity: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`
- delegated provider OAuth as credential source
- application login/OIDC is not provider OAuth material.

Task #72 already models state + PKCE S256, exact-scope authorization, GSC-only `sites.list` discovery through an injected transport, exact discovered-resource membership, and fail-closed readiness.

## Task #74 decisive finding — legacy callback isolation gap

The existing generic Google runtime path is not an acceptable binding target for a future Task #72 GSC-only credential.

The legacy flow currently:

- requests both Search Console readonly and Analytics readonly;
- validates the combined legacy Google scope set;
- discovers both Search Console and GA4 resources;
- persists under generic external account identity `google`.

Therefore **no real GSC OAuth client or client secret may be created or bound until a separately reviewed profile-isolated runtime foundation exists and is published inert**.

The future GSC path must fail closed and, before token exchange, guarantee:

1. exact Task #72 GSC purpose/profile;
2. GSC-specific client configuration with no legacy fallback;
3. exact single scope `webmasters.readonly`;
4. GSC-only discovery;
5. persistence identity exactly `google#gsc-read-only-v1`;
6. no GA4 discovery/selection;
7. no generic `google` record overwrite/fallback;
8. no Task #70 enablement or Search Analytics execution.

A dedicated GSC start route is preferred. The physical callback URI may be reused only if authenticated/sealed state purpose dispatch happens before token exchange and credential selection.

## Planned production callback identity

For the current production generation, Task #74 records the planned callback as:

`https://dsseoengine.replit.app/api/connections/google/callback`

This is planning metadata only. It has not been registered or changed in Google Cloud by Task #74.

Any future production-origin change invalidates the binding descriptor and requires a new review/fingerprint.

## Credential and secret boundary

Task #74 separates three classes:

1. **public client/config metadata** — project/client ID, redirect, scope/profile and verification descriptors; may enter sanitized binding fingerprints;
2. **OAuth client secret** — runtime secret store/environment only; never Git, DB metadata, logs, browser payloads, Task #73 packet, or authorization phrase;
3. **delegated access/refresh tokens** — only after separately authorized consent; later use the existing AES-256-GCM `connections.secret_ref` token-envelope path under the GSC-specific connection identity.

Recommended future GSC-specific runtime names:

- `GSC_OAUTH_CLIENT_ID`
- `GSC_OAUTH_CLIENT_SECRET`

Legacy `GOOGLE_OAUTH_*` settings must not be an automatic GSC fallback.

## Stage A sanitized binding architecture

Task #74 defines both:

- a pre-creation `GscOAuthClientCreationPlanV1` identity;
- a post-creation `GscOAuthClientBindingDescriptorV1` identity.

The post-creation descriptor binds only non-secret metadata:

- environment;
- Google project ID/optional number;
- OAuth client type `web_application`;
- public client ID;
- exact `APP_ORIGIN`;
- exact redirect URI and allowlist;
- Task #72 profile/external identity;
- exact single `webmasters.readonly` scope;
- offline-access posture;
- `includeGrantedScopes=false`;
- `prompt=consent`;
- PKCE S256 + mandatory state;
- Google Auth Platform audience/publishing/verification/scope-classification descriptors;
- secret slot ID/name only, never secret value;
- every execution/write/persistence/autonomy permission false;
- bounded timestamps;
- deterministic SHA-256 fingerprint excluding all secret/token material.

## Google Auth Platform review boundary

Task #74 intentionally does not assume the future selected project's classification of `webmasters.readonly`.

Before production consent, the actual Google Auth Platform state must be reviewed for:

- Branding;
- Audience;
- Clients;
- Data Access;
- Verification Center;
- authorized domain;
- privacy policy/homepage requirements as applicable;
- exact scope classification;
- whether verification is required, exempt, in review, or complete.

Unknown classification/verification applicability fails closed.

## Future authorization stages remain independent

Task #74 defines, but does not execute, these authorization families:

- A0 plan approval: `AUTHORIZE_GSC_OAUTH_CLIENT_PLAN:<planFingerprint>`
- A1 client creation: `AUTHORIZE_GSC_OAUTH_CLIENT_CREATE:<planFingerprint>`
- A2 public config binding: `AUTHORIZE_GSC_OAUTH_CLIENT_CONFIG_BINDING:<bindingFingerprint>`
- A3 secret placement: `AUTHORIZE_GSC_OAUTH_SECRET_BINDING:<bindingFingerprint>:<secretSlotId>`
- A4 static no-network readiness: `AUTHORIZE_GSC_OAUTH_STATIC_READINESS_CHECK:<bindingFingerprint>:<secretSlotId>`
- B1 consent: `AUTHORIZE_GSC_OAUTH_CONSENT:<bindingFingerprint>`

Later `sites.list`, exact property binding, Task #70 gate/deployment, exact Task #69 job authorization, first Search Analytics read, and observation/evidence persistence remain separately authorized.

No authorization implies any later stage. Raw secrets are forbidden in authorization phrases.

## Rotation / rollback

Task #74 requires:

- no raw-secret logging or fingerprinting;
- no automatic legacy Google fallback;
- new descriptor/fingerprint for client/secret rotation;
- optional primary/next slots only with explicit active-slot selection;
- no automatic promotion, revocation, deletion, or fallback;
- callback exchange with the same client generation that initiated consent;
- fail-closed `configured`/`credentialReady` on mismatch;
- explicit rollback authorization;
- destructive Google-side revocation/deletion always separately authorized.

## No-schema-change decision

Task #74 requires no database migration or DDL. Client configuration remains runtime configuration. Future delegated tokens can use the existing encrypted connection persistence mechanism under the GSC-specific identity.

## Current safety boundary

Keep all of the following closed unless a later task explicitly authorizes otherwise:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- competitor one-target dry-run execution=false
- competitor collection=false
- competitor evidence persistence=false
- public-site writes=false
- Task #72 configured=false
- credentialReady=false
- scopeReady=false
- propertyDiscoveryReady=false
- selectedPropertyReady=false
- networkReady=false
- task70ExecutionEnabled=false
- liveReadAuthorized=false
- Task #73 packet/lineage/Task #69/Task #70/first-live-read readiness=false
- provider/public writes=false
- observation/evidence persistence=false
- scheduler/batch/autonomous-worker/retry=false.

Task #73 production is **published but inert**. Task #74 is **architecture only**.

No real Google Cloud client/project mutation, client-secret action, OAuth consent, access/refresh token action, `sites.list`, Search Analytics request, real Search Console property binding, Task #70 execution, Task #69 authorization use, persistence, DDL, scheduler/worker action, or provider/public-site mutation was performed in Task #74.

## Next safe milestone — proposed Task #75

The next safe engineering milestone is **Task #75 — GSC OAuth Profile-Isolated Runtime Binding Foundation v1**.

Task #75 should remain pure/default-off and use fake/injected transports only. It should provide:

- dedicated GSC-purpose start behavior;
- sealed Task #72 GSC state;
- callback purpose dispatch before token exchange;
- GSC-specific config interfaces/slots;
- exact single-scope validation;
- GSC-only discovery;
- GSC-specific external account identity;
- proof of no GA4/generic-Google fallback;
- no real credentials/provider calls;
- no Task #70/persistence/autonomy enablement.

Task #75 itself must not create a real Google client/secret/token/property binding or contact Google. A real client may be considered only after Task #75 is engineering-certified and published inert, followed by a fresh sanitized A0 creation plan and explicit A1 authorization.

## Connector bookkeeping

During Task #74 action selection, placeholder issues #133–#136 were accidentally created and immediately closed `not_planned`. They contain no project content and caused no code, Replit, runtime, credential, DB, or production change. Issue #132 is the authoritative Task #74 record.

## Resume rule

At every new session:

1. independently resolve GitHub `main` SHA/tree;
2. read `CURRENT_STATE.md`;
3. read `AGENTS.md`, `PROJECT_HANDOFF.md`, `ARCHITECTURE.md`;
4. read `.agents/skills/seo-engine-project/SKILL.md`;
5. read `.agents/memory/MEMORY.md` and relevant closeouts;
6. read the active task issue and task-specific architecture document;
7. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.

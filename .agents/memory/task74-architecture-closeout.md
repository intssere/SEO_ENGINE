# Task #74 — GSC OAuth Client/Config Binding Architecture Closeout

Date: 2026-09-14

## Scope

Task #74 was Stage A architecture/planning only for a future read-only Google Search Console OAuth client/config binding. It authorized repo/provider research and docs/CI/Git synchronization only. It did not authorize or perform any Google Cloud project/client mutation, client-secret action, consent, token exchange, `sites.list`, Search Analytics, property binding, Task #70 execution, persistence, DDL, scheduler/worker activity, provider/public-site mutation, or publication.

## Starting baseline

At Task #74 creation:

- GitHub/Replit workspace `main`: `59ad9dea9253f1f8d8a55bdcfc0be6116493b3a7`
- tree: `04b0d0193911e5221cdef5ab3033341312b0fac2`
- Replit: `0/0`, clean
- published application source remained Task #73 `2498e5b34bbd130c97aa60865cc81875d76eb895`
- published tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- all Task #70/competitor/public-write and Task #72/#73 readiness/autonomy controls were false.

## Issue / architecture record

Issue #132: **Task #74 — GSC OAuth Client/Config Binding Architecture & Authorization Planning v1**.

Architecture document:

- `docs/task74-gsc-oauth-client-config-binding-architecture.md`

Architecture branch:

- `task74-gsc-oauth-binding-architecture`
- exact head: `e401396a05fa12a329956ef2042e96b5a48e9207`
- effective diff: one added architecture document only.

PR #137:

- exact head: `e401396a05fa12a329956ef2042e96b5a48e9207`
- PR CI #238: success
- focused tests: success
- full workspace tests: success
- typecheck: success
- build: success
- merge: `b8280828917e394e0c959487e1a8d44198237aa3`
- tree: `cd8c61e7b326c5380bcf939600e6358833ace36d`
- post-merge main CI #239: success.

Replit was then Git-only synchronized to the exact architecture merge:

- branch: `main`
- HEAD: `b8280828917e394e0c959487e1a8d44198237aa3`
- tree: `cd8c61e7b326c5380bcf939600e6358833ace36d`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- clean: true
- extra local commit: false.

No publication/redeployment occurred.

## Decisive architecture finding

The current live generic Google OAuth route is not a safe binding target for the future Task #72 GSC-only credential.

The legacy flow currently:

- requests Search Console readonly plus Analytics readonly;
- validates the combined legacy Google scope set;
- discovers both Search Console and GA4 resources;
- persists under generic external account ID `google`.

Task #72, by contrast, defines the intended GSC-only identity:

- profile: `gsc_read_only_v1`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- state + PKCE S256
- GSC-only discovery model.

Therefore **no real GSC OAuth client or client secret may be created/bound until a separately reviewed profile-isolated runtime implementation exists and is published inert**. The implementation may reuse the physical callback URI only if sealed OAuth state purpose dispatch occurs before token exchange and credential selection, fails closed on unknown purpose, uses a GSC-specific config slot, performs GSC-only scope validation/discovery, and cannot fall through to the legacy combined flow.

## Production redirect planning identity

For the current production generation, the planned callback identity is:

`https://dsseoengine.replit.app/api/connections/google/callback`

This is planning metadata only. It was not registered or mutated in Google Cloud during Task #74.

Any future production-origin change invalidates the descriptor and requires a new reviewed fingerprint.

## Credential classes and storage boundary

Task #74 separates:

1. **public OAuth metadata** — project/client ID, redirect identity, profile/scope/verification descriptors; may enter sanitized fingerprints;
2. **OAuth client secret** — runtime secret store/environment only; never Git, DB connection metadata, logs, browser payloads, Task #73 packet, or authorization phrase;
3. **delegated access/refresh tokens** — only after separately authorized consent; later use the existing AES-256-GCM `connections.secret_ref` token-envelope path under the GSC-specific connection identity.

Recommended future GSC-specific config names:

- `GSC_OAUTH_CLIENT_ID`
- `GSC_OAUTH_CLIENT_SECRET`

The legacy generic `GOOGLE_OAUTH_*` configuration must not be an automatic fallback for the GSC profile.

## Sanitized binding identity

Task #74 defines a deterministic non-secret client creation plan and a post-creation binding descriptor. The binding descriptor includes:

- environment;
- Google project ID/number;
- Web application client type;
- public client ID;
- exact app origin/redirect/redirect allowlist;
- Task #72 profile and external account identity;
- exact `webmasters.readonly` scope;
- offline-access posture;
- `includeGrantedScopes=false`;
- `prompt=consent`;
- PKCE S256 and mandatory state;
- Google Auth Platform audience/publishing/verification/scope-classification review descriptors;
- secret slot identifier/name only;
- every execution/write/persistence/autonomy permission false;
- bounded timestamps;
- deterministic SHA-256 fingerprint excluding all secret/token material.

## Google Auth Platform review boundary

Task #74 deliberately does **not** assert a sensitivity/restriction classification for `webmasters.readonly` from general documentation. Before future production consent, the actual selected Google Cloud project's Branding, Audience, Clients, Data Access, Verification Center, authorized domain, privacy-policy, and exact scope-classification state must be reviewed. Unknown classification or verification applicability fails closed.

## Authorization families

The architecture separates all future actions. No authorization implies the next one.

- A0 plan approval: `AUTHORIZE_GSC_OAUTH_CLIENT_PLAN:<planFingerprint>`
- A1 client creation: `AUTHORIZE_GSC_OAUTH_CLIENT_CREATE:<planFingerprint>`
- A2 public config binding: `AUTHORIZE_GSC_OAUTH_CLIENT_CONFIG_BINDING:<bindingFingerprint>`
- A3 secret placement: `AUTHORIZE_GSC_OAUTH_SECRET_BINDING:<bindingFingerprint>:<secretSlotId>`
- A4 no-network readiness: `AUTHORIZE_GSC_OAUTH_STATIC_READINESS_CHECK:<bindingFingerprint>:<secretSlotId>`
- B1 consent: `AUTHORIZE_GSC_OAUTH_CONSENT:<bindingFingerprint>`

Later `sites.list`, property binding, Task #70 gate/deployment, exact Task #69 job authorization, first Search Analytics read, and observation/evidence persistence remain separately authorized stages.

Raw secrets are forbidden in every authorization phrase.

## Rotation / rollback

Architecture requires:

- no secret logging/fingerprinting;
- no automatic fallback to the legacy Google client;
- a new binding fingerprint for client/secret rotation;
- optional primary/next slots only with explicit active-slot selection;
- no automatic promotion, revocation, deletion, or fallback;
- authorization-code exchange with the same client generation that initiated consent;
- fail-closed `configured`/`credentialReady` on mismatch;
- explicit authorization for rollback and for destructive Google-side revocation/deletion.

## Schema decision

No Task #74 database migration is required. Client configuration remains runtime configuration; future delegated tokens can use the existing encrypted connection persistence design. Any future request for a new durable client-generation table must separately justify and authorize DDL.

## Next safe engineering milestone

Proposed Task #75: **GSC OAuth Profile-Isolated Runtime Binding Foundation v1**.

Task #75 should be pure/default-off and use fake/injected transports only. It should provide the GSC-only start/purpose dispatch/runtime config boundary, exact single-scope validation, GSC-only discovery and connection identity, and explicit proof of no GA4/generic-Google fallback. It must still create no real client/secret/token/property binding or Google request.

A real Google OAuth client must not be created or bound before Task #75 is engineering-certified and published inert, followed by a fresh sanitized A0 creation plan and explicit A1 authorization.

## Safety certification at closeout

After architecture merge and Replit Git-only synchronization:

- Task #70 execution: false
- competitor dry-run/collection/evidence gates: false
- public-site writes: false
- Task #72 configured/credential/scope/property/network/live-read readiness: false
- Task #72 writes/persistence/scheduler/batch/worker/retry: false
- Task #73 packet/lineage/authorization/live-pilot readiness: false
- Task #73 writes/persistence/scheduler/batch/worker/retry: false
- no publish/redeploy
- no runtime/config/environment mutation
- no DB/schema/data mutation
- no credential/OAuth/property/target mutation
- no Google/provider request
- no provider/public-site mutation.

## Connector bookkeeping note

During action selection, empty marker issues #133, #134, #135, and #136 were accidentally created with placeholder titles and immediately closed `not_planned`. They contained no project content and caused no code, Git branch, Replit, runtime, credential, database, or production change. Issue #132 remains the authoritative Task #74 record.

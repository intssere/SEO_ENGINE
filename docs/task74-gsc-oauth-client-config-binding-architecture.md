# Task #74 — GSC OAuth Client/Config Binding Architecture & Authorization Planning v1

Status: architecture/planning only; no live Google/provider action is authorized by this document.

## 1. Purpose

Task #74 defines Stage A of the future real Google Search Console pilot. The goal is to make creation and binding of a GSC-purpose Google OAuth client reviewable, deterministic, reversible, and incapable of silently widening into the existing combined Google Search Console + GA4 connection flow.

This task does not create a Google Cloud project, OAuth client, client secret, access token, refresh token, Search Console connection, selected property, Task #70 execution state, observation, or evidence row. It does not change Google Auth Platform settings and does not call Google.

The architecture extends the existing chain:

`Task #71 GSC runner` -> `Task #72 GSC delegated OAuth/property readiness` -> `Task #73 first-live-read pilot readiness` -> `Task #74 OAuth client/config binding architecture`

Task #70 remains the only durable signal-collection executor. Task #74 creates no alternate executor.

## 2. Canonical baseline

At Task #74 creation:

- canonical GitHub/Replit workspace main: `59ad9dea9253f1f8d8a55bdcfc0be6116493b3a7`
- canonical tree: `04b0d0193911e5221cdef5ab3033341312b0fac2`
- published Task #73 application source: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- published Task #73 tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- production deployment: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`

All Task #70, competitor, persistence, public-write, Task #72 readiness, Task #73 readiness, scheduler, batch, autonomous-worker, and retry gates were fail-closed at task start.

## 3. Existing contracts that are authoritative

### 3.1 Task #72 GSC profile

The future real GSC connection must retain exactly:

- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported v1 property identity: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser` or `siteFullUser`
- credential source, when real, must be delegated provider OAuth
- application login/OIDC is never substituted for provider OAuth.

Task #72 already provides GSC-specific state creation/assertion, PKCE S256, exact-scope checking, supplied-transport `sites.list` normalization, exact discovered-resource membership, and fail-closed readiness.

### 3.2 Task #73 pilot packet

Task #73 already binds sanitized Google project/client/redirect metadata to the first-read packet. Task #74 must therefore produce a compatible, earlier-stage binding identity. Task #73 remains later and cannot be made live-ready by Task #74 alone.

### 3.3 Existing runtime OAuth primitives

The current API derives OAuth redirect origins from `APP_ORIGIN`. The existing Google callback path is:

`/api/connections/google/callback`

The current runtime expects Google client credentials through environment configuration and stores delegated token bundles only after OAuth through the existing encrypted connection mechanism. Token bundles are encrypted with AES-256-GCM under `OAUTH_CREDENTIAL_ENCRYPTION_KEY` and persisted in `connections.secret_ref`.

The OAuth client secret itself is not connection metadata and must not be placed in `connections.secret_ref`. It remains a runtime secret/configuration concern.

## 4. Critical profile-isolation gap

The legacy Google route cannot consume the future GSC-only client as-is.

The current legacy start/callback flow:

- requests both `webmasters.readonly` and `analytics.readonly`;
- validates the combined legacy Google scope set;
- discovers both Search Console and GA4 resources;
- persists under generic external account ID `google`;
- performs generic Google connection behavior rather than Task #72 GSC-purpose behavior.

In contrast, Task #72 correctly defines a single-scope GSC authorization builder and a distinct external account identity.

### 4.1 Hard prerequisite

No real GSC OAuth client or secret may be bound to SEO_ENGINE until a separately reviewed, default-off runtime implementation guarantees profile isolation.

The acceptable implementation may reuse the physical callback URI, but before token exchange it must dispatch exclusively on authenticated/sealed OAuth state purpose. For GSC state it must:

1. require `purpose === gsc_read_only_v1`;
2. call Task #72 GSC state assertion;
3. select GSC-specific client configuration, never legacy generic Google credentials;
4. require the exact single GSC readonly scope;
5. discover only Search Console sites;
6. persist only as `google#gsc-read-only-v1`;
7. never invoke GA4 discovery/selection;
8. never fall through to the generic `google` external-account record;
9. never enable Task #70 or initiate Search Analytics;
10. fail closed on unknown/missing purpose.

A dedicated GSC start route is strongly preferred. The callback URI may remain the existing callback if purpose dispatch is proven before token exchange and credential selection. This preserves the current production callback identity while separating credential profiles.

## 5. Google-side configuration contract

### 5.1 Client type

The future client type is exactly:

`web_application`

No Desktop, TV/limited-input, Android, iOS, Chrome extension, service account, or installed-app client is acceptable for this flow.

### 5.2 Production redirect identity

For the currently published SEO_ENGINE origin, the Stage A production redirect descriptor is:

`https://dsseoengine.replit.app/api/connections/google/callback`

The value must match the Google Cloud authorized redirect URI exactly. Scheme, host, path, case, port behavior, and trailing slash are part of the identity.

Production rules:

- HTTPS required;
- localhost/loopback prohibited;
- no wildcard redirect;
- no inferred alternate host;
- no silent normalization at authorization time;
- any future `APP_ORIGIN` change invalidates the descriptor and requires a new fingerprint/review.

### 5.3 Exact scope

The only OAuth scope authorized for this GSC profile is:

`https://www.googleapis.com/auth/webmasters.readonly`

The architecture rejects:

- `analytics.readonly`;
- broader Search Console write scope;
- Google Sign-In profile/email scopes unless a future feature separately demonstrates necessity;
- incremental widening from previously granted generic Google scopes.

For the GSC profile, `include_granted_scopes` must remain false so a legacy grant cannot silently widen the effective credential.

### 5.4 State and PKCE

SEO_ENGINE requires both:

- random OAuth `state`, sealed server-side/in an HttpOnly state cookie and validated on return;
- PKCE S256 using the Task #72 state verifier/challenge.

Google may describe `state` as recommended; SEO_ENGINE treats it as mandatory. Unknown, expired, malformed, wrong-provider, or wrong-purpose state fails closed before token exchange.

### 5.5 Offline-access posture

Current Task #72 engineering intentionally builds authorization with:

- `access_type=offline`
- `prompt=consent`
- `include_granted_scopes=false`.

The reason is the project end state: autonomous read-only SEO intelligence will eventually need unattended refreshes. Therefore Task #74 records the intended Stage A posture as `offline_required_for_future_unattended_reads`.

This architecture does not authorize consent or token acquisition. A refresh token may exist only after a separately authorized consent/token-exchange stage. Refresh use is also a provider interaction and remains governed by later execution controls.

## 6. Secret and credential classes

Stage A distinguishes three classes that must never be conflated.

### Class 1 — public/non-secret client metadata

Examples:

- Google project ID/number;
- OAuth client ID;
- client type;
- authorized redirect URI;
- requested scope;
- audience/publishing/verification descriptors.

These may appear in a sanitized binding descriptor and fingerprints.

### Class 2 — OAuth client secret

The Google OAuth client secret is confidential application credential material.

Required handling:

- backend runtime secret store/environment only;
- never Git;
- never issue/PR/comment text;
- never Task #73 packet;
- never browser payload;
- never logs;
- never sanitized connection metadata;
- never DB row;
- never fingerprinted directly or indirectly through a reversible transform.

The future implementation should use GSC-specific runtime names rather than the legacy generic Google names:

- `GSC_OAUTH_CLIENT_ID` — public ID but runtime-bound to the GSC profile;
- `GSC_OAUTH_CLIENT_SECRET` — secret;
- optional rotation slot names such as `GSC_OAUTH_CLIENT_ID_NEXT` / `GSC_OAUTH_CLIENT_SECRET_NEXT` only if the reviewed implementation provides an explicit active-slot selector.

The existing `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` remain legacy combined-Google configuration and must not be an automatic fallback for the GSC profile.

### Class 3 — delegated user tokens

Access/refresh tokens are generated only after future consent. They must use the existing AES-256-GCM token envelope and `connections.secret_ref` persistence path, under the GSC-specific connection identity. Tokens are never client configuration and never part of Task #74.

## 7. Sanitized binding descriptor

Task #74 defines the canonical non-secret binding descriptor shape.

```text
GscOAuthClientBindingDescriptorV1
  version: "task74-gsc-oauth-client-config-binding-v1"
  purpose: "gsc_oauth_client_config_binding"
  environment: "test" | "production"

  googleCloud:
    projectId: string
    projectNumber: string | null
    clientType: "web_application"
    oauthClientId: string

  runtime:
    appOrigin: string
    redirectUri: string
    allowedRedirectUris: string[]
    startProfile: "gsc_read_only_v1"
    callbackDispatch: "sealed_state_purpose_required"
    clientIdConfigKey: "GSC_OAUTH_CLIENT_ID"
    clientSecretSlotId: string
    clientSecretConfigKey: "GSC_OAUTH_CLIENT_SECRET"

  provider:
    provider: "google"
    profile: "gsc_read_only_v1"
    externalAccountId: "google#gsc-read-only-v1"
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
    accessType: "offline"
    includeGrantedScopes: false
    prompt: "consent"
    pkce: "S256"
    stateRequired: true

  googleAuthPlatform:
    audience: "internal" | "external" | "unknown"
    publishingMode: "testing" | "production"
    verificationState:
      "not_evaluated" |
      "not_required_reviewed" |
      "verification_required" |
      "in_review" |
      "verified"
    scopeClassificationReview:
      "not_evaluated" |
      "reviewed_non_sensitive" |
      "reviewed_sensitive" |
      "reviewed_restricted"
    brandingReviewed: boolean
    authorizedDomainReviewed: boolean
    privacyPolicyReviewed: boolean

  safety:
    legacyGoogleFallbackAllowed: false
    providerWritesAllowed: false
    publicSiteWritesAllowed: false
    task70ExecutionAllowed: false
    observationPersistenceAllowed: false
    evidencePersistenceAllowed: false
    schedulerAllowed: false
    batchAllowed: false
    autonomousWorkerAllowed: false
    retryLoopAllowed: false

  issuedAt: ISO-8601
  expiresAt: ISO-8601
  fingerprint: lowercase SHA-256 hex
```

### 7.1 Descriptor rules

A production descriptor is invalid unless:

- environment is `production`;
- client type is `web_application`;
- origin is exactly `https://dsseoengine.replit.app` for the present production generation;
- redirect is exactly the approved callback and appears in `allowedRedirectUris`;
- redirect is HTTPS and non-local;
- profile/external account are exact Task #72 values;
- scope set contains exactly one scope, `webmasters.readonly`;
- `includeGrantedScopes=false`;
- PKCE is S256 and state is required;
- GSC-specific config/secret slots are named;
- no legacy fallback is allowed;
- every write/execution/persistence/autonomy boolean is false;
- verification/scope classification has been explicitly reviewed before production consent is authorized;
- expiry is finite and bounded. Recommended descriptor TTL is 30 minutes, matching the Task #73 pilot packet maximum.

### 7.2 Fingerprint

The fingerprint is SHA-256 over a stable canonical serialization of the sanitized descriptor excluding `fingerprint` itself.

The raw client secret, token material, encryption key, cookie value, authorization code, and provider payload are forbidden inputs to the fingerprint.

## 8. Pre-creation plan vs post-creation binding

A real OAuth client ID does not exist before client creation. Therefore Stage A uses two identities rather than pretending one fingerprint can exist both before and after creation.

### 8.1 Client creation plan

A `GscOAuthClientCreationPlanV1` is a sanitized descriptor without `oauthClientId` and secret-slot material. It binds:

- exact Google project selected for the action;
- client type;
- exact redirect set;
- exact GSC scope intent;
- audience/publishing intent;
- profile isolation prerequisite status;
- no-write/no-provider-read safety state;
- expiry and plan fingerprint.

The plan authorizes only Google-side client creation/configuration when separately approved.

### 8.2 Post-creation binding descriptor

After a client exists, its public client ID can be inserted into `GscOAuthClientBindingDescriptorV1`. This produces a new binding fingerprint. The client secret is never inserted.

The binding fingerprint becomes the identity used by later secret-placement, static-readiness, consent, and pilot planning approvals.

## 9. Authorization matrix

No authorization below implies any later authorization.

| Stage | Exact authorization family | May do | Explicitly may not do |
|---|---|---|---|
| A0 plan approval | `AUTHORIZE_GSC_OAUTH_CLIENT_PLAN:<planFingerprint>` | approve a reviewed non-secret plan | create client, secret, consent, provider request |
| A1 client creation | `AUTHORIZE_GSC_OAUTH_CLIENT_CREATE:<planFingerprint>` | create/configure one Web application client with exact reviewed redirects | place secret in runtime, consent, provider request |
| A2 public config binding | `AUTHORIZE_GSC_OAUTH_CLIENT_CONFIG_BINDING:<bindingFingerprint>` | bind reviewed public client ID/config metadata to GSC runtime profile | reveal/place secret, consent, provider request |
| A3 secret placement | `AUTHORIZE_GSC_OAUTH_SECRET_BINDING:<bindingFingerprint>:<secretSlotId>` | place the already-issued secret into the exact reviewed runtime secret slot | log secret, consent, token exchange, provider request |
| A4 static readiness | `AUTHORIZE_GSC_OAUTH_STATIC_READINESS_CHECK:<bindingFingerprint>:<secretSlotId>` | verify configuration/secret presence and exact non-secret metadata locally | disclose secret, contact Google |
| B1 consent | `AUTHORIZE_GSC_OAUTH_CONSENT:<bindingFingerprint>` | start one reviewed GSC-only user consent flow | `sites.list`, Task #70, Search Analytics unless separately approved |
| B2 discovery | future exact discovery authorization | one bounded `sites.list` using the reviewed connection | property mutation, Search Analytics |
| B3 property bind | future exact property-binding authorization | select one exact discovered supported `sc-domain` property | Task #70/Search Analytics |
| C1 Task #70 gate | separate Task #70 authorization | separately reviewed execution-gate/deployment action | run a job without Task #69 + first-read auth |
| C2 Task #69 job | existing exact Task #69 authorization | authorize one fingerprinted job | provider execution by itself |
| C3 first read | future exact first-read authorization | one bounded Search Analytics read | persistence unless separately approved |
| D1 persistence | future persistence authorization | persist reviewed normalized result/evidence | public/provider mutation |

Raw secrets are forbidden in every authorization phrase.

## 10. Static readiness semantics

After future A1-A3 actions, an A4 static readiness check may set `configured`/`credentialReady` only from local facts. It must not contact Google.

A safe local projection may consider:

- binding descriptor is valid/unexpired;
- runtime `APP_ORIGIN` equals descriptor origin;
- computed callback equals descriptor redirect exactly;
- GSC client ID config is present and equals descriptor client ID;
- GSC client secret slot is present/non-empty **without reading it into logs/output**;
- profile/external identity/scope contract are exact;
- profile-isolated runtime path has been deployed and certified;
- Google Auth Platform review fields are in an allowed state for the planned next action.

Static readiness must remain false if the implementation is still using the legacy generic Google callback behavior.

Static readiness does not prove Google accepts the client, secret, redirect, audience, or verification state. That proof begins only at the separately authorized provider stage.

## 11. Google Auth Platform review model

Task #74 does not guess the current sensitivity classification of `webmasters.readonly` for a future selected Cloud project. Classification must be read from the actual Google Auth Platform Data Access configuration when the user later authorizes that review/action.

Before production consent, record sanitized status for:

- Branding;
- Audience;
- Clients;
- Data Access;
- Verification Center;
- authorized domain ownership/review;
- homepage/privacy-policy readiness where applicable;
- current classification of the exact scope;
- whether verification is required, exempt, in progress, or complete.

If classification/verification applicability is unknown, production consent authorization fails closed.

## 12. Rotation architecture

### 12.1 Preferred strategy

Use a new client generation rather than overwriting identity in place when practical.

A rotation generation has:

- new public client ID;
- new secret slot ID;
- new binding descriptor/fingerprint;
- same reviewed GSC profile and scope;
- exact reviewed redirect set;
- explicit active-slot selection only after validation.

### 12.2 Dual-slot model

A future implementation may support:

- primary slot;
- next slot;
- non-secret active-slot selector.

Rules:

- no automatic promotion;
- no automatic fallback;
- no automatic old-client deletion/revocation;
- one slot selected deterministically per OAuth state purpose/generation;
- callback exchanges a code only with the same client generation that initiated authorization.

### 12.3 Rollback

Rollback requires a previously reviewed descriptor that is still structurally valid and an explicit rollback authorization. On any mismatch:

- `configured=false` and/or `credentialReady=false`;
- live consent/read remains blocked;
- Task #70 remains false;
- provider/public writes remain false;
- no credential is deleted automatically.

Revoking/deleting a Google client or secret is a destructive Google-side action and always requires separate explicit authorization.

## 13. Logging and observability

Allowed sanitized fields:

- binding/plan fingerprint;
- public client ID suffix or full public client ID if needed for operator review;
- project ID;
- environment;
- redirect URI;
- secret slot ID/name;
- boolean secret-present status;
- verification-state enums;
- readiness booleans;
- stage/outcome/category.

Forbidden fields:

- client secret;
- authorization code;
- PKCE verifier;
- state-cookie payload/signature;
- access token;
- refresh token;
- Authorization header;
- raw Google response;
- encryption key;
- encrypted secret envelope if it could be replayed as credential material.

## 14. No-schema-change decision

Task #74 requires no database migration.

The existing `connections` model remains sufficient for a later GSC delegated-token connection because Task #72 already defines a distinct external account identity and token encryption path. Client configuration remains runtime configuration, not a new database entity.

If a future implementation needs durable audit history for client-generation metadata, it must first demonstrate why existing job/audit/config records are insufficient and obtain a separate schema authorization. Normal Stage A does not need DDL.

## 15. Profile-isolation implementation prerequisite — proposed Task #75

The next safe engineering milestone after Task #74 should be a pure/default-off **GSC OAuth Profile-Isolated Runtime Binding Foundation v1**.

It should, without real credentials or provider calls:

- add a GSC-only start path;
- create/seal Task #72 GSC-purpose state;
- route callback by authenticated purpose before token exchange;
- choose GSC-specific fake/config interfaces;
- require exact readonly scope;
- use injected fake token/discovery transports in tests;
- call only GSC discovery in the GSC branch;
- persist only through an injected/fake GSC-specific persistence interface in engineering tests;
- prove no GA4 discovery/fallback;
- keep all real credential/network/persistence gates false;
- require a later publication before any real client is created/bound.

Task #75 engineering itself must not create a real Google client, secret, consent, token, property binding, or provider request.

## 16. Roll-forward sequence to the first real read

The safe sequence is:

1. Task #74 architecture/planning certified.
2. Task #75 profile-isolation engineering certified and published, still inert.
3. Build a sanitized A0 client creation plan from exact production state.
4. Explicitly authorize A1 Google client creation/configuration.
5. Capture only public client ID/project metadata; build binding descriptor/fingerprint.
6. Explicitly authorize A2 public config binding.
7. Explicitly authorize A3 secret placement into one exact runtime secret slot.
8. Run separately authorized A4 no-network static readiness.
9. Review actual Google Auth Platform scope classification/verification status.
10. Explicitly authorize one GSC-only consent flow.
11. Separately authorize `sites.list`.
12. Separately authorize exact discovered property binding.
13. Build fresh Task #67/#68/#69 lineage and Task #73 pilot packet.
14. Separately authorize Task #70 gate/deployment if still required.
15. Supply exact Task #69 authorization.
16. Supply exact first-live-read authorization.
17. Execute one bounded Search Analytics read.
18. Review normalized result before any persistence authorization.

At no point does observation automatically become mutation.

## 17. Acceptance criteria

Task #74 architecture is complete only when the durable record states all of the following:

- exact current production callback identity;
- dedicated GSC client profile separate from legacy generic Google/GA4 flow;
- GSC-specific future environment/secret names;
- client secret vs delegated-token storage separation;
- exact single scope;
- mandatory state + PKCE;
- offline-access rationale and separate consent boundary;
- sanitized creation-plan and binding-descriptor identities;
- deterministic fingerprints excluding secrets;
- Google Auth Platform verification/classification review model;
- explicit rotation/rollback rules;
- exact authorization families for A0-A4;
- profile-isolation implementation is a prerequisite to real client creation/binding;
- no schema migration;
- no live Google/provider request;
- no OAuth/secret/property mutation;
- no Task #70 execution;
- no observation/evidence persistence;
- no scheduler/batch/worker/retry activation;
- no provider/public-site write;
- no publication/redeployment.

## 18. Current Task #74 authorization boundary

Allowed under Task #74:

- read-only repo/provider research;
- this docs-only architecture;
- issue/branch/PR/CI/merge;
- docs-only checkpoint/memory closeout;
- Git-only Replit synchronization;
- read-only certification.

Not allowed:

- real Google Cloud/OAuth client creation or edit;
- real secret creation/view/copy/storage/rotation/revocation/deletion;
- Google Auth Platform mutation;
- consent or token exchange;
- live `sites.list` or Search Analytics;
- property binding;
- Task #70 enablement/execution;
- Task #69 authorization consumption;
- observation/evidence persistence;
- scheduler/batch/worker/retry;
- production DDL;
- Task #53/#54/#64 execution;
- provider/public-site mutation;
- publication/redeployment.

## 19. Provider-documentation review note

Task #74 was checked against current Google documentation for Web Server OAuth, Search Console `sites.list`, Search Analytics query, OAuth consent/data-access configuration, and sensitive/restricted-scope verification behavior on 2026-09-14. Google-side classification and verification applicability can change and must be rechecked immediately before any future Google Cloud or consent action.

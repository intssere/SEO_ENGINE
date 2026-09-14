# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the full completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Task #74 and Task #75 have **not** been published. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering state — Task #75 complete

Task #75 — **GSC OAuth Profile-Isolated Runtime Binding Foundation v1** — is engineering-complete, CI-certified, merged, and Git-only synchronized to Replit.

Authoritative issue:
- issue #142

Implementation PR:
- PR #143
- exact corrected tested head: `45302ccfe5f289481b82a7fdeb0450e8a3e0d7cd`
- PR CI #245 / run `34890806443`: success
- application merge: `b6ae18db99baf022cdb7368f3e17c4bb1fa1a687`
- tree: `66cc24c044145eb93a8a198e3ca817db1aaeaffd`
- post-merge main CI #246 / run `34891284127`: success

The initial Task #75 PR head `f6216e0b69af56b8538998cc19e47a304cda5fe2` passed task/full tests but CI #244 failed typecheck only because a new test variable assigned inside an injected async callback was narrowed incorrectly by TypeScript. The test capture was corrected without changing production behavior; exact-head CI #245 then passed task tests, full workspace tests, typecheck and build.

Detailed engineering record:
- `.agents/memory/task75-engineering-closeout.md`

## Replit engineering workspace

After post-merge CI #246, Replit was Git-only synchronized and read-only verified at the exact Task #75 merge:
- branch: `main`
- HEAD: `b6ae18db99baf022cdb7368f3e17c4bb1fa1a687`
- tree: `66cc24c044145eb93a8a198e3ca817db1aaeaffd`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

No publication/redeployment, runtime/config/environment mutation, DB/schema/data operation, credential/OAuth/provider mutation, safety-gate change, provider request, or public-site mutation occurred.

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
→ `Task #75 profile-isolated GSC runtime binding foundation`

Task #70 remains authoritative for durable collection execution and replay protection. Tasks #71–#75 do not create an alternate executor.

## Task #75 decisive behavior

The legacy generic Google runtime remains available only as a separately classified compatibility path. It requests/handles the historical combined Search Console + GA4 profile and persists under generic external identity `google`.

Task #75 prevents a future GSC-only flow from entering that path:
1. dedicated GSC start behavior creates Task #72 `gsc_read_only_v1` purpose state;
2. the shared callback opens/authenticates sealed state and classifies purpose **before** legacy client-config selection, token exchange, provider transport selection or discovery;
3. unknown Google OAuth purpose fails closed;
4. GSC config uses only `GSC_OAUTH_CLIENT_ID` / `GSC_OAUTH_CLIENT_SECRET`, with no fallback to `GOOGLE_OAUTH_*`;
5. pure injected orchestration enforces exactly `https://www.googleapis.com/auth/webmasters.readonly`;
6. GSC discovery is modeled as GSC-only;
7. persistence identity is fixed to `google#gsc-read-only-v1`;
8. tests prove no GA4/generic-Google fallback;
9. `GSC_READONLY_OAUTH_RUNTIME_ENABLED` is exact-true and default-off;
10. the live GSC transport is intentionally **unbound** in Task #75, so a GSC-purpose callback still fails closed before any real Google token exchange/provider request.

## Exact GSC identity remains

- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property identity: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`
- delegated provider OAuth is the credential source
- application login/OIDC is not provider OAuth material.

## Live-provider boundary remains closed

No real GSC OAuth client or client secret has been created/bound by Tasks #74/#75. No OAuth consent, delegated token, `sites.list`, Search Analytics call, real GSC property binding, Task #70 live execution, observation/evidence persistence, scheduler/worker action, DDL, provider write or public-site write has occurred.

Task #74 authorization families remain staged and independent:
- A0 plan approval: `AUTHORIZE_GSC_OAUTH_CLIENT_PLAN:<planFingerprint>`
- A1 client creation: `AUTHORIZE_GSC_OAUTH_CLIENT_CREATE:<planFingerprint>`
- A2 public config binding: `AUTHORIZE_GSC_OAUTH_CLIENT_CONFIG_BINDING:<bindingFingerprint>`
- A3 secret placement: `AUTHORIZE_GSC_OAUTH_SECRET_BINDING:<bindingFingerprint>:<secretSlotId>`
- A4 static no-network readiness: `AUTHORIZE_GSC_OAUTH_STATIC_READINESS_CHECK:<bindingFingerprint>:<secretSlotId>`
- B1 consent: `AUTHORIZE_GSC_OAUTH_CONSENT:<bindingFingerprint>`

Later `sites.list`, property binding, Task #70 deployment/gate, exact Task #69 collection authorization, first Search Analytics read and evidence persistence remain separately authorized.

A real GSC OAuth client remains blocked until Task #75 is separately **published inert and production-certified** under explicit publication authorization, followed by a fresh sanitized A0 plan and the required explicit later authorizations.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- competitor one-target execution/collection/evidence persistence=false
- Task #72 configured/credential/scope/property/network/live-read readiness=false
- Task #73 packet/lineage/Task #69/Task #70/first-live-read readiness=false
- provider/public writes=false
- observation/evidence persistence=false
- scheduler/batch/autonomous-worker/retry=false.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Task #75 completes roadmap **P1.1/P1.2 engineering foundation** but not live-provider activation. P1.3–P1.8 remain blocked behind separate publication/provider authorizations as defined in the master roadmap and Task #74 architecture.

The 30-page crawl remains a deliberate `baseline` certification mode; it is not the intended production whole-site limit.

## Next safe engineering milestone

While Task #75 publication/live-provider authorization is pending, the next safe/default-off engineering task is:

**P2.1 — Full-Site Crawl Controller Architecture: `baseline` vs `full_site`.**

The crawler milestone should:
- preserve the existing approximately 30-page `baseline` mode for quick certification;
- define an inventory-driven `full_site` mode instead of an unbounded crawler;
- use sitemap discovery first with internal-link supplementation;
- canonicalize/dedupe URLs;
- define robots/noindex/canonical/exclusion accounting;
- guard query/filter/calendar/facet traps;
- define bounded concurrency/rate limits/retries;
- add hard safety ceilings;
- define batch checkpoints/resume;
- define a deterministic completion ledger and whole-site certification semantics;
- keep competitor crawling separately bounded;
- make no public-site/provider mutation.

Generic `continue` may advance this pure/default-off crawler architecture/engineering workflow. It does **not** authorize Task #75 publication, real Google credentials/provider calls, persistence/DDL, autonomous workers, or public-site/provider writes.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` and relevant closeouts, especially Task #75;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.

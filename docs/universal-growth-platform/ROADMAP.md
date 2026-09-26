# Universal Growth Platform — Execution Roadmap

**Branch:** `initiative-universal-growth-platform`  
**Base main SHA:** `2c31f3e4a355ac1bb2715f201a5dc2148a3b99f7`  
**Program state:** isolated architecture/roadmap established; implementation not yet started.

This roadmap is intentionally separate from `MASTER_COMPLETION_ROADMAP.md`. It governs only the isolated Universal Growth Platform initiative until the final integration gate.

---

## 0. Branch and delivery model

The initiative uses a long-lived integration branch:

`initiative-universal-growth-platform`

Future implementation should preferably use short-lived work branches created from the current initiative head and open PRs **into the initiative branch**, not directly into `main`.

Example:

```text
main
 │
 └── initiative-universal-growth-platform
       ├── ugp/01-universal-contracts
       ├── ugp/02-customer-shell
       ├── ugp/03-public-web-onboarding
       ├── ugp/04-mcp-connector
       └── ...
```

Flow:

```text
UGP task branch
→ tests
→ PR to initiative branch
→ exact-head CI
→ merge to initiative branch
→ initiative regression certification
```

Periodically:

```text
current main
→ reviewed sync into initiative branch
→ conflict resolution
→ full initiative regression
```

Never merge the initiative branch into `main` before UGP-14 final integration certification and explicit user authorization.

---

# Program streams

The program has five parallel product streams after the common foundation:

```text
                    UGP-1 Foundation
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
     Connectivity          UX             Data/Jobs
          │                │                 │
          ├────────┐       │       ┌─────────┤
          │        │       │       │         │
       Content   Authority │    Automation  Measurement
          │        │       │       │         │
          └────────┴───────┴───────┴─────────┘
                           │
                    UGP-14 Integration
```

---

# UGP-0 — Initiative isolation and architecture

**Status:** DONE — initial branch/doc foundation.

Deliverables:

- dedicated initiative branch;
- isolation contract;
- target system architecture;
- phased roadmap;
- explicit final merge gate.

Exit criteria:

- branch exists from verified canonical `main`;
- no `main` source change;
- architecture defines connector, content, authority, UX and automation boundaries;
- no production runtime change.

---

# UGP-1 — Universal core contracts

**Goal:** remove provider assumptions from new core work before adding new connectors.

## UGP-1.1 Universal site/resource identity

Implement pure contracts for:

- site;
- connection;
- resource kind;
- external resource identity;
- canonical URL;
- provider identity;
- state fingerprint;
- locale;
- parent/relationship identity.

Must support Shopify without losing exact provider identity.

## UGP-1.2 Capability registry

Implement normalized capability vocabulary and constraints:

- read;
- metadata/content/schema/internal links;
- create/update/publish;
- preview/verify/rollback;
- Git operations;
- outreach operations.

## UGP-1.3 Connector interface

Implement provider-neutral interfaces for:

- discovery;
- read;
- preview;
- execute;
- verify;
- rollback.

Initial certification is pure/mock only.

## UGP-1.4 Shopify compatibility adapter

Map current Shopify resource/action semantics into the universal contracts without changing current production authority.

Exit criteria:

- universal models are deterministic;
- no provider/network call in contract tests;
- Shopify current supported resources map losslessly;
- no mutation gate changes;
- current Shopify production path remains behaviorally unchanged.

**Dependency:** UGP-0.

---

# UGP-2 — Customer Experience shell v1

**Goal:** make SEO ENGINE understandable to a business owner/SEO manager without exposing engineering internals.

## UGP-2.1 Product information architecture

Primary product domains:

- Home;
- Opportunities;
- Content;
- Site Audit;
- Authority;
- Automation;
- Performance;
- Settings.

## UGP-2.2 Progressive disclosure

Define standard three-level presentation:

1. customer view;
2. evidence view;
3. advanced/technical view.

## UGP-2.3 Opportunity/action card grammar

Standardize:

- problem;
- impact;
- risk;
- current state;
- recommended state;
- why;
- preview;
- apply/review;
- measurement state.

## UGP-2.4 Website connection wizard

UX only initially:

```text
URL
→ detected platform
→ analysis level
→ connection methods
→ Google/search connections
→ automation mode
```

## UGP-2.5 Contextual onboarding

Evaluate Driver.js or equivalent behind a replaceable UI boundary.

Exit criteria:

- existing framework retained;
- no engineering task IDs in default primary UX;
- all underlying evidence remains inspectable;
- WCAG/responsive contracts extend to new shell;
- no fabricated production data.

**Can run in parallel after UGP-1 contracts stabilize.**

---

# UGP-3 — Universal public-web onboarding and read analysis

**Goal:** allow any public website to enter SEO ENGINE even without CMS credentials.

## UGP-3.1 URL onboarding

User enters a domain/URL.

System safely resolves:

- canonical origin;
- redirects;
- robots;
- sitemap hints;
- platform/framework hints.

## UGP-3.2 Platform detection

Evidence-based hints for:

- Shopify;
- WordPress/WooCommerce;
- Webflow;
- Wix;
- headless/custom;
- unknown.

Detection is advisory and never grants connector capability.

## UGP-3.3 Universal read-only site analysis

Reuse current crawl architecture for:

- crawlability;
- indexability;
- metadata;
- canonical;
- structured data;
- internal links;
- content;
- images;
- performance.

## UGP-3.4 JS-rendered execution backend evaluation

Evaluate Crawlee only where current fetch strategy cannot observe required rendered state.

## UGP-3.5 Lighthouse evidence adapter

Normalize Lighthouse results into SEO ENGINE evidence/opportunities.

Exit criteria:

- arbitrary approved public sites can be analyzed read-only;
- SSRF/DNS protections remain intact;
- write capabilities remain absent;
- no CMS-specific credential required for Level-1 analysis.

---

# UGP-4 — Universal connector plane

**Goal:** move from "analyze any site" to "connect supported sites."

## UGP-4.1 MCP connector

Implement one controlled MCP client.

Requirements:

- allowlisted server/provider;
- tool/resource inventory;
- explicit tool-to-capability mapping;
- exact site scope;
- network and credential isolation;
- deny arbitrary tool execution.

Initial provider certification sequence:

1. WordPress;
2. Webflow;
3. Contentful/Directus/Sanity based on maintained production interfaces.

## UGP-4.2 OpenAPI connector

Implement:

- OpenAPI document validation;
- operation inventory;
- administrator capability mapping;
- generated typed-client boundary;
- safe read-only initial mode.

Evaluate Hey API/openapi-ts as implementation tooling.

## UGP-4.3 Git connector

Initial GitHub support:

- repository binding;
- framework/content-source detection;
- exact ref/file identity;
- branch creation;
- deterministic patch;
- PR creation;
- CI/status observation.

No direct default-branch write in v1.

Evaluate Octokit and ast-grep.

## UGP-4.4 Future Site Agent specification

Specification only unless a real unsupported environment requires it.

Exit criteria:

- at least WordPress plus one additional non-Shopify CMS certified through common contracts;
- Git-backed custom site read/PR path certified;
- Shopify remains regression-safe;
- no connector can bypass SEO ENGINE authorization.

---

# UGP-5 — Connection broker and multi-site connection UX

**Goal:** make adding provider connections easy without embedding credential complexity throughout the application.

## UGP-5.1 ConnectionBroker contract

Abstract:

- connection start;
- credential lease;
- refresh;
- revoke;
- health;
- reconnect.

## UGP-5.2 Broker implementation evaluation

Evaluate Nango behind the broker interface.

Mandatory before adoption:

- license/commercial-use review;
- data residency review;
- token-storage/security review;
- failure/recovery design;
- self-hosted/cloud decision.

## UGP-5.3 Connections UI

Customer sees:

- Website;
- Search Console;
- Analytics;
- CMS;
- Backlink/SERP provider;
- status/reconnect.

Exit criteria:

- provider-specific credential logic does not leak into product modules;
- connection loss is understandable and recoverable;
- site scope is explicit.

---

# UGP-6 — Content Intelligence

**Goal:** decide what should be created, refreshed, consolidated or left alone.

## UGP-6.1 Keyword/SERP data adapter

Normalize:

- search volume;
- difficulty;
- CPC/competition where relevant;
- SERP features;
- ranking URLs;
- intent;
- related queries/topics.

DataForSEO is the initial provider candidate.

## UGP-6.2 Topic clustering

Create deterministic topic/keyword clusters using:

- SERP overlap;
- semantic similarity;
- intent;
- site/category/business entity context.

No purely semantic clustering should force separate pages where SERPs show one intent.

## UGP-6.3 Cannibalization/coverage guard

Before proposing new content:

- inspect current indexed/crawl inventory;
- inspect GSC page/query relationships;
- identify existing ranking/target pages;
- classify create vs refresh vs consolidate.

## UGP-6.4 Content opportunity model

Output:

- target topic;
- search intent;
- recommended content type;
- existing coverage;
- business relevance;
- evidence;
- expected measurement method.

Exit criteria:

- every article opportunity is evidence-backed;
- no article is created merely because a keyword exists;
- existing ranking content is protected from naive cannibalization.

---

# UGP-7 — Research and Article Engine

**Goal:** produce research-backed, verifiable content artifacts.

## UGP-7.1 Research plan

Transform a content opportunity into:

- research questions;
- required evidence classes;
- source discovery plan.

Study STORM/GPT Researcher patterns.

## UGP-7.2 Source acquisition and evidence ledger

Store normalized:

- source identity;
- publication/update date where available;
- extracted evidence;
- claim relevance;
- source quality signals;
- source fingerprint.

## UGP-7.3 Brief and outline

Generate evidence-grounded:

- content goal;
- audience;
- intent;
- structure;
- questions;
- claims;
- product/business entities;
- internal-link targets.

## UGP-7.4 Draft pipeline

Stage-based article generation:

- section drafts;
- citation binding;
- fact verification;
- coherence;
- originality/additive value;
- brand voice;
- SEO;
- AEO/GEO;
- metadata;
- schema/media plan.

## UGP-7.5 Quality gate

Hard blockers include:

- unsupported important factual claims;
- broken/mismatched citations;
- obvious duplication/cannibalization;
- unsafe/prohibited content;
- missing intent requirements;
- low-value scaled-content pattern.

## UGP-7.6 Article workspace UI

Expose:

- research progress;
- sources;
- outline;
- editor;
- claims/citations;
- SEO checks;
- internal links;
- publication state.

Exit criteria:

- article can be reproduced deterministically from frozen inputs where appropriate;
- source/claim provenance is inspectable;
- quality gate is separate from model confidence;
- no article is published solely because generation completed.

---

# UGP-8 — Publishing, internal linking and refresh

**Goal:** close the content loop.

## UGP-8.1 Connector-neutral article publishing

Use normalized capabilities:

- create article;
- update article;
- publish article;
- preview;
- verify.

Initial targets:

- Shopify blog;
- WordPress;
- one additional CMS;
- Git-backed markdown/MDX site.

## UGP-8.2 Internal Linking Engine

Create evidence-backed recommendations in both directions:

- new content → relevant existing pages;
- existing pages → new content.

## UGP-8.3 Content calendar

Customer defines publishing policy such as:

- N articles/week;
- allowed content categories;
- blackout dates;
- review/autopilot mode.

Calendar is generated from opportunity priority and capacity.

## UGP-8.4 Decay/refresh detection

Use:

- GSC;
- ranking;
- freshness;
- SERP changes;
- crawl/content changes.

Generate refresh opportunities instead of endlessly producing new articles.

Exit criteria:

- one article can flow from opportunity through verified publication;
- publishing uses universal connectors;
- internal linking has preview/evidence;
- refresh loop produces measurable lineage.

---

# UGP-9 — Authority Intelligence

**Goal:** build a legitimate earned-authority operating layer.

## UGP-9.1 Backlink provider adapter

Normalize provider-neutral:

- backlink;
- referring domain;
- anchor;
- target;
- first/last seen;
- new/lost;
- attributes;
- provider metrics.

Initial provider candidate: DataForSEO.

## UGP-9.2 Authority dashboard

Expose:

- referring domains;
- new/lost links;
- top linked pages;
- anchor distribution;
- competitor gap;
- trend.

## UGP-9.3 Opportunity discovery

Implement:

- competitor link gap;
- domain intersection;
- broken-link opportunity;
- unlinked brand mention;
- lost-link recovery;
- resource-page opportunity;
- partner/supplier citation;
- content-promotion prospect.

## UGP-9.4 Prospect qualification

Transparent scoring from:

- topical relevance;
- evidence quality;
- source quality;
- competitor precedent;
- target-page fit;
- contactability;
- spam/risk signals.

Exit criteria:

- backlink dataset is provider-backed, not invented;
- opportunity reasoning is inspectable;
- no automated reciprocal-link network or purchased ranking-link workflow exists.

---

# UGP-10 — Outreach workspace

**Goal:** convert qualified authority opportunities into controlled outreach.

## UGP-10.1 Contact evidence model

Normalize:

- prospect;
- organization/domain;
- contact source;
- contact method;
- confidence/freshness;
- suppression state.

## UGP-10.2 Outreach draft generation

Generate personalized:

- subject;
- angle;
- evidence;
- destination asset;
- call to action.

## UGP-10.3 Campaign/state model

Track:

- draft;
- ready;
- sent;
- replied;
- won;
- declined;
- no response;
- suppressed.

## UGP-10.4 Sending integration

Initial mode: human-reviewed send.

Future automation requires:

- explicit policy;
- per-domain/contact rate limits;
- suppression;
- dedupe;
- unsubscribe/compliance handling;
- sender reputation controls.

Exit criteria:

- no uncontrolled bulk mail path;
- every send binds a real qualified prospect;
- duplicate/suppressed contacts fail closed.

---

# UGP-11 — Durable automation runtime

**Goal:** run crawl/content/measurement/authority jobs reliably without replacing P9 policy semantics.

## UGP-11.1 Job transport adapter

Evaluate pg-boss because the current stack is TypeScript + PostgreSQL.

## UGP-11.2 P9 control mapping

Prove:

- pause;
- drain;
- kill;
- resume/reconciliation;
- retry;
- dead-letter;
- idempotency

map safely onto the chosen transport.

## UGP-11.3 Schedule types

Support:

- crawl;
- GSC refresh;
- SERP refresh;
- content research;
- content publication;
- decay analysis;
- backlink refresh;
- outreach follow-up where authorized;
- measurement windows.

Exit criteria:

- job transport never grants authorization;
- policy state is rechecked at claim/preflight;
- killed/uncertain side effects preserve current fail-closed behavior.

---

# UGP-12 — Measurement and learning integration

**Goal:** connect new growth actions to the existing P10 impact system.

## UGP-12.1 Content measurement

Associate:

- article;
- target queries;
- pages;
- publication/refresh action;
- before/after windows;
- GSC/analytics observations.

## UGP-12.2 Authority measurement

Track descriptive:

- earned/lost link events;
- referring-domain changes;
- target-page search movement;
- outreach outcomes.

Do not infer causal SEO effect from a link merely because timing overlaps.

## UGP-12.3 Calibration signals

Feed outcome evidence into recommendation calibration without turning directional signals into unsupported causal/reward claims.

Exit criteria:

- Content and Authority actions appear in the same change/evidence lineage as current SEO actions;
- P10 non-causal semantics remain intact unless a future separately designed causal method exists.

---

# UGP-13 — Multi-site, security, licensing and production hardening

**Goal:** make the initiative safe enough to become part of the product.

Work includes:

- tenant/site isolation;
- connector credential isolation;
- RBAC;
- rate limiting;
- provider failures;
- dependency/license review;
- MCP/OpenAPI endpoint trust policy;
- content safety;
- outreach compliance;
- privacy/retention;
- backup/recovery;
- observability;
- performance;
- accessibility;
- responsive certification;
- scale/load certification.

Each external dependency receives an adoption record containing:

- exact version;
- license;
- security posture;
- maintenance signal;
- replacement boundary;
- data sent externally;
- fallback strategy.

Exit criteria:

- no unresolved critical security/license blocker;
- all site/tenant boundaries proven;
- new runtime paths observable and recoverable;
- production feature flags default safe.

---

# UGP-14 — Mainline integration and merge candidate

**Goal:** merge only a production-quality, regression-safe system into canonical `main`.

## UGP-14.1 Reconcile current main

Bring the latest canonical `main` into the initiative and resolve all architectural drift.

## UGP-14.2 Shopify regression parity

Existing Shopify supported workflows must remain at least as safe and correct as mainline behavior.

## UGP-14.3 Migration review

Any schema migration must be:

- explicit;
- additive or separately justified;
- reversible where practical;
- tested against current production schema lineage;
- authorized separately for production application.

## UGP-14.4 Full certification

Required:

- unit;
- integration;
- connector contract;
- browser/E2E;
- accessibility;
- responsive;
- security;
- performance;
- scale;
- build;
- dependency/license;
- migration;
- no-secret;
- provider-write-gate checks.

## UGP-14.5 Merge proposal

Only after all initiative criteria are complete:

```text
initiative-universal-growth-platform
→ final PR to main
→ exact-head CI
→ explicit user merge authorization
→ merge
→ post-merge main CI
→ deployment plan
```

Merge does not by itself authorize:

- production DDL;
- new provider OAuth consent;
- credential scope expansion;
- live bulk crawl;
- autonomous publication;
- outreach sending;
- provider/public-site mutation;
- deployment/publication.

Those remain separate runtime authorizations where applicable.

---

# Recommended implementation order

The critical path is:

```text
UGP-1
→ UGP-3
→ UGP-4
→ UGP-5
→ UGP-6
→ UGP-7
→ UGP-8
→ UGP-11
→ UGP-12
→ UGP-13
→ UGP-14
```

UX work UGP-2 can proceed alongside UGP-3/4 after contracts stabilize.

Authority UGP-9 can begin after UGP-1 + external-intelligence contracts and can proceed in parallel with UGP-7/8.

Outreach UGP-10 follows Authority qualification.

---

# Scope-control rules

To prevent this initiative from becoming another multi-year rewrite:

1. keep existing framework/runtime/database unless a work package proves a replacement necessary;
2. add adapters instead of rewriting working core systems;
3. one universal connector contract, not one architecture per CMS;
4. public-web analysis must work even without CMS connectivity;
5. ship read support before write support for new provider classes;
6. certify one provider per connector mechanism before adding breadth;
7. use external datasets for global SERP/backlink intelligence rather than building web-scale indexes;
8. use research libraries as patterns/modules, not as a second application architecture;
9. preserve progressive disclosure so UX simplicity does not remove auditability;
10. defer the Site Agent until MCP/OpenAPI/Git paths prove insufficient.

---

# Initiative completion definition

The isolated branch is considered implementation-complete only when a new user can:

```text
add a website
→ receive a universal site analysis
→ connect a supported CMS/search provider
→ discover prioritized SEO/content/authority opportunities
→ research and create a source-grounded article
→ preview and publish through a connector
→ verify the publication
→ receive internal-link recommendations
→ inspect backlink/link-gap opportunities
→ prepare controlled outreach
→ automate certified recurring read/content jobs
→ see results and lineage in Performance
```

without understanding internal P8/P9 task nomenclature, while an advanced operator can still inspect the exact evidence, policy and verification chain.

Only then should UGP-14 propose merging the initiative into canonical `main`.

# Universal Growth Platform — System Architecture

**Initiative branch:** `initiative-universal-growth-platform`  
**Architecture status:** target design for isolated implementation; no production activation authority.

---

## 1. North star

The Universal Growth Platform (UGP) extends SEO ENGINE into a connector-neutral search-growth operating system.

Target closed loop:

```text
Connect
  → Observe
  → Research
  → Understand
  → Detect opportunities
  → Prioritize
  → Create/Propose
  → Validate
  → Authorize
  → Publish/Execute
  → Verify
  → Measure
  → Learn
  → Refresh/Repeat
```

The strategic rule is:

> SEO ENGINE owns intelligence, evidence, governance, verification and learning. Commodity connectivity, crawling, job transport and UI primitives may be reused behind stable internal abstractions.

The initiative must preserve the existing mainline rule that capability does not imply authorization.

---

## 2. Architectural principles

### 2.1 Connector-neutral core

No new core intelligence should depend directly on Shopify, WordPress, Webflow or another CMS identity.

Provider-specific concepts terminate at the connector boundary.

### 2.2 Read universality before write universality

Any publicly reachable website should be analyzable through the public-web lane.

Write capability is enabled only when an authenticated connector can prove the exact supported action and verification strategy.

### 2.3 Capability negotiation

Every connection advertises its actual abilities. The engine never assumes that all websites support all operations.

### 2.4 Progressive trust

A provider operation progresses through:

```text
available capability
→ observed current state
→ evidence-backed proposal
→ authorization
→ fresh-state preflight
→ mutation/publish
→ independent verification
→ measurement
```

### 2.5 Product simplicity, engineering depth

Normal customers see business concepts such as opportunities, articles, links, automation and results.

Evidence fingerprints, policy artifacts, reservations, receipts and raw provider state remain accessible under Evidence / Advanced.

### 2.6 Reuse without architectural capture

External libraries/providers sit behind SEO ENGINE-owned interfaces. No third-party project becomes the authoritative policy engine or system of record merely because it provides useful transport.

---

## 3. Top-level system map

```text
                               ┌───────────────────────────┐
                               │   CUSTOMER EXPERIENCE     │
                               │ Home / Opportunities      │
                               │ Content / Site Audit      │
                               │ Authority / Automation    │
                               │ Performance / Settings    │
                               └─────────────┬─────────────┘
                                             │
                                  Product/API contracts
                                             │
                    ┌────────────────────────┴─────────────────────────┐
                    │             SEO ENGINE CORE                     │
                    │ Evidence / Opportunity / Policy / Impact        │
                    └───────┬──────────────┬──────────────┬───────────┘
                            │              │              │
                     Site Intelligence  Content Engine  Authority Engine
                            │              │              │
                            └──────────────┼──────────────┘
                                           │
                                 Universal Resource Model
                                           │
                                   Capability Registry
                                           │
                    ┌──────────────────────┼───────────────────────────┐
                    │                      │                           │
             Connector Plane        Job/Execution Plane        Measurement Plane
                    │                      │                           │
      ┌─────────────┼────────────┐         │                GSC / analytics /
      │             │            │         │                ranking / crawl /
  Public Web      Native        MCP     durable jobs          backlink outcomes
                  APIs                    + policy
      │             │            │         │
  Crawl/HTML      Shopify   WordPress     worker
                            Webflow
                            Contentful
                            Sanity
                            Directus
      │
   OpenAPI
      │
 custom CMS/API

      Git
      │
 GitHub / custom-coded sites

      Future Site Agent
      │
 systems without suitable API/MCP/Git path
```

---

## 4. Universal site and resource model

The existing Shopify-specific execution identity must not be copied into new product domains.

The connector-neutral model should represent an external site resource as:

```ts
type SiteResourceKind =
  | "homepage"
  | "page"
  | "product"
  | "collection"
  | "category"
  | "article"
  | "blog_post"
  | "landing_page"
  | "template"
  | "navigation"
  | "media"
  | "structured_data"
  | "source_file"
  | "other";

interface UniversalSiteResource {
  siteId: string;
  connectorId: string;
  provider: string;
  kind: SiteResourceKind;
  externalId: string | null;
  canonicalUrl: string | null;
  parentId: string | null;
  locale: string | null;
  stateFingerprint: string;
  observedAt: string;
  capabilities: ResourceCapability[];
}
```

Provider-specific identifiers remain opaque values owned by the connector.

Examples:

- Shopify product → Product GID in `externalId`.
- WordPress post → post ID.
- Webflow CMS item → item ID.
- Git-backed site → repository/path/ref tuple normalized by the Git connector.

---

## 5. Universal capability model

Connectors must advertise explicit capabilities rather than a broad "write access" boolean.

Initial capability vocabulary:

```text
read.resource
read.metadata
read.content
read.structured_data
read.internal_links

write.seo_title
write.meta_description
write.visible_content
write.structured_data
write.internal_links
write.media_alt
write.navigation

create.article
update.article
publish.article
unpublish.article

preview.change
verify.change
rollback.change

git.branch
git.commit
git.pull_request

outreach.draft
outreach.send
```

Each capability binds:

- resource kinds;
- required provider scopes;
- read/write classification;
- verification support;
- rollback support;
- maximum payload/operation constraints;
- connector version;
- credential/profile identity.

The policy engine consumes normalized capabilities. It does not infer them from provider names.

---

## 6. Connector contract

All website/CMS integrations implement one SEO ENGINE-owned interface.

Conceptual contract:

```ts
interface UniversalConnector {
  identifyConnection(): Promise<ConnectionIdentity>;
  listCapabilities(): Promise<ConnectorCapability[]>;
  discoverResources(input: DiscoveryInput): Promise<ResourcePage>;
  readResource(input: ResourceRead): Promise<ResourceSnapshot>;
  previewMutation?(input: MutationRequest): Promise<MutationPreview>;
  executeMutation?(input: AuthorizedMutation): Promise<MutationReceipt>;
  verifyMutation?(input: VerificationRequest): Promise<VerificationEvidence>;
  rollbackMutation?(input: RollbackRequest): Promise<RollbackReceipt>;
}
```

No connector may accept an ungoverned free-form "do anything" operation through this interface.

---

## 7. Connector lanes

### 7.1 Public Web Connector

Purpose: analyze nearly any publicly reachable website with no CMS access.

Capabilities:

- sitemap/robots discovery;
- HTML fetch/render;
- canonical/indexability analysis;
- metadata;
- structured data;
- content;
- internal links;
- images;
- performance signals;
- framework/CMS hints.

Write capability: none.

This lane reuses the existing SEO ENGINE crawl-controller, inventory, checkpoint, evidence and SSRF protections.

Crawlee may be evaluated as a browser/request execution backend where JavaScript rendering is required. It must not replace SEO ENGINE completion accounting or security controls.

Lighthouse may provide normalized performance/accessibility/best-practice evidence.

### 7.2 Native API Connectors

Purpose: use first-party provider APIs where direct high-assurance integration is strategically valuable.

Initial native connector:

- Shopify.

Shopify remains native until an alternative proves equal or better safety, verification and rollback semantics.

Future providers may also receive native adapters when needed.

### 7.3 MCP Connector

One generic MCP client maps approved MCP tools/resources into SEO ENGINE capabilities.

Candidate providers include:

- WordPress;
- Webflow;
- Contentful;
- Sanity;
- Directus;
- future CMSs with maintained MCP servers.

Rules:

- tool discovery does not equal action authorization;
- arbitrary MCP tools are not automatically exposed;
- every tool is mapped to a bounded SEO ENGINE capability;
- provider write operations still require normal policy/preflight/verification;
- public/untrusted MCP endpoints require explicit allowlisting and security review.

### 7.4 OpenAPI Connector

Purpose: support enterprise/custom CMSs with a machine-readable API specification.

Flow:

```text
OpenAPI document
→ validation
→ operation classification
→ generated typed client
→ administrator capability mapping
→ connector certification
```

Candidate code generation: Hey API / openapi-ts behind an internal adapter.

The system must never infer a destructive write permission solely because an OpenAPI operation exists.

### 7.5 Git Connector

Purpose: safely optimize source-controlled custom websites.

Initial GitHub path:

```text
repository connection
→ framework detection
→ source/resource mapping
→ deterministic patch
→ branch
→ tests/CI
→ pull request
→ merge under policy/human control
→ deploy by existing customer pipeline
→ live verification
```

Candidate building blocks:

- GitHub/Octokit;
- ast-grep for structural search/rewrites.

The first Git connector should prefer PR-based changes rather than direct default-branch writes.

### 7.6 Future Site Agent

Use only when a site has no suitable public API, MCP path, OpenAPI surface or source repository integration.

The Site Agent must expose a narrow signed capability API, not arbitrary remote code execution.

---

## 8. Connection and credential architecture

SEO ENGINE owns the `ConnectionBroker` abstraction.

```ts
interface ConnectionBroker {
  beginConnection(...): Promise<ConnectionSession>;
  getConnection(...): Promise<ConnectionHandle>;
  getCredentialLease(...): Promise<CredentialLease>;
  refreshIfRequired(...): Promise<CredentialLease>;
  revokeConnection(...): Promise<RevocationResult>;
}
```

Nango may be prototyped behind this interface for OAuth/token lifecycle and multi-provider connection UX.

It must not become an unreplaceable domain dependency.

Current provider-specific credential security requirements remain in force.

---

## 9. Content Growth Engine

The Content Engine is evidence-driven. It is not a one-prompt article generator.

### 9.1 Content opportunity discovery

Inputs:

- keyword/search-volume data;
- current rankings;
- GSC query/page evidence;
- SERP composition;
- competitor coverage;
- business/catalog entities;
- seasonality/trends;
- existing content inventory;
- content performance/decay.

Every candidate is classified as one of:

- create new content;
- refresh existing content;
- consolidate/canonicalize;
- expand existing page;
- build supporting content;
- no content action.

The engine must check for cannibalization before creating a new article.

### 9.2 Topic and cluster intelligence

A topic model groups related search demand into:

- pillar/topic;
- subtopics;
- intent;
- funnel/business relevance;
- existing coverage;
- content gaps;
- internal-link relationships.

The model must distinguish SERP similarity from purely semantic similarity.

### 9.3 Research pipeline

```text
Content opportunity
→ research questions
→ live source discovery
→ source acquisition
→ evidence extraction
→ source quality classification
→ claim ledger
→ brief
→ outline
```

STORM and GPT Researcher are reference architectures for multi-source research and cited synthesis.

SEO ENGINE should own the normalized research/evidence contract.

### 9.4 Article artifact pipeline

```text
brief
→ outline
→ section drafts
→ source-grounded claims
→ fact/citation verification
→ originality/value pass
→ brand voice pass
→ SEO optimization
→ AEO/GEO optimization
→ internal-link plan
→ media/schema plan
→ metadata
→ quality gate
→ publication proposal
```

Article state must be resumable and fingerprinted between material stages.

### 9.5 Content quality gates

Initial quality dimensions:

- source coverage;
- claim support;
- intent alignment;
- content completeness;
- original/additive value;
- business relevance;
- brand voice;
- readability;
- internal-link quality;
- metadata;
- duplication/cannibalization risk;
- prohibited or weak-source conditions.

No overall score may silently override a hard blocking rule.

### 9.6 Publishing

Publishing uses the same Universal Connector capability layer.

Examples:

- WordPress `publish.article`;
- Webflow CMS create/publish;
- Shopify blog post;
- Git PR containing markdown/MDX/source content.

The Content Engine must never contain provider-specific publication code.

### 9.7 Content refresh loop

```text
published content
→ GSC/ranking/traffic observations
→ decay/change detection
→ current-SERP re-research
→ refresh opportunity
→ revised article proposal
→ governed publish
→ verification
→ measurement
```

---

## 10. Authority Growth Engine

The Authority Engine turns backlink data into explainable opportunities.

### 10.1 Data boundary

SEO ENGINE should not build a global web-scale backlink index.

Use reviewed external backlink providers and normalize their observations into SEO ENGINE evidence.

DataForSEO is an initial candidate because the broader project already models it as an external-intelligence provider.

### 10.2 Authority evidence

Normalized evidence includes:

- backlink;
- referring domain;
- anchor;
- target URL;
- first/last seen;
- new/lost status;
- competitor relationship;
- authority/quality provider metrics;
- link attributes;
- source relevance;
- source freshness.

### 10.3 Opportunity classes

Initial Authority opportunities:

- competitor link gap;
- domain intersection;
- broken-link replacement;
- unlinked brand mention;
- lost-link recovery;
- resource-page prospect;
- supplier/manufacturer/partner citation;
- editorial/digital PR prospect;
- content promotion prospect.

### 10.4 Prospect qualification

Prospects are scored transparently from evidence such as:

- topical relevance;
- source quality;
- competitor precedent;
- existing relationship;
- contactability;
- destination-content fit;
- spam/risk signals.

A high provider "authority" metric alone must never imply outreach suitability.

### 10.5 Outreach

Initial scope:

```text
opportunity
→ prospect
→ contact evidence
→ personalized outreach draft
→ human review
→ send
→ response/status tracking
```

Future bounded automation may support sending under explicit rate, suppression, duplication and policy controls.

### 10.6 Search-policy guardrail

The product must not implement automated reciprocal-link networks, paid ranking-link marketplaces or indiscriminate mass link creation.

Authority automation focuses on discovery, qualification, outreach, earned citations and monitoring.

---

## 11. Internal Linking Engine

Internal linking connects site intelligence and content growth.

Inputs:

- crawl graph;
- page/topic entities;
- rankings;
- page importance;
- new/updated content;
- destination relevance;
- existing anchors.

Outputs:

- source URL;
- destination URL;
- suggested anchor/context;
- reason/evidence;
- conflict/duplication checks;
- preview.

It supports both directions:

- new article → existing money/category/product pages;
- existing relevant pages → newly published article.

Execution remains connector-capability dependent.

---

## 12. Job and automation plane

The existing P9 semantics remain the authority for scheduling/control.

Candidate durable transport: `pg-boss`.

Architecture:

```text
SEO ENGINE schedule/policy
→ admission/reservation
→ durable job transport
→ claim
→ fresh preflight
→ execute
→ verify
→ measurement
```

pg-boss, if adopted, provides transport primitives only:

- persistence;
- retries/backoff;
- cron;
- concurrency;
- dead-letter mechanics.

It must not own authorization or policy decisions.

Pause/drain/kill semantics from current SEO ENGINE remain authoritative.

---

## 13. Customer Experience architecture

### 13.1 Primary navigation

Target product navigation:

```text
Home
Opportunities
Content
Site Audit
Authority
Automation
Performance
Settings
```

### 13.2 Progressive disclosure

Default view:

- business impact;
- problem;
- recommendation;
- risk;
- preview;
- action.

Evidence view:

- queries/rankings;
- crawl observations;
- SERP/competitor evidence;
- source citations;
- backlink evidence;
- before/after states.

Advanced view:

- fingerprints;
- connector identity;
- policy result;
- reservation;
- execution receipt;
- verification evidence;
- rollback data;
- raw lineage.

### 13.3 Website onboarding

```text
Add website
→ enter URL
→ detect site/platform
→ public read analysis
→ offer richer connection methods
→ connect search/analytics
→ select automation level
→ run first analysis
```

Supported customer-level modes:

- Monitor Only;
- Assisted;
- Autopilot for explicitly certified low-risk classes.

### 13.4 UX implementation strategy

Keep the existing React/Vite/Tailwind/Radix/TanStack/Recharts/Playwright/axe foundation.

Candidate incremental additions:

- shadcn/ui patterns/components;
- Driver.js for onboarding/contextual help.

No frontend-framework migration is planned.

---

## 14. Data and evidence integration

The initiative should extend, not fork, the existing evidence/opportunity lineage.

New source families may include:

- universal connector observations;
- content research sources;
- claim/citation evidence;
- topic clusters;
- article artifacts;
- backlink observations;
- authority prospects;
- outreach events.

Every durable evidence class must have:

- site scope;
- source/provider identity;
- source timestamp;
- ingestion timestamp;
- fingerprint;
- freshness semantics;
- replay/conflict semantics;
- provenance.

---

## 15. Security model

Permanent requirements:

- site scope is explicit and server-authoritative;
- connector credentials are isolated per site/connection;
- connector capabilities are exact and deny-by-default;
- remote MCP/OpenAPI endpoints are allowlisted and validated;
- public-web fetching inherits SSRF/DNS-rebinding controls;
- Git operations target an exact repository/ref and prefer PR workflows;
- generated content cannot itself grant publication authority;
- outreach generation cannot grant sending authority;
- job transport cannot create authorization;
- read-after-write/live verification is mandatory for certified mutation classes;
- uncertain side effects fail closed.

---

## 16. Reusable technology candidates

These are candidates, not automatically approved dependencies.

| Need | Candidate | Intended use |
|---|---|---|
| MCP connectivity | MCP TypeScript SDK | generic MCP client |
| OAuth/integration broker | Nango | behind `ConnectionBroker`; license/commercial review required |
| Durable Postgres jobs | pg-boss | transport under P9 policy |
| JS/browser crawl execution | Crawlee | executor under existing crawl controller |
| Performance audit | Lighthouse | normalized evidence source |
| OpenAPI client generation | Hey API/openapi-ts | custom API connector tooling |
| GitHub integration | Octokit | Git connector |
| Structural source edits | ast-grep | bounded code transformations |
| UI components | shadcn/ui | incremental UX acceleration |
| Onboarding | Driver.js | product tours/contextual help |
| Research patterns | STORM | architecture/reference |
| Deep research patterns | GPT Researcher | architecture/reference |
| Editorial pipeline ideas | ContentForge | architecture/reference, not core dependency |
| SERP/keyword/backlink data | DataForSEO | external intelligence candidate |

Every adoption requires a dedicated dependency/security/license review before production use.

---

## 17. Explicit non-goals for the initiative

The initiative does not aim to:

- build a web-scale search index;
- build a proprietary global backlink crawler initially;
- replace the current evidence/opportunity/policy/impact core;
- replace PostgreSQL/Drizzle;
- replace React/Vite;
- replace current Shopify execution before parity is proven;
- expose arbitrary remote tool execution to customers;
- create a spam backlink exchange;
- mass-publish low-value AI content;
- auto-send unlimited outreach;
- bypass human/policy authorization because an integration supports writes.

---

## 18. Mainline integration boundary

The initiative may consume concepts from current `main`, but the branch remains separately evolvable.

Before final merge:

1. universal contracts must coexist with current Shopify-specific production behavior;
2. existing Shopify execution must either adapt through the universal abstraction with exact regression parity or remain behind a compatibility adapter;
3. all new navigation must have production-bound state contracts;
4. no synthetic fixture may masquerade as live data;
5. current P8/P9/P10/P11 safety and certification guarantees must remain intact;
6. mainline changes that occur during initiative development must be reconciled intentionally;
7. final integration receives its own exact-head CI, migration review, security review, deployment plan and explicit merge authorization.

The merge is a program event, not a routine branch merge.

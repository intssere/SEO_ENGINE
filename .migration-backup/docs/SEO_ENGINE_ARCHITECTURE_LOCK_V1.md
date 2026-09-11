# SEO ENGINE — Architecture Lock v1.0

Status: **LOCK CANDIDATE**  
Branch: `task-0-architecture-lock-v1`  
Purpose: freeze the V1 system boundary before feature implementation.

## 1. Product Definition

SEO ENGINE is an AI-native SEO + AIO/GEO optimization operating system that closes the loop from evidence to measurable outcome:

**Connect → Understand → Find → Decide → Act → Verify → Measure → Learn**

It is not intended to be another passive SEO scorecard. Its differentiator is evidence-grounded prioritization, controlled execution, verification, experimentation, search-policy adaptation, and learning.

## 2. V1 Goals

V1 must be able to:

1. Connect a Shopify site.
2. Inventory and analyze site URLs.
3. Ingest Google Search Console and GA4 evidence.
4. Consume external SEO intelligence through provider adapters.
5. Normalize evidence into one internal model.
6. Detect technical, ranking, CTR, decay, cannibalization, internal-link, content/entity, and GEO opportunities.
7. Prioritize opportunities by likely impact, confidence, effort, and risk.
8. Generate executable action plans.
9. Classify every action as AUTO, APPROVAL, or BLOCKED.
10. Deploy approved low-risk Shopify SEO changes.
11. Verify deployed state independently.
12. Roll back supported changes.
13. Track experiments and outcomes.
14. Monitor official search-engine policy/documentation changes.
15. Learn from observed outcomes without treating correlation as guaranteed causation.

## 3. Explicit V1 Non-Goals

Do not build in V1:

- custom backlink index
- custom global keyword database
- custom SERP index
- custom foundation model
- AutoGEO model training
- Kubernetes
- Kafka
- separate vector database
- dozens of microservices
- autonomous backlink creation
- mass low-value programmatic content generation
- every CMS connector
- unrestricted autonomous website writes

## 4. Architecture Decision

Use a **thin hybrid architecture**.

### External foundations

- OpenSEO: SEO research/data/tooling integration; consume loosely via MCP/API/adapters rather than deep fork.
- Google Search Console API: first-party search performance evidence.
- GA4 Data API: first-party analytics evidence.
- OpenAI API: reasoning, classification, synthesis, generation, and experiment analysis.
- DataForSEO or equivalent: optional external SERP/keyword/domain/backlink intelligence behind an adapter.
- Official Google/Bing documentation/status feeds: search-policy intelligence.

### Internal proprietary core

- Evidence Normalizer
- Opportunity Engine
- Ranking Accelerator
- Search Intelligence Engine
- GEO Adaptation Engine
- Action Planner
- Safety Engine
- Deployment Connectors
- Verification + Rollback Engine
- Experiment Engine
- Learning Engine

## 5. Runtime and Infrastructure

Initial stack:

- TypeScript
- web/API application
- worker process
- PostgreSQL
- lightweight job table or equivalent worker queue initially
- object storage only when needed

Do not add Redis/BullMQ, pgvector, or additional services until workload evidence justifies them.

## 6. Repository Shape

Target monorepo structure:

```text
apps/
  web/
  worker/

packages/
  shared/
  db/
  orchestrator/
  evidence/
  opportunity-engine/
  ranking-engine/
  geo-engine/
  policy-engine/
  action-engine/
  safety-engine/
  verification/
  experiments/
  connectors/
```

This structure may evolve only through an explicit architecture amendment.

## 7. Core Data Model

The internal database owns business-critical state. Minimum entity families:

```text
organizations
sites
connections

pages
page_snapshots
crawl_runs

queries
search_metrics
rank_snapshots

evidence
findings
opportunities

action_plans
actions
approvals

deployments
rollbacks
verifications

experiments
experiment_cohorts
outcomes

policy_sources
policy_versions
policy_changes
rules

ai_queries
ai_responses
ai_citations

learning_signals
jobs
```

External tool schemas must not become our canonical domain model.

## 8. Evidence Model

Every material recommendation must be traceable to evidence.

Minimum evidence properties:

- source
- source type
- site
- page/query/entity target
- observed value
- observation timestamp
- confidence
- provenance/reference
- freshness
- interpretation status

The system must distinguish observed facts from model-generated hypotheses.

## 9. Ranking Accelerator

V1 ranking intelligence should prioritize:

1. striking-distance queries
2. high-impression/low-CTR pages
3. ranking decay
4. cannibalization
5. internal-authority deficits
6. content/entity gaps
7. technical blockers
8. competitor/SERP deltas when evidence is available

Priority must be evidence-driven rather than based on opaque SEO scores.

Conceptual score:

```text
Opportunity ≈
Impressions × RankingProximity × CommercialValue × CTRDeficit ×
ConversionValue × Confidence ÷ EffortAndRisk
```

The exact formula is not locked and must be calibrated experimentally.

## 10. GEO / AIO

V1 GEO must measure before it optimizes.

Store:

- provider
- model family/version when known
- query/prompt
- locale/location where applicable
- timestamp
- response
- citations
- brand mentions
- competitor mentions
- sampling method

Optimization strategies may incorporate research-derived techniques such as AutoGEO, but no research hypothesis becomes a production rule without evidence.

## 11. Search Intelligence Engine

Monitor official search-system sources and version their changes.

Initial flow:

```text
Official source
→ Snapshot
→ Diff
→ Classification
→ Impact mapping
→ Proposed rule change
→ Test
→ Approval/release
```

V1 sources should include Google Search documentation/update feeds and relevant Bing sources.

A search-engine announcement must not directly trigger mass site changes.

## 12. Policy-as-Code

Search and safety rules must be versioned, sourced, and testable.

Each rule should include:

- stable rule ID
- source
- effective date/version
- scope
- condition
- action/recommendation
- severity
- confidence
- test cases

## 13. Action Safety Model

Every public-site mutation must receive one disposition:

### AUTO
Low-risk, reversible, well-understood action with strong evidence and implemented rollback/verification.

### APPROVAL
Material content, structural, URL, schema, template, or business-impacting change requiring human review.

### BLOCKED
Action conflicts with policy, lacks evidence, exceeds permissions, cannot be safely verified/rolled back, or is otherwise outside allowed autonomy.

Before the Safety Engine is implemented and certified, **all public-site writes are disabled**.

## 14. Deployment

Shopify is the first supported write connector.

Deployment requirements:

- least-privilege OAuth/scopes
- tenant isolation
- explicit target resource
- before-state snapshot
- planned after-state
- idempotency
- audit log
- verification
- rollback where technically supported

GitHub-based deployment may be added for code/theme changes through branch/PR workflows.

## 15. Verification

Do not treat an API success response as proof that an SEO change is live.

Verification should independently fetch/render the target and compare expected vs actual state.

Initial verifier should support:

- status
- title
- meta description
- canonical
- robots directives
- headings
- links
- structured data
- content hash
- relevant image/alt state

Playwright is used only where browser rendering is required; simple HTTP parsing should be preferred when sufficient.

## 16. Experimentation

The Experiment Engine must support:

- baseline window
- treatment set
- matched/control cohort where practical
- change timestamp
- outcome metrics
- confounder notes
- result confidence

During major confirmed search updates, high-risk autonomous experiments may be paused to preserve interpretability.

## 17. Learning

Learning signals may influence future prioritization, but must preserve provenance and uncertainty.

The system must not convert one observed improvement into a universal SEO rule.

## 18. OpenSEO Boundary

OpenSEO is an integration/foundation for research and external intelligence, not the canonical autonomous backend.

Rules:

- do not deeply fork unless a later ADR explicitly approves it
- do not make OpenSEO's DB schema canonical
- do not hard-couple provider credentials to one vendor
- wrap external capabilities behind internal interfaces
- preserve ability to swap providers

## 19. Security Requirements

Required from the beginning:

- tenant isolation
- encrypted secrets at rest
- least privilege
- separate read/write permissions
- rate limits
- spend limits for paid providers
- immutable or append-oriented action audit trail
- CSRF/session protection appropriate to chosen auth stack
- webhook signature validation
- SSRF protections for crawl/fetch surfaces
- allow/deny controls for deployment targets
- no secret values in logs

## 20. Pilot

The first production pilot will be the existing Diamond Shelf Shopify store.

Before optimization, capture a baseline including:

- indexed URL count
- organic impressions
- organic clicks
- average position
- CTR
- ranking query counts by position bands
- crawl/indexation issues
- site health findings
- internal-link graph baseline
- AI visibility baseline where measurable

The pilot is successful only if the system can demonstrate a complete evidence-to-action-to-verification-to-outcome loop on real pages.

## 21. Development Sequence

```text
Task #0  Architecture Lock + baseline
Task #1  Repository/application foundation
Task #2  PostgreSQL + core data model
Task #3  Site onboarding + Shopify read connection
Task #4  Crawl/page inventory
Task #5  GSC + GA4 ingestion
Task #6  OpenSEO/provider adapter
Task #7  Evidence Normalizer
Task #8  Technical SEO engine
Task #9  Ranking Accelerator
Task #10 Opportunity Engine
Task #11 Internal-link intelligence
Task #12 GEO/AI visibility
Task #13 Search Intelligence
Task #14 Action Planner + Safety Engine
Task #15 Shopify write connector
Task #16 Verification + rollback
Task #17 Experiment Engine
Task #18 Learning Engine
Task #19 Production dashboard
Task #20 Pilot certification
```

Tasks #1–#13 are read-only toward the customer's public website unless an explicit architecture amendment changes that rule.

## 22. Change Control

After this document is accepted and merged, material changes to the locked architecture require an Architecture Decision Record under `docs/adr/` explaining:

- problem
- evidence
- alternatives considered
- decision
- consequences
- migration impact

## 23. Task #0 Acceptance Criteria

Task #0 is complete when:

- repository baseline exists on `main`
- this architecture lock exists on a dedicated branch
- no product implementation code has been introduced
- autonomy boundaries are explicit
- external vs proprietary boundaries are explicit
- V1 non-goals are explicit
- development sequence is explicit
- architecture lock is reviewed and merged to `main`


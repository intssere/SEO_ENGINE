# UGP-7.3 — Brief and Outline

## Status

IMPLEMENTATION CANDIDATE — PURE / DETERMINISTIC / EVIDENCE-GROUNDED / NON-AUTHORIZING

## Purpose

UGP-7.3 converts a certified UGP-7.1 research plan and matching UGP-7.2 source/evidence ledger into a deterministic content brief and outline.

The output includes:

- content goal;
- audience;
- search intent;
- recommended content type;
- research questions;
- evidence-linked claim intents;
- product/business/service/entity references;
- internal-link targets;
- ordered section structure;
- unresolved evidence by section and for the complete brief.

UGP-7.3 does not write article prose.

## Version

`ugp-7-3-content-brief-outline-v1`

## Inputs

The builder requires:

1. one integrity-checked UGP-7.1 `ResearchPlan`;
2. one integrity-checked UGP-7.2 `SourceEvidenceLedger`;
3. optional evidence-backed entity inputs;
4. optional evidence-backed internal-link targets.

The 7.1 and 7.2 artifacts must have exact matching plan, opportunity, topic, and upstream provenance lineage.

Any mismatch fails closed.

## Content goal

The content goal is deterministically derived from the UGP-6.4 action carried by the research plan.

### Create candidate

The goal is to specify new coverage while avoiding duplication of existing supplied site evidence.

### Refresh candidate

The goal is to specify a refresh while preserving supported existing material.

### Consolidate candidate

The goal is to specify consolidation while preserving unique supported material.

The goal is planning text, not generated article copy.

## Audience

Audience is deterministically derived from search intent:

- informational → users seeking accurate understanding;
- commercial → users comparing options or tradeoffs;
- transactional → users preparing to act;
- navigational → users seeking a specific entity or destination;
- mixed/unknown → intent requires explicit clarification before drafting.

UGP-7.3 does not infer demographic, sensitive, or behavioral audience attributes.

## Questions

The brief preserves the exact UGP-7.1 research questions.

Questions are not rewritten as answers.

This prevents missing evidence from being silently converted into article assertions.

## Claim intents

UGP-7.3 does not generate new factual claims.

It projects only claim keys already attached to UGP-7.2 evidence records.

For each claim key the brief records:

- claim key;
- relevance;
- supporting evidence IDs;
- supporting source IDs;
- `verificationState = unverified_evidence_linked`;
- deterministic claim-intent fingerprint.

If the same claim key has inconsistent relevance labels across evidence, the brief conservatively uses:

`not_assessed`

The contract permanently declares:

`claimsRemainUnverified = true`

Evidence presence therefore does not mean a claim is verified, approved, or safe to publish.

## Entities

The roadmap requires product/business entities.

Because UGP-7.2 does not itself create a canonical entity model, UGP-7.3 accepts optional explicit entity inputs.

Each entity requires:

- entity key;
- display name;
- kind;
- one or more supporting UGP-7.2 evidence IDs.

Supported kinds:

- product;
- business;
- service;
- organization;
- other.

An entity referencing unknown evidence fails closed.

This prevents the brief from inventing products, businesses, services, or organizations not represented in captured evidence.

## Internal-link targets

UGP-7.3 accepts optional internal-link targets.

Every link target requires:

- absolute target URL;
- target label;
- one or more supporting UGP-7.2 evidence IDs.

URL fragments are removed before fingerprinting.

Unknown evidence references fail closed.

UGP-7.3 does not crawl the target URL, verify that the page is currently reachable, or insert links into public content.

## Outline

The deterministic v1 outline creates one planning section per UGP-7.1 research question.

Each section contains:

- section ID;
- order;
- heading intent;
- purpose code;
- exact question ID;
- matching evidence IDs;
- unresolved required evidence classes;
- section fingerprint.

`headingIntent` is the research question itself.

This deliberately avoids generating polished editorial headings before the evidence and later article-generation stages are complete.

## Unresolved evidence

UGP-7.3 preserves the complete UGP-7.2 unresolved evidence-class set.

It also computes unresolved evidence classes independently for each outline section.

A missing evidence class is not ignored merely because other evidence exists.

The brief adds limitations such as:

`unresolved_evidence_class:<class>`

and always includes:

- `claims_remain_unverified`;
- `article_prose_not_generated`.

## Determinism

All entities, links, claim intents, and evidence references are normalized into deterministic ordering.

The brief receives:

- deterministic section fingerprints;
- deterministic section IDs;
- deterministic entity fingerprints;
- deterministic internal-link-target fingerprints;
- deterministic claim-intent fingerprints;
- deterministic brief fingerprint;
- deterministic brief ID.

## Limits

The v1 policy caps:

- sections: 16;
- claim intents: 64;
- entities: 32;
- internal-link targets: 32.

Exceeding a bound fails closed.

## Safety semantics

Every brief permanently declares:

- `deterministic = true`;
- `evidenceGrounded = true`;
- `planningOnly = true`;
- `claimsRemainUnverified = true`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`;
- `generatesArticleProse = false`;
- `grantsAuthorization = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`.

UGP-7.3 cannot:

- browse;
- acquire sources;
- verify claims;
- create unsupported entities;
- create unsupported internal-link targets;
- write article paragraphs;
- persist a brief;
- edit public pages;
- publish;
- authorize provider/public-site writes;
- activate schedulers/workers/autonomous execution.

## Provenance

The brief binds:

- exact UGP-7.1 plan ID and fingerprint;
- exact UGP-7.2 ledger ID and fingerprint;
- exact opportunity ID;
- content-opportunity model fingerprint;
- content-opportunity fingerprint;
- topic-clustering fingerprint;
- coverage-assessment fingerprint;
- cannibalization-assessment fingerprint;
- business-relevance evidence fingerprint.

The chain is therefore:

`UGP-6 content intelligence`
→ `UGP-7.1 research plan`
→ `UGP-7.2 source/evidence ledger`
→ `UGP-7.3 brief and outline`.

## Tests

The synthetic test suite verifies:

- evidence-grounded brief construction;
- claim-intent projection without verification;
- evidence-backed entity admission;
- evidence-backed internal-link admission;
- URL fragment normalization;
- unknown entity/link evidence rejection;
- unresolved evidence preservation at section and brief level;
- lineage mismatch rejection;
- deterministic output;
- permanently closed/non-authorizing semantics;
- brief fingerprint tamper rejection.

## Explicit exclusions

UGP-7.3 does not:

- generate article prose;
- generate unsupported claims;
- verify claims;
- perform source acquisition;
- perform live browsing;
- call OpenAI;
- call DataForSEO;
- call Google Search Console;
- crawl a website;
- persist brief/outline records;
- publish;
- deploy;
- modify Railway;
- activate schedulers/workers/autonomous execution.

## Follow-on milestone

The next roadmap milestone is **UGP-7.4 — Article Generation**.

UGP-7.4 should consume a certified UGP-7.3 brief/outline and remain strictly bound to evidence-supported content and unresolved-evidence constraints.

Article generation must remain separate from publication authority.

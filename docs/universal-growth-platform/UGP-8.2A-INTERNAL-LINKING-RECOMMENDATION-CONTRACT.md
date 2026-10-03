# UGP-8.2A — Internal Linking Recommendation Contract

## Status
IMPLEMENTATION CANDIDATE — READ-ONLY / PLANNING-ONLY / SYNTHETIC CERTIFICATION

## Purpose
UGP-8.2A establishes the deterministic evidence contract for internal-link recommendations in both required directions:

- new content → relevant existing pages;
- existing pages → new content.

This is a recommendation layer only. It does not edit article bodies, CMS pages, Git files, navigation, or templates.

## Inputs
Each candidate binds:
- exact source and target `UniversalResourceLocator` identities;
- exact source and target state fingerprints;
- direction;
- anchor text;
- contextual placement description;
- topical relevance;
- contextual fit;
- business relevance;
- one or more supporting evidence fingerprints;
- explicit `alreadyLinked: false` observation.

## Deterministic score
The initial bounded score is:
- topical relevance: 50%;
- contextual fit: 30%;
- business relevance: 20%.

All three supplied signals must be finite values in [0,1]. The score ranks supplied evidence; it does not fabricate relevance evidence.

## Safety and integrity rules
Recommendations fail closed when:
- source or target identity is invalid;
- source/target belongs to another site;
- canonical URLs are absent;
- the recommendation is a self-link;
- direction does not bind the new-content resource to the correct side;
- the link is already observed;
- evidence is absent;
- the same directional source→target pair appears twice;
- per-direction limits are exceeded.

## Relationship to UGP-7.3
UGP-7.3 already permits evidence-backed internal-link targets in the content brief. UGP-8.2A does not replace that planning input.

UGP-8.2A adds the site-level directional recommendation contract needed after article generation/publication planning, including the reverse direction from existing pages back to the new content.

A later UGP-8.2 integration step can bind brief targets, crawl/content evidence, and observed page-link state into these candidate inputs.

## Output
The result contains:
- deterministic ranked recommendations;
- both direction classes;
- exact source/target/state lineage;
- normalized supporting evidence fingerprints;
- per-direction counts;
- tamper-evident recommendation and result fingerprints.

## Explicit exclusions
This increment performs no:
- crawl/network/provider request;
- persistence;
- CMS or Git mutation;
- preview/execute request;
- provider/public-site write;
- authorization grant;
- deployment;
- scheduler/worker/autonomous action.

A future mutation layer must separately construct connector-neutral previews and execution plans under the existing authorization boundary.

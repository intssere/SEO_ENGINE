# UGP-8.4A — Content decay / refresh detection contract

## Status
IMPLEMENTATION CANDIDATE — READ-ONLY OBSERVATIONAL CLASSIFICATION / NO LIVE ACQUISITION OR MUTATION

## Purpose
UGP-8.4A establishes the deterministic evidence contract for content-decay and refresh detection.

It classifies an existing page as:
- `refresh_candidate`;
- `watch`;
- `stable`;
- `defer_insufficient_evidence`.

It does not fetch GSC, SERPs, rankings, crawl state, or page content itself.

## Evidence classes
The contract can consume exact, already-acquired evidence from:
- GSC page performance;
- ranking observations;
- freshness evidence;
- SERP-change evidence;
- per-URL content-state change evidence.

Every supplied evidence class carries exact fingerprints.

Missing evidence is explicit and is never silently inferred.

## Important crawl-history limitation
The current first-party crawl-history comparison explicitly reports that per-URL outcome comparison is unavailable for:
- HTTP status;
- fetch result;
- canonical target;
- indexability;
- content fingerprint.

Therefore UGP-8.4A does **not** use aggregate crawl-history change as proof that an individual page's content changed.

A caller may supply `contentChange` only when a separate exact per-URL before/after state contract exists.

## Search deterioration
Search deterioration is observational and can be established from:
- material GSC click/impression decline;
- material GSC average-position worsening;
- material ranking worsening or loss.

Current deterministic policy:
- baseline GSC impressions must be at least 50;
- click decline threshold: 20%;
- impression decline threshold: 20%;
- average-position worsening threshold: 3;
- ranking worsening threshold: 3 positions.

## Corroboration and refresh classification
A `refresh_candidate` requires:
1. at least one material search deterioration class:
   - GSC performance; or
   - ranking;
2. at least two material evidence classes in total.

Examples:
- GSC decline + stale content;
- ranking decline + material SERP change;
- GSC decline + verified per-URL content change.

A lone deterioration signal yields `watch`, not an automatic refresh candidate.

## Freshness
Freshness is based only on an explicit last meaningful update date.

The initial stale threshold is 180 days.

Unknown freshness remains a limitation; it is not converted into staleness.

## Causal semantics
The contract is explicitly observational.

It does not claim that:
- stale content caused ranking decline;
- SERP change caused traffic decline;
- a content edit caused subsequent performance movement.

All expected measurement retains `causalAttribution: false`.

## Safety boundary
UGP-8.4A performs no:
- GSC/provider/network request;
- SERP/ranking acquisition;
- crawl;
- page fetch;
- database persistence;
- scheduler or job materialization;
- publication-plan creation;
- authorization creation;
- execution request;
- provider/public-site write;
- deployment/Railway/worker mutation.

## Next increment
A later UGP-8.4B can build exact adapters from existing SEO ENGINE evidence contracts—such as GSC and DataForSEO—to this provider-neutral decay assessment, while preserving the same fail-closed evidence requirements.

# UGP-8.2B — Recommendation Evidence Integration

## Status
IMPLEMENTATION CANDIDATE — CAPTURED-EVIDENCE / READ-ONLY / PLANNING-ONLY

## Purpose
UGP-8.2B binds existing UGP evidence into the UGP-8.2A bidirectional recommendation contract.

It integrates:
- UGP-7.3 evidence-backed brief internal-link targets;
- the exact UGP-7.2 source-evidence ledger behind those targets;
- observed page identity/state/link evidence;
- explicit relevance assessments;
- UGP-8.2A candidate and recommendation generation.

## Why this adapter is explicit
The current crawl-history comparison contract intentionally does not retain per-URL fetched content or link outcomes. UGP-8.2B therefore does not claim those details can be reconstructed from crawl history.

Instead, the adapter accepts captured page/link evidence directly. This is compatible with richer semantic page evidence, which can retain internal anchors and page-specific content evidence.

## Outbound direction
For new content → existing pages:
1. every UGP-7.3 brief target must match an observed page by canonical URL;
2. every brief evidence ID must resolve to its exact UGP-7.2 evidence fingerprint;
3. an explicit source→target relevance assessment is required;
4. page evidence and assessment fingerprints are added to the candidate lineage;
5. the candidate enters the UGP-8.2A contract.

The adapter fails closed if a brief target lacks observed page evidence or relevance assessment.

## Reverse direction
For existing pages → new content:
1. an observed existing page must have an explicit page→new-content relevance assessment;
2. exact page state and page evidence fingerprints are retained;
3. observed internal anchors are inspected for the new-content canonical URL;
4. if the link already exists, UGP-8.2A rejects the candidate;
5. otherwise the candidate enters the normal ranking contract.

## Relevance assessments
UGP-8.2B does not fabricate relevance scores from raw text.

Each assessment supplies:
- exact source and target identities;
- topical relevance;
- contextual fit;
- business relevance;
- proposed anchor text;
- placement context;
- supporting evidence fingerprints;
- a deterministic assessment fingerprint.

A later scoring/evidence-acquisition milestone may generate these assessments from certified semantic evidence.

## Safety boundary
UGP-8.2B:
- performs no crawl or network request;
- performs no live semantic extraction;
- persists nothing;
- edits no page or article;
- grants no authorization;
- constructs no execution request;
- performs no provider or public-site write.

## Output
The result includes:
- exact brief and source-ledger lineage;
- exact new-content state lineage;
- normalized UGP-8.2A candidate inputs;
- the resulting ranked UGP-8.2A recommendations;
- deterministic tamper-evident integration fingerprint.

## Next step
After this evidence adapter is certified, UGP-8.2 can proceed to a mutation-preview layer that converts accepted recommendations into connector-neutral proposed changes while still withholding execution authority.

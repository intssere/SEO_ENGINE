# Task #11 — Internal-Link Intelligence v1

## Purpose

Task #11 adds a deterministic, read-only internal-link intelligence layer. It consumes crawl/page inventory data, constructs a directed internal-link graph, estimates relative internal authority, identifies pages with insufficient internal-link support, and proposes candidate source→target links without changing the public website.

## Inputs

The engine accepts structurally compatible page inventory records containing:

- site and page identity
- normalized URL
- HTTP status/indexability
- title, H1, headings
- internal links, anchor text and `rel`
- optional target terms
- optional page priority/commercial value

It intentionally does not depend on crawler build artifacts or a provider-specific payload.

## Graph rules

- only successful/indexable pages participate in the V1 authority graph
- edges are same-origin and target another known eligible page
- repeated links from one source to the same target count as one page-level graph edge
- self-links are excluded
- `rel=nofollow` edges are excluded from authority flow by default
- external links never enter the graph

## Authority model

V1 uses a bounded deterministic PageRank-style calculation with configurable damping and iteration count. Results expose:

- unique inbound page links
- unique outbound page links
- authority share across the graph
- authority score normalized to the strongest page

This is an internal prioritization signal, not a representation of Google PageRank or a ranking guarantee.

## Opportunity types

### `orphan_page`
Eligible non-root pages with no inbound links from the known crawl graph.

### `underlinked_priority_page`
Non-root pages whose inbound count is at or below a configurable threshold and whose target priority is high enough to justify attention.

### `link_suggestion`
A deterministic candidate source→target pair when:

- the target is orphaned or priority-underlinked
- the source does not already link to the target
- source and target pass a lexical relevance threshold
- both belong to the same site

Candidate scoring combines semantic-token overlap, source authority, target priority and target link need. Recommended anchor text is derived conservatively from target H1/title/target terms.

## Safety boundary

Task #11 is analysis only.

It does **not**:

- edit theme/content/navigation
- create internal links
- alter anchors
- call Shopify write APIs
- execute actions
- bypass approval/safety layers

`PUBLIC_SITE_WRITES_ENABLED=false` remains the controlling project-wide default.

## Output

The engine returns graph nodes plus deterministic opportunities with stable dedupe keys. `toOpportunityInsert()` maps an internal-link opportunity into the existing opportunity persistence shape so later planning layers can consume it.

## Acceptance criteria

- graph edges are deterministic and deduplicated
- nofollow/external/self links cannot transfer V1 authority
- root URL is excluded from orphan classification
- orphan and priority-underlinked pages are detected
- candidate links never duplicate existing links
- candidate links require minimum topical relevance
- authority/opportunity ordering is deterministic
- existing regression suite remains green
- no public-site write path is introduced

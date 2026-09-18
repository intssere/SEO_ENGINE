# P5.7 — Category/Market Competitor Intelligence UI v1

Issue: #237

## Purpose

P5.7 replaces the existing `/search-intelligence` placeholder with a read-only/default-off competitor intelligence workspace over a deterministic synthetic P5.6 report fixture.

The UI is intentionally frontend-only in v1. It does not add an API endpoint, generated competitor API hook, provider transport, Production database read, target/source mutation, persistence path, scheduler/worker capability, execution path, or publication step.

## Existing route preserved

P5.7 keeps the existing:

- route: `/search-intelligence`
- navigation: Discover → Search Intelligence

No parallel competitor route is introduced.

## Canonical frontend files

- `artifacts/seo-engine/src/pages/search-intelligence.tsx`
- `artifacts/seo-engine/src/pages/search-intelligence.css`
- `artifacts/seo-engine/src/lib/competitor-intelligence-ui-model.ts`
- `artifacts/seo-engine/src/lib/competitor-intelligence-ui-model.test.ts`
- `artifacts/seo-engine/src/competitor-intelligence-ui-contract.test.mjs`

Browser coverage:
- `artifacts/seo-engine/e2e/critical-path.spec.mjs`

## Deterministic fixture

P5.7 ships a synthetic frontend fixture shaped from the P5.6 report vocabulary.

It includes:

- one explicit owned target;
- two reviewed competitors;
- four supplied SERP topics;
- three keyword/trend contexts;
- two Task #58-style page semantic-difference rows;
- three P5.5-style referring-domain rows;
- one explicit null backlink-authority case.

The fixture uses only reserved `.test` and `.example` identities.

The fixture is not a Production read and does not imply provider availability.

## Frontend view model

Version:

`p5.7-competitor-intelligence-ui-v1`

The pure model:

- validates fixture/report identity;
- validates reviewed-competitor coverage count;
- rejects duplicate competitor domains;
- validates visibility ratios;
- preserves provider authority comparability=false;
- preserves null authority as unavailable;
- deterministically sorts competitors, topics, pages, links and diagnostics;
- derives summary counts only from supplied fixture rows;
- emits `opportunityScore=null`;
- exposes the P5.7 safety capability.

No runtime API client is imported.

## Workspace sections

### Header

Displays:

- Market / Search Intelligence
- SYNTHETIC READ-ONLY
- DEFAULT-OFF

The header states that observed-topic visibility is limited to the supplied cohort and is not market share.

### Scope and lineage

Displays:

- market;
- category;
- owned target;
- reference time;
- abbreviated report fingerprint with the complete fingerprint retained in the title attribute.

### Summary

Displays:

- reviewed competitors;
- supplied SERP topics;
- observed topic gaps;
- link-gap referring domains;
- diagnostic count;
- unavailable opportunity score.

The summary does not rank competitors.

### Competitor visibility workbench

Searchable/sortable DataGrid columns include:

- competitor domain;
- visible/measured topics;
- top-10 count;
- best rank;
- competitor-only topics;
- page evidence;
- provider-native backlink authority;
- gap/shared referring-domain counts.

Authority cells state that the metric is provider-native and not cross-provider comparable.

### Topic gap workbench

Searchable/sortable exact-topic rows include:

- topic;
- SERP state;
- semantic state;
- observed gap flag;
- owned rank;
- reviewed competitor presence/rank;
- search volume;
- organic difficulty;
- trend direction and relative index.

The page does not consume or calculate a P5.3/P6 opportunity score.

### Page semantic-difference workbench

Rows include:

- competitor;
- page key/source URL;
- page type;
- structural difference count/dimensions;
- supplied SERP appearances;
- best rank;
- confidence.

Structural differences remain descriptive and do not establish that an owned page is missing.

### Link-gap workbench

Rows include:

- referring domain;
- P5.5 classification;
- competitor coverage;
- provider-native authority;
- freshness;
- owned presence.

No link-quality or outreach suitability inference is made.

### Interpretation boundary

The workspace explicitly states:

- observed-topic visibility != market share;
- page semantic difference != missing-page proof;
- topic gap is descriptive and does not produce action guidance;
- backlink gap != outreach suitability;
- trend relative indexes are request-frame bound and not cross-frame comparable;
- P6 owns cross-signal prioritization.

### Diagnostics

Missing evidence remains explicit.

The deterministic full fixture has no missing artifact diagnostics; the page states that complete synthetic fixture coverage does not imply live provider availability.

## Accessibility

P5.7 reuses the P4 DataGrid:

- each table has a labeled horizontal-scroll region;
- the region is keyboard-focusable;
- sortable columns expose `aria-sort`;
- search controls have labels;
- status meaning is expressed in text, not color alone;
- existing global route-focus behavior remains intact.

Browser coverage adds:

- Search Intelligence route load;
- synthetic/default-off status visibility;
- keyboard focus on the competitor grid region;
- deterministic competitor search;
- deterministic sort state;
- deterministic topic search;
- network boundary assertion;
- browser error assertion;
- serious/critical axe scan on `/search-intelligence`.

## Responsive behavior

P5.7 adds scoped responsive CSS:

- six-column summary → three columns at <=1180px → one column on mobile;
- five-column scope strip → three → two → one;
- hero stacks on tablet;
- semantics/diagnostics columns stack on tablet;
- panel headings stack on mobile;
- DataGrid retains its existing horizontal scrolling and mobile toolbar behavior.

## Static safety contract

The frontend contract test rejects:

- `fetch(`;
- XMLHttpRequest/WebSocket/EventSource;
- generated competitor API hooks;
- `useMutation`;
- `@workspace/api-client-react` imports in the P5.7 page/model;
- DB/env primitives;
- Task #64/#70 execution functions;
- timer/worker primitives;
- public-site/signal-execution gate wiring.

The model hard-codes false for:

- live provider reads;
- public-site reads/writes;
- runtime API binding;
- source admission;
- target mutation;
- Task #64 execution;
- Task #70 execution;
- persistence;
- DB reads/writes;
- scheduler/worker;
- opportunity scoring;
- publication.

## Publication state

P5.7 engineering does not publish the application.

Production remains the separately certified Task #73 release unless a later explicit publication authorization changes that state.

## Next phase relationship

After P5.7 certification, the default safe P5 milestone is P5.8 — source quality/cost/rate-limit telemetry.

P5.8 should remain network-free/default-off unless separately authorized.

P6 continues to own unified opportunity scoring, prioritization and actionability.

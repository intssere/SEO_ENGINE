# P7.6 AI/GEO Opportunity Integration Closeout

## Scope

Roadmap P7.6 implements a deterministic/default-off lineage bridge from exact certified P7.3/P7.4/P7.5 artifacts into P6.1-compatible AI opportunity records.

Issue: #279  
Implementation PR: #280  
Base SHA: `a5eb291d862b667041aed49a00e0001de79f967f`  
Base tree: `302997086f8077af73ee37d42b9cd357f8f1b7b9`  
Exact tested implementation head: `1bc0334c754d2e11c8444d4ac2efd6827b48a8ad`  
Implementation merge: `2a375966f943f67c5dc606c9e9257585b3e4824f`  
Implementation tree: `6300a641327c0064b880d99c6c61a1c877e0afc4`

P7.6 is additive deterministic integration engineering only. It adds no live provider request, route/OpenAPI mutation, persistence, P6 scoring/prioritization/execution, database activity, scheduler/worker, approval grant, site mutation, deployment or publication.

## Exact P7 lineage

Input contains:
- exact P7.5 scoring/history input;
- exact P7.5 scoring/history report;
- zero or more explicit integration requests.

P7.6 rebuilds P7.5 and requires complete canonical equality before projecting any opportunity.

P7.5 reconstruction transitively revalidates exact:
- P7.4 citation/domain/competitor comparison;
- P7.3 answer/brand/citation observations;
- P7.2 prompt/topic definitions.

A caller-tampered P7.5 report fails closed.

## Explicit integration request only

P7.6 never scans score magnitude, score threshold, arithmetic history direction, comparison counts, mention counts, citation counts or domain differences to invent an opportunity.

A P6 opportunity is emitted only when the caller supplies an explicit integration request.

An empty request list returns an empty deterministic integration report.

This keeps evidence measurement separate from opportunity declaration.

## Supported P6 AI kinds

P7.6 supports only the already-certified P6.1 AI kinds:
- `ai_visibility_gap`;
- `ai_citation_gap`.

Both project into P6 family `ai`.

The requested kind is explicit caller policy. P7.6 validates exact lineage but does not independently conclude that a “gap” exists.

## Visibility-gap requirements

An `ai_visibility_gap` request binds to:
- exact P7.5 snapshot;
- exact P7.5 score;
- exact P7.4 comparison group.

It must not supply:
- pair fingerprint;
- domain-summary fingerprints.

This prevents a general visibility request from silently acquiring citation-specific claims.

## Citation-gap requirements

An `ai_citation_gap` request additionally requires:
- exact P7.4 pair fingerprint;
- pair must include the exact brand of the selected P7.5 score;
- at least one exact P7.4 domain-summary fingerprint;
- every selected domain summary must belong to the selected pair's subject/competitor citation-domain co-occurrence evidence.

This validation is provenance-only.

It does not mean any selected domain:
- supports the brand;
- endorses the brand;
- refers to the brand;
- is authoritative;
- is trustworthy.

P7.4's co-occurrence-not-support semantics remain intact.

## P7.3 observation provenance

P7.6 collects exactly the P7.3 observation fingerprints already referenced by the selected P7.5 score components.

It does not widen the evidence set to unrelated observations.

P7.3 observation evidence keeps exact `observedAt`.

Derived P7.4/P7.5 artifact fingerprints use null `observedAt`; P7.6 does not pretend derived reports were independently observed.

## P6.1 projection

Each explicit request builds one exact P6.1 `UnifiedOpportunityRecord`.

Projection:
- family `ai`;
- caller-selected AI kind;
- exact caller-supplied opaque subject key;
- reference time = selected P7.5 snapshot collection reference time;
- P6 market/category scope only from explicit caller-supplied fingerprints;
- evidence kind `ai_visibility`.

Evidence may contain exact:
- P7.5 score fingerprint;
- P7.4 comparison fingerprint;
- P7.4 pair fingerprint for citation gap;
- selected P7.4 domain-summary fingerprints for citation gap;
- P7.3 observation fingerprints used by the P7.5 score components.

The existing certified P6.1 evidence limit of 64 remains authoritative.

P7.6 fails closed rather than dropping evidence when the complete set would exceed the bound.

## Scope separation

P7.2 `marketKey` and `languageKey` are not converted into P6 market/category fingerprints.

Null P6 scope remains null unless exact P6 fingerprints are explicitly supplied.

## Unscorable P7.5 source

Null remains distinct from zero.

When the selected P7.5 score is unscorable:
- source score100 remains null;
- exact P7.5 missing component codes remain in P7.6 lineage metadata;
- P6.1 `missingEvidence` receives only deterministic generic code `p7.5.unscorable_score`.

No unavailable P7.5 component is converted to zero.

## P7.5 score is not P6.2 score

P7.5 scoring and P6.2 opportunity scoring remain separate contracts.

P7.6 does not:
- call `scoreUnifiedOpportunity`;
- copy P7.5 score100 into P6.2;
- map P7.5 components to P6 impact/confidence/risk/effort/freshness;
- assign P6 priority;
- create P6 explanation/actionability;
- perform preview/lifecycle transitions.

A P7.6 opportunity must enter later P6 stages through their normal certified contracts if those stages are explicitly used later.

## Determinism

P7.6 deterministically emits:
- normalized request identity;
- exact source-lineage metadata;
- exact P6.1 opportunity record/fingerprint;
- integration fingerprint;
- report counts;
- report fingerprint.

Request input order does not change output identity.

Domain-summary references deduplicate and sort.

Duplicate normalized integration keys fail closed.

If two distinct integration keys project the same exact P6.1 opportunity fingerprint, P7.6 fails closed instead of duplicating it.

## CI certification

Exact PR head `1bc0334c754d2e11c8444d4ac2efd6827b48a8ad` passed CI #501 / run `35452690292` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P7.6;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #280 was merged only from that exact green head.

Post-merge main `2a375966f943f67c5dc606c9e9257585b3e4824f` passed CI #502 / run `35452920099` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `a5eb291d862b667041aed49a00e0001de79f967f` / `302997086f8077af73ee37d42b9cd357f8f1b7b9`;
- refreshed origin/main at the P7.6 implementation merge;
- ahead/behind `0/2`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `2a375966f943f67c5dc606c9e9257585b3e4824f`;
- tree `6300a641327c0064b880d99c6c61a1c877e0afc4`;
- origin/main identical;
- ahead/behind `0/0`;
- clean index/worktree;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation on that exact checkout passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Build output retained only existing non-fatal tooltip/sheet sourcemap messages and the existing minified chunk-size warning.

## Safety state

P7.6 performed no:
- live provider or AI/LLM request;
- credential use;
- source admission;
- opportunity or score persistence;
- Production DB read/write/DDL/DML;
- P6.2 scoring;
- P6.3 prioritization;
- recommendation generation;
- P6.5 approval/actionability shortcut;
- P6.6/P6.7 apply/lifecycle execution;
- Task #64/#70 execution;
- scheduler/worker/retry activation;
- approval grant;
- provider/public-site write;
- automatic transition;
- environment/secret/config mutation;
- deployment/publication.

## Next boundary

The next safe default milestone is **P7.7 — replace the current AI Visibility placeholder with a production workspace**.

P7.7 should remain deterministic/read-only and present certified P7.1–P7.6-shaped data without activating live collection or execution.

P7.7 must not:
- call live AI/provider APIs;
- use provider credentials;
- persist observations/scores/opportunities;
- change Production DB/schema;
- silently generate P7.6 opportunities;
- execute P6 actions;
- mutate public sites;
- activate schedulers/workers;
- publish without separate authorization.

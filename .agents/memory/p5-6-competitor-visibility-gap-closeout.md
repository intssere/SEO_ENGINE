# P5.6 — Competitor Visibility, Page-Gap + Topic-Gap Operational Pipeline Closeout

P5.6 is complete under issue #234 / PR #235.

## Purpose

P5.6 establishes a deterministic, descriptive operational competitor-intelligence report over already-normalized supplied artifacts from Task #58, Task #66, P5.2, P5.3, P5.4 and P5.5.

It does not collect, persist, schedule, score, recommend, register targets/sources, execute Task #64/#70, call providers/public sites, mutate databases/config/secrets, or publish.

## Canonical implementation

Files:
- `artifacts/api-server/src/lib/competitor-visibility-gap-pipeline.ts`
- `artifacts/api-server/src/lib/competitor-visibility-gap-pipeline.test.ts`
- `docs/p5-6-competitor-visibility-page-topic-gap-pipeline.md`

Version:
- `p5.6-competitor-visibility-gap-pipeline-v1`

## Operational result

The report now composes supplied normalized artifacts into:

- reviewed-competitor SERP visibility summaries;
- Task #58 page-level structural semantic differences;
- page-to-SERP appearance joins;
- exact-keyword topic rows with separate SERP and semantic states;
- P5.3 keyword metric context;
- P5.4 frame-bound trend context;
- P5.5 backlink authority/link-gap re-projection;
- explicit coverage, missing-data diagnostics and source lineage.

No competitor ranking or cross-signal opportunity score exists in P5.6. P6 retains prioritization/scoring ownership.

## Identity semantics

P5.6 defines a reporting-only target identity:
- canonical P5.5 hostname normalization;
- one leading `www.` removed;
- every other subdomain preserved.

This resolves the Task #58/P5.2 leading-www equivalence without altering P5.5 exact referring-domain identities.

Reporting page identity:
- HTTP(S) only;
- reporting-domain identity;
- scheme/query/fragment ignored;
- non-root trailing slash ignored;
- path case preserved.

Topics are exact normalized keywords only:
- NFKC;
- trim/collapse whitespace;
- lowercase;
- no stemming/synonyms/fuzzy matching/embeddings.

## Cohort and lineage

Input requires 1–10 explicit `manuallyReviewed=true` competitors.

Fail-closed validation covers:
- owned-domain collision;
- duplicate reviewed targets;
- unreviewed Task #58 page evidence;
- market/category mismatch;
- artifact observation after reference time;
- duplicate SERP/keyword topics;
- same topic appearing in multiple P5.4 request frames;
- P5.5 reference-time or target-cohort mismatch.

## Visibility semantics

Per reviewed competitor P5.6 reports:
- supplied SERP topic count;
- visible topic count;
- top-10/top-20 counts;
- best observed rank;
- observed-topic visibility ratio;
- competitor-only/shared visible-topic counts;
- supplied competitor-page counts and page SERP appearance;
- page semantic-difference count;
- P5.5 authority view when available;
- referring-domain gap/shared-coverage counts.

`observedTopicVisibilityRatio` is explicitly **not** market share, estimated traffic share or a forecast.

Rows are sorted by canonical domain only; P5.6 does not rank competitors.

## Page/topic semantics

Task #58 page differences use only:
- keyword themes;
- taxonomy labels;
- schema types;
- entity types;
- internal-link patterns.

A difference does not prove a missing owned page and does not recommend copying a competitor.

Topic SERP states:
- owned_only
- shared
- competitor_only
- neither
- unmeasured

Topic semantic states:
- owned_only
- shared
- competitor_only
- neither

`topicGapObserved=true` only when supplied exact evidence shows a competitor-only SERP or semantic state.

It remains descriptive, not a recommendation.

## P5.3/P5.4/P5.5 preservation

P5.3:
- search volume/difficulty/CPC/paid competition can be carried forward;
- organic difficulty retains `crossProviderComparable=false`;
- the P5.3 opportunity cohort score is not consumed.

P5.4:
- latest relative index, signed velocity, coverage and direction may be carried forward;
- `crossFrameComparable=false`;
- `absoluteSearchVolume=false`;
- `zeroMeansInsufficientData=true`;
- duplicate exact topics across different frames fail closed.

P5.5:
- provider/method/metric/scale authority provenance is preserved;
- cross-provider authority comparison remains false;
- gap candidates are re-projected without changing referring-domain identity or classification;
- no outreach suitability is inferred.

## Missing-data honesty

Absent artifact families produce explicit diagnostics rather than fabricated positive/negative evidence:
- `serp_visibility_unavailable`
- `keyword_metrics_unavailable`
- `trend_context_unavailable`
- `competitor_page_evidence_unavailable`
- `backlink_context_unavailable`
- `owned_keyword_themes_unavailable`

## Determinism

Report identity is stable under irrelevant input ordering for:
- reviewed competitor cohort;
- SERP projections;
- keyword projections;
- trend frames;
- competitor page evidence;
- owned semantic arrays.

Task #58 duplicate evidence fingerprints collapse deterministically.

## CI history

Initial implementation head:
- `c5dd8c9af0eba6a70c255e9a1a748d2088350437`
- CI #435 / run `35382916747`
- schema/task/workspace/browser tests succeeded;
- typecheck caught a test-helper narrowing issue;
- no merge occurred.

Corrective head:
- `42ab06eabe3b84d3e0acc44e5365f20d9ba692a1`
- CI #436 / run `35383164990`
- failed before tests because the test-only patch accidentally wrote a literal `\n` token into the source;
- no merge occurred.

Final corrective head:
- `ccc101cd95ab3a6bc99fa61b91fa0f00261accee`
- corrected only the test-helper newline;
- no production logic changed.

Exact tested implementation head:
- `ccc101cd95ab3a6bc99fa61b91fa0f00261accee`
- PR CI #437 / run `35383388840`: success
  - legacy schema: success
  - Task tests: success
  - P3.6 migration test: success
  - all workspace tests: success
  - Playwright Chromium/P4.10 browser suite: success
  - typecheck: success
  - build: success

Implementation merge:
- SHA `e0cf3758be1dff24f443a0a42fa19d2a4110b82b`
- tree `a2095f34919adebfa3839cf3449815fb0fb111af`
- issue #234 closed completed.

Post-merge:
- push CI #438 / run `35383645713`: success across the full matrix.

## Replit certification

Replit was Git-only fast-forward synchronized only after post-merge CI succeeded.

Certified implementation state:
- branch `main`
- HEAD `e0cf3758be1dff24f443a0a42fa19d2a4110b82b`
- tree `a2095f34919adebfa3839cf3449815fb0fb111af`
- origin/main exact same SHA/tree
- ahead/behind `0/0`
- index/worktree clean
- untracked 0

Non-browser checks:
- `pnpm -r --if-present test`: passed
- `pnpm typecheck`: passed
- `pnpm build`: passed
- `git diff --check`: passed

GitHub Actions Ubuntu/Chromium remains the canonical browser-certification environment.

## Publication state

P5.6 was not published.

Production remains the separately certified Task #73 application release.

P5.6 performed no:
- provider enrollment/purchase/credential use;
- provider/public-site request or mutation;
- Task #67 Production source admission;
- competitor target-registration mutation;
- Task #64 execution;
- Task #70 execution;
- observation/evidence persistence;
- Production DB read/write/DDL/DML;
- scheduler/batch/worker/retry activation;
- environment/secret/config mutation;
- deployment/publication.

## Next safe boundary

The default next safe milestone is **P5.7 — category/market competitor intelligence UI**.

Generic `continue` may advance only a read-only/default-off UI over deterministic P5.6 supplied/report fixtures. Live provider/public-site reads/writes, source admission, Task #64/#70 execution, persistence, database activity, scheduler/worker activation, secrets/config changes and publication remain separately unauthorized.

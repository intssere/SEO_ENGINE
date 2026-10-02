# UGP-7.5 — Article Quality Gate

## Status

IMPLEMENTATION CANDIDATE — FAIL-CLOSED / DETERMINISTIC / SEPARATE FROM GENERATION / NON-PUBLISHING

## Purpose

UGP-7.5 is the final article-quality gate for a certified UGP-7.4 draft.

It evaluates the hard blocker classes defined in the UGP roadmap:

- unsupported important factual claims;
- broken or mismatched citations;
- obvious duplication/cannibalization;
- unsafe/prohibited content;
- missing intent requirements;
- low-value scaled-content patterns.

The gate is intentionally separate from the UGP-7.4 generation pipeline and from model confidence.

## Version

`ugp-7-5-article-quality-gate-v1`

## Inputs

UGP-7.5 requires:

1. one integrity-checked UGP-7.4 `ArticleDraftPipelineResult`;
2. the exact integrity-checked UGP-7.3 `ContentBriefOutline`;
3. the exact integrity-checked UGP-7.2 `SourceEvidenceLedger`;
4. explicit external assessments for:
   - duplication/cannibalization;
   - unsafe/prohibited content;
   - low-value scaled-content pattern.

All lineage identifiers and fingerprints must match exactly.

Any mismatch fails closed.

## Why some checks are intrinsic and others are external

The frozen UGP-7.4/7.3/7.2 chain contains enough evidence to evaluate:

- draft completion;
- claim verification status;
- citation/evidence integrity;
- planned-section coverage;
- SEO/AEO/coherence/additive-value stage completion.

It does not, by itself, contain a complete independent detector for:

- unsafe/prohibited content;
- whole-site duplication/cannibalization;
- scaled-content pattern detection across a broader corpus.

Therefore those three categories are supplied as explicit fingerprinted assessments.

Missing required assessment means the gate cannot run successfully.

No missing assessment is treated as a pass.

## Check 1 — Important factual claim support

The gate blocks when:

- the UGP-7.4 draft status is not `draft_complete`; or
- any generated claim use is not `verified`.

A successful UGP-7.4 draft is therefore necessary but not sufficient for UGP-7.5 passage.

## Check 2 — Citation integrity

The gate independently re-checks that:

- every generated citation ID resolves to the certified UGP-7.2 ledger;
- every claim evidence ID resolves to the ledger;
- every claim evidence ID is also present in its section citation set.

Broken or mismatched citation bindings are hard blockers.

## Check 3 — Duplication/cannibalization

The gate requires a fingerprinted external assessment with one of:

- `pass`;
- `blocked`.

The assessment must include:

- summary;
- evidence references;
- deterministic assessment fingerprint.

The gate does not silently infer a pass from the absence of known collisions.

## Check 4 — Unsafe/prohibited content

The gate requires an explicit fingerprinted unsafe/prohibited-content assessment.

This stage is independent from article generation.

A generator completing successfully does not imply the content is safe.

## Check 5 — Intent requirements

The intrinsic intent check blocks when:

- no complete article body exists;
- any planned UGP-7.3 outline section is absent or not generated;
- required UGP-7.4 intent-relevant stages are not `pass` or `warning`.

The v1 intent-relevant stages are:

- coherence;
- additive value;
- SEO;
- AEO/GEO.

This check does not introduce a new model score.

It verifies that the certified draft covered the required brief structure and reached acceptable stage states.

## Check 6 — Low-value scaled-content pattern

The gate requires an explicit fingerprinted external assessment for low-value scaled-content risk.

This is intentionally separate from the single-article draft evaluator because scaled-content patterns may require corpus-level or campaign-level evidence.

Missing assessment fails closed.

## External assessment integrity

Every external assessment is fingerprinted from:

- check ID;
- status;
- summary;
- evidence references.

The gate recomputes the expected fingerprint and rejects tampered assessments.

Duplicate assessments for the same check ID are rejected.

## Result

UGP-7.5 emits:

- six normalized hard-blocking checks;
- overall `pass` or `blocked`;
- `approvalEligible`;
- blocking reasons;
- complete provenance;
- deterministic gate fingerprint;
- deterministic gate ID.

`approvalEligible = true` means only that the article passed the UGP-7.5 content-quality gate.

It does not authorize publication.

## Model confidence separation

Every result declares:

`modelConfidenceIsNotQualityGate = true`

The quality gate does not consume or trust an LLM confidence number as a substitute for hard blocker evaluation.

Generation success, evaluator score, model confidence, and publication authority are distinct concepts.

## Safety semantics

Every result permanently declares:

- `deterministic = true`;
- `failClosed = true`;
- `separateFromGeneration = true`;
- `modelConfidenceIsNotQualityGate = true`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`;
- `providerWrites = false`;
- `publicSiteWrites = false`.

UGP-7.5 cannot:

- call providers;
- browse;
- use credentials;
- persist gate state;
- mutate the CMS;
- publish;
- deploy;
- activate workers/schedulers;
- authorize a public-site write.

## Determinism

For frozen:

- draft;
- brief;
- source ledger;
- external assessments;

the normalized gate output is deterministic.

This includes:

- check ordering;
- evidence references;
- blocking reasons;
- check fingerprints;
- gate fingerprint;
- gate ID.

## Tests

The synthetic test suite verifies:

- all six checks pass on a valid frozen draft;
- unsafe/prohibited content hard blocking;
- required external-assessment fail-closed behavior;
- external-assessment fingerprint tamper rejection;
- incomplete UGP-7.4 draft blocking;
- deterministic output;
- final gate fingerprint tamper rejection.

## Explicit exclusions

UGP-7.5 does not:

- generate or rewrite article prose;
- acquire new research sources;
- perform a live plagiarism service call;
- perform a live safety service call;
- crawl the site;
- run a live cannibalization provider;
- persist results;
- publish;
- deploy;
- modify Railway;
- activate scheduler/worker/autonomous execution.

Live/corpus-wide detector adapters can be introduced later through separately authorized bounded integrations.

## Follow-on milestone

The next roadmap milestone is **UGP-7.6 — Article Workspace UI**.

UGP-7.6 should expose the frozen provenance chain:

research → sources → outline → draft → claims/citations → quality checks → publication state

without implying that a quality-gate pass itself constitutes publication authorization.

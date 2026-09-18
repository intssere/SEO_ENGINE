# P5.2 — DataForSEO SERP / Ranking Adapter Foundation v1

Roadmap: **P5.2**  
Issue: **#221**  
Provider review lineage: **P5.1 / issue #218 / PR #219**  
Provider contract review date: **2026-09-18**

## Purpose

P5.2 adds the first external SERP/ranking adapter contract while keeping the project entirely default-off and network-free.

The adapter is built for the DataForSEO Google Organic SERP API because P5.1 selected DataForSEO as the initial dual-purpose SERP + keyword **engineering target**. That selection is not provider enrollment, procurement approval, credential authorization, Task #67 source admission, or live-read authorization.

P5.2 performs only two operations:

1. build a deterministic, bounded provider request **contract** from already-valid P5.1 + Task #68 lineage; and
2. normalize a caller-supplied DataForSEO-shaped completed-result fixture into:
   - a bounded provider-neutral ranking projection; and
   - a strict Task #68-compatible adapter result.

No HTTP client, provider SDK, credential source, database client, scheduler, worker, polling loop, runtime route, environment gate, or publication path is introduced.

## Public provider documentation reviewed

- DataForSEO Google Organic task submission:
  - https://docs.dataforseo.com/v3/serp/google/organic/task_post/
- DataForSEO advanced SERP result:
  - https://docs.dataforseo.com/v3/serp-se-type-task-get-advanced/
- DataForSEO status/error codes:
  - https://docs.dataforseo.com/v3/appendix-errors/

Reviewed provider semantics used by the contract:

- task submission accepts keyword, explicit location, explicit language, device and depth;
- provider-supported depth is broader than this project allows;
- normal task priority is `1`;
- advanced organic results expose `rank_group`, `rank_absolute`, `page`, `domain` and `url`;
- `rank_group` is the within-type organic rank while `rank_absolute` is the position among all SERP elements;
- status `20000` represents completed success;
- status `20100` means a task was created, not that a completed ranking result is available.

P5.2 intentionally models the **standard async task contract** rather than a live endpoint. It does not implement submission, ready-task discovery, polling, or result retrieval.

## Exact control-plane lineage

P5.2 requires an existing Task #68 `SourceAdapterRequest`. It does not create one independently.

Before a provider request contract can be built, P5.2 verifies:

- the supplied P5.1 review identity equals the canonical review;
- the P5.1 review is still fresh at caller-supplied time;
- the P5.1 `dual_purpose_engineering` selection is still `dataforseo`;
- the Task #67 source descriptor has exact key `dataforseo-google-organic-serp`;
- source class is `external`;
- collection mode is `provider_api`;
- source supports `serp`;
- Task #68 request source ID/fingerprint exactly matches the source descriptor;
- Task #68 market/category fingerprints exactly match the supplied market/category;
- search engine is Google.

The expected source key is an adapter contract only. P5.2 does **not** add it to a persistent registry, configure it in production, or make it eligible for collection.

## Request contract

The deterministic request contract records inert endpoint metadata:

- submit path: `/v3/serp/google/organic/task_post`
- advanced-result template: `/v3/serp/google/organic/task_get/advanced/{task_id}`

The payload is deliberately narrower than DataForSEO's complete API:

- one normalized keyword, maximum 255 characters;
- one explicit positive provider location code;
- one normalized two/three-letter language code;
- language code must match the market language primary subtag;
- device: `desktop` or `mobile` only;
- explicit device must match a non-`all` market device;
- tablet market requests fail closed;
- depth: 10–100 only, in 10-result increments;
- priority: exactly `1`;
- deterministic tag generated from the adapter-request fingerprint.

The contract also records a conservative upper bound of `depth / 10` billed SERP-page units. This is planning metadata only and is not an invoice or a live cost measurement.

P5.2 forbids live mode, high priority, HTML mode, callbacks, pingbacks, postbacks, provider-side async AI extras, polling and transport execution.

## Supplied-result normalization

The normalizer accepts an in-memory caller-supplied DataForSEO-shaped result object.

Structural bounds:

- envelope status code must be bounded;
- completed success requires envelope status `20000`;
- exactly one provider task;
- completed task success requires task status `20000`;
- `20100` maps to a bounded `dataforseo_task_not_ready` Task #68 error result;
- exactly one provider result for completed success;
- at most 250 supplied SERP items;
- `items_count` must exactly match the supplied item-array length.

Provider identity is checked against the request contract:

- keyword;
- location code;
- language code;
- device.

Only organic items are projected. Each retained organic item contains exactly:

- group rank;
- absolute rank;
- page;
- normalized domain;
- normalized HTTP(S) URL.

Unknown provider fields are not copied. Titles, descriptions/snippets, XPath values, raw response messages and arbitrary provider fields are not retained by the P5.2 output.

## Rank semantics

P5.2 bounds `rank_group` against the requested organic depth.

It does **not** incorrectly bound `rank_absolute` to the requested depth because absolute rank includes other SERP elements such as ads/features.

For the configured tracked domain, subdomains count as matches.

The Task #68-compatible result contains bounded numeric metrics including:

- search-engine result count;
- provider item count;
- organic item count;
- checked depth;
- tracked organic match count;
- found flag;
- top-10 and top-20 match counts;
- best absolute rank, group rank and page when a match exists.

A completed SERP with no tracked-domain match remains a successful SERP observation with an explicit `tracked_domain_not_found` diagnostic and zero match metrics. It is not treated as a provider error.

A completed result with zero items maps to Task #68 `empty` semantics.

Provider/task operational failures map to Task #68 `error` semantics with sanitized bounded error codes and no raw provider message.

Malformed, oversized or conflicting result data throws/fails closed rather than inventing ranking evidence.

## Task #68 compatibility

P5.2 returns the exact Task #68 adapter-result field set:

- `requestFingerprint`
- `sourceId`
- `sourceFingerprint`
- `sourceClass`
- `marketFingerprint`
- `categoryFingerprint`
- `signalType`
- `observedAt`
- `status`
- `metrics`
- `diagnostics`
- `errorCode`
- `completeness`

Unit tests pass this result through the existing `normalizeAdapterResult` function, proving the P5.2 output composes with Task #68 without widening Task #68's accepted raw-result schema.

## Safety boundary

The P5.2 capability hard-codes false authorization for:

- provider enrollment/purchase;
- credential creation/use;
- configured live transport;
- network requests;
- live endpoint use;
- high-priority requests;
- callbacks/pingbacks/postbacks;
- polling;
- Task #67 source admission;
- Task #69 live authorization;
- Task #70 execution;
- observation/evidence persistence;
- database reads/writes/schema mutation;
- scheduler/batch/worker/retry execution;
- provider/public-site writes;
- publication;
- automatic transition.

P5.2 contains no `fetch`, Axios/Undici/Got client, environment-secret binding, DB/ORM client, timer loop, child process, Task #70 execution call, or source-registry admission call.

## Future live boundary

A future live DataForSEO path would require separate work and explicit authorization for, at minimum:

1. P5.1 re-review if stale or materially changed.
2. Provider account/procurement decision.
3. Credential storage/binding design and authorization.
4. Exact Task #67 source admission.
5. A bounded provider transport/runner implementation.
6. Cost/rate-limit/reliability telemetry.
7. Exact Task #69 job authorization.
8. Task #70 execution gate + durable replay controls.
9. Observation/evidence persistence authorization if persistence is desired.

None of those steps is authorized by P5.2.

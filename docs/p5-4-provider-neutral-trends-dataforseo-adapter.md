# P5.4 — Provider-Neutral Trend Semantics + DataForSEO Google Trends Adapter v1

Issue: #227  
Source review date: 2026-09-18

## Purpose

P5.4 adds a provider-neutral trend measurement contract and a deterministic, network-free adapter for DataForSEO Google Trends Explore **Standard** tasks.

This milestone is descriptive only. It does not activate a provider, create credentials, make network calls, admit a Task #67 source, execute Task #70, persist observations/evidence, mutate a database, start a scheduler/worker, write to a provider/public site, or publish the application.

## Source choice

Initial engineering source:
- DataForSEO Google Trends Explore
- Standard task method only

Reviewed public documentation:
- https://docs.dataforseo.com/v3/keywords_data-google_trends-overview/
- https://docs.dataforseo.com/v3/keywords-data-google-trends-explore-task_post/
- https://docs.dataforseo.com/v3/keywords-data-google-trends-explore-task_get/
- https://developers.google.com/search/apis/trends
- https://developers.google.com/search/blog/2025/07/trends-api

The DataForSEO Google Trends interface mirrors Explore-style relative popularity. The official Google Trends API alpha uses a different consistently-scaled model and remains a separate future integration boundary. P5.4 does not equate those scales.

## Provider-neutral semantics

P5.4 treats trend data as a **request-frame measurement**, not absolute demand.

The exact frame identity binds:
- provider key and method;
- source fingerprint;
- market fingerprint;
- category fingerprint;
- sorted comparison keyword set;
- provider location code;
- language code;
- property;
- provider category scope;
- explicit date range;
- scaling model.

For this adapter:
- scale: `relative_0_100_request_frame`;
- property: `web`;
- provider category code: `0` (all provider categories);
- `crossFrameComparable=false`;
- `absoluteSearchVolume=false`;
- `zeroMeansInsufficientData=true`;
- `descriptiveOnly=true`.

A change to terms, dates, location, language, property, category scope or method changes the frame fingerprint.

## Point semantics

Each normalized graph point contains only:
- `dateFrom`;
- `dateTo`;
- Unix `timestamp`;
- `missingData`;
- one value per keyword.

Rules:
- points are strictly chronological and non-overlapping;
- point dates must stay inside the request frame;
- value cardinality must equal keyword cardinality;
- non-missing values are integers 0..100;
- when `missingData=true`, values must be null;
- value `0` is retained as explicit insufficient-data evidence and is not converted to null or interpreted as literal zero searches.

Raw provider titles, check URLs, averages, status text and arbitrary response fields are discarded.

## Per-keyword descriptive summaries

For each keyword, P5.4 derives:
- usable point count;
- missing point count;
- zero/insufficient-data point count;
- latest relative index;
- mean relative index;
- peak relative index;
- early-window mean;
- recent-window mean;
- signed velocity;
- positive momentum;
- volatility;
- coverage ratio;
- direction.

Velocity requires at least four usable points.

The usable series is divided into equal early/recent windows using `floor(n/2)` points from each edge; an odd center point is not used for velocity.

`signedVelocity = (recentMean - earlyMean) / 100`

Range: `[-1, 1]`.

`positiveMomentum = max(signedVelocity, 0)`

Range: `[0, 1]`.

Direction threshold:
- rising: velocity >= 0.05;
- falling: velocity <= -0.05;
- flat: otherwise;
- unavailable: fewer than four usable points.

Volatility:
- mean absolute change between adjacent usable relative indices;
- divided by 100;
- range `[0,1]`.

These are descriptive transformations of frame-relative data. They are not forecasts and are not absolute market-demand estimates.

## DataForSEO request contract

Expected source key:
`dataforseo-google-trends-explore`

Task #68 requirements:
- source class `external`;
- collection mode `provider_api`;
- signal type `trend`;
- exact source/request/market/category lineage;
- Google market;
- all-device market.

Internal bounds:
- 1..5 unique sorted keywords;
- <=80 characters / <=10 words per keyword;
- explicit positive location code;
- market-matching language code;
- explicit `date_from` + `date_to`;
- 30..366 inclusive frame days;
- frame cannot end in the future;
- `type=web`;
- `category_code=0`;
- `item_types=[google_trends_graph]`.

Inert endpoint metadata:
- submit: `/v3/keywords_data/google_trends/explore/task_post`
- result: `/v3/keywords_data/google_trends/explore/task_get/{task_id}`

Callbacks, pingbacks, postbacks, related topics, related queries, map data, Live execution and polling are not part of P5.4.

## Supplied-result normalization

Only caller-supplied completed-result objects are accepted.

Completion rules:
- envelope status `20000`;
- one task;
- task status `20000`;
- task status `20100` maps to a bounded `dataforseo_task_not_ready` Task #68 error;
- one result;
- exact keyword/location/language lineage;
- exactly one `google_trends_graph` item for non-empty results;
- graph keywords must match request ordering;
- graph cardinality and point bounds must validate.

Provider/task failures map to sanitized Task #68 error codes. Raw provider error messages are not retained.

## Task #68 aggregate

The rich trend projection remains outside the Task #68 metric stream.

Task #68 receives bounded aggregate metrics:
- requested keyword count;
- graph point count;
- average coverage;
- rising/falling/flat counts;
- velocity-scored/unavailable keyword counts;
- zero/insufficient-data point count;
- average positive momentum when velocity exists;
- average signed velocity when velocity exists.

This avoids fabricating a per-keyword Task #68 stream identity.

Status mapping:
- no graph: `empty`;
- graph but no usable points: `empty`;
- usable graph with incomplete missing-data coverage: `partial`;
- complete usable graph: `success`;
- provider/task failure: `error`.

## Safety

P5.4 hard-codes false authorization for:
- provider enrollment/purchase;
- credential creation/use;
- provider SDK/network requests;
- Live endpoint execution;
- official Google Trends alpha enrollment;
- callbacks/pingbacks/postbacks;
- polling/retries;
- related topics/queries/map expansion;
- Task #67 source admission;
- Task #70 execution;
- observation/evidence persistence;
- database reads/writes/schema mutation;
- scheduler/batch/worker activation;
- provider/public-site writes;
- publication;
- automatic transition.

P5.4 contains no HTTP client, provider SDK, environment-secret binding, database client, scheduler/worker loop, callback implementation, source-registry admission call, or Task #70 execution call.

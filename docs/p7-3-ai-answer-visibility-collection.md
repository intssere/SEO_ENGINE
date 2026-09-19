# P7.3 — Deterministic AI Answer/Brand/Citation Collection Contract v1

## Purpose

P7.3 defines a provider-neutral, deterministic normalization contract for supplied AI answer, brand-mention and citation observations.

It is deliberately not a live collector.

P7.3 does not:
- call an AI provider;
- use provider credentials;
- select or rank providers;
- generate answers;
- parse answer text for brands;
- crawl citation URLs;
- persist observations;
- score AI visibility;
- compare competitors/domains;
- generate opportunities.

The caller supplies all collection results.

## Exact P7.2 lineage

P7.3 accepts:
- exact P7.2 prompt/topic model input;
- exact P7.2 prompt/topic model report;
- a collection reference time;
- explicit provider/model registry;
- explicit tracked-brand registry;
- supplied/synthetic observations.

Before observation normalization, P7.3 rebuilds P7.2 and requires complete canonical equality.

Every observation binds to:
- exact prompt key;
- exact prompt fingerprint.

Unknown prompts or mismatched prompt fingerprints fail closed.

Prompt topic keys/fingerprints are inherited from exact P7.2 rather than re-inferred.

## Provider/model registry

The caller defines providers and their models.

Provider:
- normalized unique `providerKey`;
- exact caller-supplied label;
- one or more models.

Model:
- normalized unique `modelKey` within the provider;
- exact caller-supplied label.

P7.3 derives deterministic provider/model fingerprints.

Provider/model identity is opaque.

P7.3 does not infer:
- quality;
- capability;
- policy;
- market share;
- freshness;
- relative value;
- recommendation.

Different providers are not declared metrically comparable by P7.3.

## Tracked-brand registry

The caller defines one or more tracked brands:
- normalized unique `brandKey`;
- exact caller-supplied label.

P7.3 derives deterministic brand fingerprints.

It does not discover aliases, infer entities or scan answer text for brand names.

## Observation identity

Each supplied observation has:
- normalized unique `observationKey`;
- provider key;
- model key;
- exact P7.2 prompt key/fingerprint;
- canonical observation timestamp;
- supplied evidence fingerprint;
- answer state;
- answer text;
- explicit supplied brand mentions;
- explicit supplied citations.

Observation keys are unique within the collection.

Input order does not affect report identity.

## Collection time

The caller supplies canonical `collectionReferenceTime`.

It must be at or after the exact P7.2 reference time.

Every observation timestamp must be at or before the collection reference time.

P7.3 uses no wall clock.

## Answer states

Allowed states:
- `answered`
- `refused`
- `unavailable`
- `error`

### answered

Requires non-empty exact answer text.

Answer text is preserved exactly after bounded control-character validation.

P7.3 does not:
- trim it;
- rewrite it;
- summarize it;
- evaluate correctness;
- evaluate quality;
- infer sentiment.

### refused / unavailable / error

These states require:
- `answerText = null`;
- no supplied brand-mention records;
- no supplied citation records.

They are descriptive supplied collection states only.

They do not diagnose provider policy or motive.

## Explicit brand-mention evidence

Each mention contains:
- known tracked brand key;
- exact caller-supplied matched text.

Matched text is preserved exactly.

P7.3 performs no text mining.

Repeated identical mention records collapse deterministically.

P7.3 derives:
- mention count;
- distinct explicitly mentioned brand keys.

A supplied mention does not imply:
- recommendation;
- positive sentiment;
- prominence;
- preference;
- ranking.

Absence of supplied mention evidence is not proof that the answer text contains no brand mention.

P7.3 v1 therefore records positive supplied mention evidence only and does not claim semantic absence.

## Explicit citation evidence

Each citation contains:
- caller-supplied absolute URL;
- optional exact caller-supplied title.

P7.3 accepts only HTTP(S) URLs.

URL userinfo/credentials are rejected.

Normalization uses the platform URL parser and:
- canonicalizes protocol/host/default port/path representation;
- removes URL fragments;
- preserves query semantics/order as represented by the URL parser;
- lower-cases/exposes the hostname as descriptive `domain`.

The normalized URL is the duplicate identity within one observation.

Repeated identical normalized URLs with identical title metadata collapse.

Conflicting titles for one normalized URL fail closed.

P7.3 does not fetch citation URLs.

## Citation semantics

Citation presence does not imply:
- endorsement;
- authority;
- trust;
- correctness;
- support;
- ownership;
- competitiveness.

Citation domain is descriptive URL provenance only.

P7.4 owns domain/citation/competitor comparison.

## Deterministic output

P7.3 emits:
- deterministic provider/model records and fingerprints;
- deterministic tracked-brand records and fingerprints;
- normalized observations;
- inherited exact prompt/topic lineage;
- exact answer state/text;
- explicit brand-mention records;
- canonical citation records/domains;
- per-observation counts;
- report counts and fingerprint.

Canonical observation ordering uses normalized observation key.

## Report counts

The report includes:
- provider count;
- model count;
- tracked-brand count;
- observation count;
- answered/refused/unavailable/error counts;
- explicit brand-mention count;
- count of observations carrying brand-mention evidence;
- citation count;
- distinct citation-domain count.

These counts are descriptive only.

They are not visibility scores.

## Critical semantic boundaries

P7.3 explicitly records:
- observed answer does not imply correctness;
- refusal/error/unavailable does not diagnose provider policy;
- provider/model identity is opaque;
- explicit mention does not imply recommendation, sentiment, prominence or preference;
- absent mention evidence does not prove brand absence;
- citation presence does not imply endorsement, authority, trust or support;
- citation domain is descriptive only;
- collected answer/citation evidence does not prove indexing;
- collected answer/citation evidence does not prove crawler accessibility;
- no cross-provider comparability claim;
- no domain/competitor comparison;
- no visibility score/history;
- no AI/GEO opportunity generation.

## Bounds

P7.3 v1 bounds:
- providers: 32;
- models per provider: 32;
- tracked brands: 128;
- observations: 512;
- mentions per observation: 64;
- citations per observation: 64;
- provider/model/brand labels: 256 characters;
- answer text: 32,768 characters;
- matched mention text: 1,024 characters;
- citation title: 1,024 characters;
- citation URL: 4,096 characters;
- normalized keys: 96 characters.

Bounds fail closed.

## Separation from later P7 milestones

P7.3 deliberately does not:
- compare citation domains or competitors — P7.4;
- score AI visibility/history — P7.5;
- generate AI/GEO opportunities — P7.6;
- build production AI Visibility workspace — P7.7.

## Runtime and safety boundary

P7.3 is pure deterministic engineering over supplied/synthetic fixtures only.

It adds no:
- route or OpenAPI change;
- live AI/provider request;
- provider credential use;
- provider selection;
- AI/LLM or embedding request;
- source admission;
- answer/mention/citation persistence;
- database read/write/DDL/DML;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

# P7.2 — Deterministic Prompt/Topic Set Model v1

## Purpose

P7.2 defines a deterministic, network-free model for explicitly supplied AI/GEO topics, prompts and prompt sets.

It provides structure only.

P7.2 does not:
- generate prompts;
- expand or rewrite prompt text;
- infer topics from text;
- infer demand or popularity;
- call an AI/provider;
- create embeddings;
- collect AI answers or citations;
- score visibility;
- generate opportunities;
- persist data.

## Model frame

The caller supplies:
- normalized opaque `siteKey`;
- canonical `referenceTime`;
- topics;
- prompts;
- prompt sets.

All model identity is deterministic from these supplied definitions.

## Topic definitions

Each topic contains:
- normalized unique `topicKey`;
- exact caller-supplied `label`;
- optional normalized `parentTopicKey`.

Only keys are normalized.

Labels are preserved exactly after bounded-text validation.

### Explicit hierarchy only

A parent relation exists only when the caller supplies `parentTopicKey`.

P7.2 never infers a topic relationship from:
- label similarity;
- prompt wording;
- keywords;
- embeddings;
- taxonomy assumptions;
- category proximity.

Every parent must exist in the same catalog.

A topic cannot parent itself.

The complete parent graph must be acyclic.

## Prompt definitions

Each prompt contains:
- normalized unique `promptKey`;
- exact caller-supplied prompt `text`;
- one or more explicit topic keys;
- optional caller-owned `intentCode`;
- optional caller-owned `languageKey`;
- optional caller-owned `marketKey`.

### Exact prompt text

Prompt text is preserved exactly.

P7.2 does not:
- trim it;
- case-fold it;
- normalize wording;
- correct grammar;
- paraphrase;
- expand it;
- make variants.

A whitespace-different prompt remains textually different when supplied under another key.

### Topic references

Every prompt topic key must identify an explicit topic in the same catalog.

Repeated topic references within one prompt are deduplicated and sorted canonically.

At least one topic is required.

### Opaque caller-owned codes

`intentCode`, `languageKey`, and `marketKey` are normalized opaque labels.

P7.2 does not assign hidden semantic meaning to them.

It does not infer intent, language or geography from prompt text.

## Prompt sets

Each prompt set contains:
- normalized unique `setKey`;
- exact caller-supplied `label`;
- one or more explicit prompt keys.

All prompt keys must identify prompts in the same catalog.

Repeated references are deduplicated and sorted canonically.

P7.2 derives one descriptive set-level topic coverage list as the union of the referenced prompts' explicit topic keys.

That derived union does not imply importance, completeness or visibility.

## Deterministic ordering and identity

Canonical output is ordered by:
- topic key;
- prompt key;
- set key.

Input ordering does not affect report identity.

P7.2 deterministically creates:
- topic fingerprints;
- prompt fingerprints;
- prompt-set fingerprints;
- count summaries;
- report fingerprint.

## Duplicate-key handling

Normalized topic, prompt and set keys must each be unique.

Duplicate normalized keys fail closed.

P7.2 does not silently merge two independently supplied definitions under one key.

## Required collections

P7.2 v1 requires:
- at least one topic;
- at least one prompt;
- at least one prompt set;
- at least one topic reference per prompt;
- at least one prompt reference per set.

This keeps v1 focused on a complete prompt/topic-set catalog rather than partial fragments.

## Critical semantic boundaries

### Membership is not demand

Prompt presence or set membership does not imply:
- search volume;
- AI query frequency;
- user demand;
- popularity;
- commercial value.

P7.2 has no demand source.

### Topic relationship is explicit only

A topic parent/child relationship means only that the caller supplied that relationship.

It does not prove semantic similarity or ontology correctness.

### Set membership is not priority

Membership in a prompt set does not imply:
- higher priority;
- execution order;
- business importance;
- recommendation.

Canonical sorting is serialization only.

### Coverage is not visibility

A topic appearing in a prompt or set does not prove:
- an AI provider answers that prompt;
- the brand appears in an answer;
- the site is cited;
- the site ranks;
- AI visibility exists.

P7.3 owns answer/brand/citation collection strategy.

P7.5 owns visibility scoring/history.

### No generation

P7.2 performs no:
- prompt generation;
- query expansion;
- variant generation;
- rewriting;
- semantic clustering;
- embeddings.

Any future generated or externally collected prompt source requires a separately reviewed contract.

## Bounds

P7.2 v1 bounds:
- topics: 256;
- prompts: 512;
- prompt sets: 128;
- topic references per prompt: 32;
- prompt references per set: 256;
- label length: 256 characters;
- prompt text length: 4,096 characters;
- normalized key/code length: 96 characters.

Bounds fail closed.

## Separation from later P7 milestones

P7.2 deliberately does not:
- collect AI answers/brand mentions/citations — P7.3;
- compare citations/domains/competitors — P7.4;
- score AI visibility/history — P7.5;
- generate AI/GEO opportunities — P7.6;
- create the production AI Visibility workspace — P7.7.

## Runtime and safety boundary

P7.2 is pure deterministic engineering only.

It adds no:
- route or OpenAPI change;
- provider request or credential use;
- AI/LLM request;
- embedding request;
- source admission;
- prompt/topic persistence;
- answer/citation collection;
- database read/write/DDL/DML;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

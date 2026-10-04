# UGP-9.3A — Authority Opportunity Discovery Contract

## Status

Implementation PR candidate for the isolated Universal Growth Platform initiative.

## Purpose

UGP-9.3A introduces a deterministic, provider-neutral authority-opportunity discovery read model. It converts already-normalized backlink evidence and explicitly supplied opportunity evidence into inspectable discovery candidates without performing prospect qualification, outreach, persistence, scheduling, provider execution, or public-site writes.

## Supported opportunity classes

The contract implements the eight UGP-9.3 roadmap classes:

- competitor link gap;
- domain intersection;
- broken-link opportunity;
- unlinked brand mention;
- lost-link recovery;
- resource-page opportunity;
- partner/supplier citation;
- content-promotion prospect.

## Evidence rules

No opportunity is fabricated from absence alone.

### Competitor link gap

Derived only from an existing normalized P5.5 backlink competitor bundle when:

- the referring domain is absent from owned coverage;
- at least one competitor has observed coverage;
- the bundle measurement basis exactly matches the current UGP-9.1 backlink dataset.

### Domain intersection

Derived only when a competitor-gap referring domain is observed linking to at least two competitors while remaining absent from owned coverage.

### Lost-link recovery

Derived only from a normalized UGP-9.1 backlink with:

- state = lost; and
- an exact normalized lostAt timestamp.

A provider-reported is_lost flag without an exact normalized loss timestamp is not promoted into lost-link recovery.

### Supplemental evidence classes

The following require an explicit supplied evidence signal:

- broken-link opportunity;
- unlinked brand mention;
- resource-page opportunity;
- partner/supplier citation;
- content-promotion prospect.

Each signal must carry:

- canonical source domain;
- optional source URL on that exact source domain;
- optional target URL on the owned target domain;
- observed timestamp not later than the current backlink dataset observation;
- 64-hex evidence fingerprint.

## Measurement-basis binding

Competitor evidence is admitted only when all of the following match the current UGP-9.1 dataset:

- provider key;
- provider dataset/method;
- source fingerprint;
- market fingerprint;
- category fingerprint;
- authority metric identity;
- authority metric range;
- cross-provider-comparable = false.

Mismatch fails closed.

## Opportunity output

Each opportunity contains:

- deterministic opportunity ID;
- deterministic opportunity fingerprint;
- opportunity kind;
- source domain;
- optional source URL;
- optional owned target URL;
- competitor domains where relevant;
- observation time;
- provider-native authority where directly available;
- evidence fingerprints;
- explicit rationale code.

The model contains no quality score, priority score, contactability score, spam score, outreach state, or execution authorization.

Those belong to later milestones, primarily UGP-9.4 and UGP-10.

## Determinism and integrity

The output is canonically sorted and fingerprinted.

Integrity validation verifies:

- version;
- target-domain validity;
- dataset/bundle fingerprints;
- opportunity kinds;
- canonical domains and URLs;
- target-domain binding;
- evidence fingerprints;
- per-opportunity fingerprints and IDs;
- summary counts;
- overall discovery fingerprint;
- closed safety semantics.

## Safety semantics

UGP-9.3A is explicitly:

- deterministic;
- evidence-backed only;
- discovery-only;
- not scored;
- not prospect-qualified;
- not contact-enriched;
- not outreach-authorized;
- not live-acquisition-authorized;
- network-free;
- persistence-free;
- scheduler-free;
- provider-write-free;
- public-site-write-free.

## Tests

The bounded test suite covers:

1. all eight roadmap opportunity classes;
2. exact normalized loss versus provider-reported loss;
3. shared-competitor domain intersections;
4. deterministic output under input reordering;
5. measurement-basis mismatch rejection;
6. cross-domain supplemental target rejection;
7. tamper/fingerprint rejection;
8. closed safety semantics.

## Explicit non-goals

UGP-9.3A does not:

- call DataForSEO or any other provider;
- resolve credentials;
- persist opportunities;
- rank or score opportunities;
- qualify prospects;
- discover contact information;
- draft or send outreach;
- schedule work;
- mutate a database;
- mutate a provider;
- mutate a public site;
- change Railway or production configuration.

## Next bounded milestone

UGP-9.3B may expose this discovery model through a customer-safe authenticated API/read model and UI only after the discovery contract is certified.

UGP-9.4 remains responsible for transparent prospect qualification and scoring.

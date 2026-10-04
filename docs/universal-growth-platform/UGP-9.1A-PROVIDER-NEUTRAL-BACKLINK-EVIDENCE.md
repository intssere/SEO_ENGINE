# UGP-9.1A — Provider-Neutral Backlink Evidence Contract

Version: `ugp-9-1a-provider-neutral-backlink-evidence-v1`

## Status

IMPLEMENTATION CANDIDATE — PURE EVIDENCE NORMALIZATION ONLY / NO LIVE PROVIDER TRANSPORT

## Purpose

UGP-9.1A establishes the provider-neutral backlink evidence model required by UGP-9 Authority Intelligence.

The predecessor P5.5 backlink work already proved deterministic domain-level normalization and competitor-gap fixture semantics. UGP-9.1A extends the architecture to first-class individual backlink records so later dashboard, opportunity-discovery, and prospect-qualification increments can reason from exact evidence rather than provider-specific response shapes.

## Dataset identity

Each normalized dataset contains:

- target domain;
- exact provider/source/request lineage;
- observation timestamp;
- provider response fingerprint;
- optional provider authority-metric definition;
- individual backlink records;
- deterministic referring-domain aggregates;
- deterministic summary counts;
- dataset fingerprint.

The contract is provider-neutral. DataForSEO is the initial provider candidate, but no DataForSEO response shape is embedded in this schema.

## Individual backlink evidence

Each backlink preserves:

- canonical source URL;
- canonical source domain;
- canonical target URL;
- anchor text where supplied;
- first seen timestamp where supplied;
- last seen timestamp where supplied;
- lost timestamp where supplied;
- state:
  - active;
  - lost;
  - unknown;
- follow state:
  - follow;
  - nofollow;
  - unknown;
- rel attributes:
  - nofollow;
  - sponsored;
  - ugc;
- provider-scoped authority value where available;
- arbitrary bounded provider metrics with explicit units;
- deterministic backlink ID and fingerprint.

## Lineage validation

The contract fails closed when:

- source URL hostname does not equal supplied source domain;
- target URL hostname does not equal the dataset target domain;
- provider timestamps occur after the declared observation time;
- first-seen occurs after last-seen or loss;
- lost state is asserted without a lost timestamp;
- active state carries a lost timestamp;
- follow/nofollow semantics contradict rel attributes;
- exact backlink evidence is duplicated.

## Provider metric semantics

Provider metrics are preserved rather than reinterpreted.

Metrics:

- retain provider-defined key;
- retain numeric value;
- retain explicit unit or null;
- reject duplicate metric keys within one backlink;
- reject conflicting units for the same metric when aggregating one referring domain.

Referring-domain metric aggregation is deliberately descriptive: for repeated numeric provider metrics, the domain aggregate keeps the maximum observed value. This does not imply that metrics from different providers are comparable.

## Authority metric semantics

Provider authority is optional.

When authority is supplied:

- the source must declare an authority metric definition;
- value must fit the provider-defined range;
- `crossProviderComparable` must be exactly false.

If multiple backlinks from the same referring domain carry conflicting non-null authority values in one normalized observation, the dataset fails closed instead of inventing an average.

UGP-9.1A therefore does not create a universal "domain authority" score.

## Referring-domain aggregates

Individual backlinks are deterministically grouped by referring domain.

Each aggregate includes:

- backlink count;
- active backlink count;
- lost backlink count;
- unique target URLs;
- unique anchor texts;
- observed follow states;
- observed rel attributes;
- earliest known first-seen timestamp;
- latest known last-seen timestamp;
- provider authority where non-conflicting;
- provider metrics;
- deterministic referring-domain fingerprint.

## Dataset summary

The dataset exposes descriptive counts for:

- total backlinks;
- active backlinks;
- lost backlinks;
- referring domains;
- active referring domains;
- lost-only referring domains;
- follow backlinks;
- nofollow backlinks;
- sponsored backlinks;
- UGC backlinks.

No opportunity score or outreach recommendation is generated here.

## Relationship to P5.5

P5.5 remains useful as the prior supplied-fixture and competitor-gap normalization boundary.

UGP-9.1A does not delete or reinterpret it.

The intended progression is:

1. UGP-9.1A — provider-neutral first-class backlink evidence contract;
2. UGP-9.1B — DataForSEO response adapter into this contract;
3. UGP-9.1C — controlled provider acquisition/certification boundary if needed and separately authorized;
4. UGP-9.2 — Authority dashboard projections from normalized evidence.

A later bridge may derive P5.5-style competitor-gap inputs from UGP-9.1 datasets where evidence coverage is sufficient.

## Safety semantics

UGP-9.1A is:

- deterministic;
- provider-neutral;
- read-only;
- non-persistent;
- non-networked;
- non-scheduling;
- non-outreach;
- non-authorizing.

It explicitly records:

- `crossProviderAuthorityComparable: false`;
- `grantsAuthorization: false`;
- `outreachAuthorized: false`;
- `providerEnrollmentAuthorized: false`;
- `credentialUseAuthorized: false`;
- `performsNetworkOperation: false`;
- `performsPersistence: false`;
- `databaseWrites: false`;
- `schedulerEnabled: false`;
- `providerWrites: false`;
- `publicSiteWrites: false`.

## Test coverage

The bounded test suite verifies:

1. deterministic individual-link normalization and domain aggregation;
2. source/target hostname lineage;
3. provider-scoped authority semantics;
4. link-state / rel contradiction rejection;
5. timestamp chronology and observation-time bounds;
6. conflicting domain authority rejection;
7. duplicate backlink evidence rejection;
8. conflicting provider metric-unit rejection;
9. dataset tamper detection;
10. all live/provider/outreach authority gates remain closed.

## Explicit non-goals

UGP-9.1A does not:

- call DataForSEO;
- use credentials;
- enroll a provider;
- purchase provider access;
- persist backlinks;
- create database tables or migrations;
- schedule backlink refreshes;
- calculate competitor gaps;
- score authority opportunities;
- qualify prospects;
- discover contacts;
- draft or send outreach;
- create reciprocal-link schemes;
- create purchased ranking-link workflows;
- write to customer sites;
- mutate Railway, deployments, workers, or production runtime.

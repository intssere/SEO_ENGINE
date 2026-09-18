---
name: P6.1 unified opportunity types closeout
description: Certified closeout for the deterministic/default-off cross-signal opportunity classification and evidence boundary.
---

# P6.1 — Unified opportunity types closeout

## Certified implementation

- Issue: #243 — P6.1 unified opportunity types across technical/content/query/competitor/link/AI v1
- Implementation PR: #244
- Baseline SHA/tree: `5b5390220fb2ba2c4779d560f1066e3e028aca54` / `7b78237af4bf721245a66a94fab1656c14fc1555`
- Exact tested implementation head: `0a8befd87412bc50ec24658809402c79adf404cd`
- Exact-head PR CI: #450 / run `35401511588` — success
- Implementation merge: `6d979eba38a56b629c9fe96d7921eac4449b8f60`
- Implementation tree: `af4be14b0d8827865ee3051dcb33c5c8596636eb`
- Post-merge main CI: #451 / run `35401722129` — success

The full GitHub CI matrix passed on both the exact PR head and exact implementation merge: legacy PostgreSQL schema validation, Task tests, P3.6 observation/evidence migration test, all current workspace packages including P6.1, canonical Playwright/P4.10 Chromium critical paths, typecheck and build.

## Replit certification

Replit was independently reconciled by Git fast-forward only to the exact implementation merge/tree.

Certified state:
- branch `main`;
- HEAD/origin-main `6d979eba38a56b629c9fe96d7921eac4449b8f60`;
- tree `af4be14b0d8827865ee3051dcb33c5c8596636eb`;
- ahead/behind `0/0`;
- clean index/worktree;
- zero untracked files;
- no Replit-only commit.

Non-browser certification passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

The build retained the existing non-fatal chunk-size warning only. No Playwright/Chromium was run on Replit.

## P6.1 semantic boundary

P6.1 introduces six canonical families:
- `technical`
- `content`
- `query`
- `competitor`
- `link`
- `ai`

Concrete kinds map to exactly one family.

The existing legacy opportunity types are compatibility-mapped without changing the legacy opportunity engine or API:
- `organic_ctr` → query
- `striking_distance` → query
- `technical_remediation` → technical
- `internal_link` → link
- `content_alignment` → content

P6.1 records preserve:
- caller-owned opaque subject identity;
- explicit reference time;
- optional exact market/category scope;
- bounded evidence fingerprints/source/timestamp/scope lineage;
- explicit missing-evidence codes;
- deterministic evidence ordering and opportunity fingerprints.

Exact duplicate evidence collapses deterministically. The same evidence fingerprint with conflicting normalized metadata fails closed. Multiple contradictory non-null market/category scopes fail closed. Evidence timestamps after the explicit reference time fail closed.

## Preserved P5 semantics

P6.1 carries semantic guards rather than reinterpreting upstream evidence:
- P5.3 provider-native organic difficulty is not cross-provider comparable;
- P5.4 0–100 trend values are request-frame relative, not absolute search demand, and trend frames are not cross-frame comparable;
- P5.5 authority is provider-native and not cross-provider comparable;
- P5.6 observed competitor visibility is not market share;
- P5.6 topic/page/link gap evidence is descriptive and is not a recommendation by itself;
- P5.8 source telemetry is descriptive only and does not control Task #67 refresh planning or Task #70 execution;
- null remains distinct from zero;
- missing evidence is never fabricated.

## Scoring separation

P6.1 contains no:
- impact score;
- confidence score;
- risk score;
- effort score;
- freshness score;
- combined opportunity score;
- priority/ranking;
- recommendation generation.

The pre-existing legacy opportunity engine and its current score/risk/confidence API remain untouched.

Roadmap P6.2 owns the next cross-signal `impact × confidence × risk × effort × freshness` scoring layer.

## Safety and authorization closeout

P6.1 is deterministic/default-off engineering only and remains unpublished.

It added no:
- live provider/public-site request or write;
- provider enrollment/purchase/credential usage;
- Task #67 Production source admission or refresh-plan mutation;
- Task #64/#70 execution;
- observation/evidence persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/batch/retry/polling;
- environment/secret/config mutation;
- new route or OpenAPI mutation;
- deployment/publication;
- automatic transition to execution.

Generic continuation after this closeout authorizes only the next safe engineering milestone unless a separate explicit bounded authorization is given.

## Next safe boundary

**P6.2 — impact × confidence × risk × effort × freshness scoring**.

P6.2 must remain transparent, deterministic, explainable and separate provider-specific/non-comparable evidence semantics from confidence, risk, effort and freshness. It must not create live execution authority.

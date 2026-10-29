# UGP-11.C4-E1 — A07 Provenance and Independent-Observation Contract

**Status:** SOURCE-ONLY DESIGN / NOT EXECUTED / NOT CERTIFIED  
**Scope:** Candidate A (native PostgreSQL thin adapter) and candidate B (pg-boss wrapper), scenario A07 ("possible side effect").  
**Governance:** Owner-controlled offline preparation only. This contract grants no Stage 2B execution, dependency installation, database connection or migration, P9 authority, worker or provider activity, deployment or merge.

## Current integration baseline

- PR #1220 introduced the 28-row A01–A14 structural preflight.
- PR #1222 introduced A07 synthetic effect-trace structural checks.
- PR #1223 introduced cross-checks between each candidate's A07 row and corresponding trace.
- All three controls examine **self-reported** data. A passing structural result is not independent observation and must not be called certification.

## Required Stage 2B evidence envelope (future; presently NOT_RUN)

For **each** candidate and A07 run, require the following independent records:

| Record | Required fields | Independent validation | Current status |
| --- | --- | --- | --- |
| Source identity | exact source HEAD, runner HEAD, dependency lock hash, immutable image digest | Read against captured, signed execution manifest | NOT_RUN |
| Fixture identity | run ID, tenant/site scope, fixture seed, pre-state digest, candidate ID | Confirm from read-only fixture observer | NOT_RUN |
| Attempt sequence | monotonic sequence ID, synthetic effect key, attempt, may-have-started, blocked replay | Observe using an instrumented local fake and an independent trace recorder | NOT_RUN |
| Transaction state | transaction correlation ID, pre/post-fault read-only observations | Independent, isolated PostgreSQL observer where specifically authorized | NOT_RUN |
| Provider boundary | explicit provider endpoint deny configuration, attempted outbound calls, observed outbound calls | Independently captured network deny logs; no real provider credentials | NOT_RUN |
| Result | manual-intervention state, recovery lockout, immutable output digest | Recompute from trusted raw records, not from runner assertions | NOT_RUN |
| Custody | observer identity, artifact hash, capture timestamps, immutable storage reference | Verify detached signature/identity and hash chain | NOT_RUN |

## Separation of trust

1. **Runner** may emit scenario events but is not trusted to attest that no real side effect occurred.
2. **Local mock spy** records attempted synthetic effects; a mock attempt is evidence of test activity, not an external provider call.
3. **Independent observer** reads fixture/transaction state without sharing the tested candidate's credentials or write authority. It must not silently inherit the runner's claimed results.
4. **Network boundary** must deny real provider traffic and preserve independent denial evidence. A zero-valued runner counter is never sufficient.
5. **Review authority** remains separate from test creation; operational authority and P9 approval cannot be derived from shape validation or self-signed manifests.

## Fail-closed acceptance checklist

- [ ] Both candidates produce **separate** A07 run IDs and uniquely bound scenario manifests.
- [ ] The run/fixture/source identities match their corresponding A07 packet rows, but the two candidate fixtures are comparable.
- [ ] Every submitted mock trace has a recomputed canonical digest and matching provenance record.
- [ ] Raw independently observed events agree with the runner's declared outcome.
- [ ] At least one synthetic attempt, an uncertain may-have-started state, and subsequent replay denial are independently observed in the correct order.
- [ ] The candidate records `manual_intervention_required` rather than claiming safe automatic replay.
- [ ] Explicit, independent evidence shows no real provider call or external effect.
- [ ] Hashes, signatures, environment identity, and retention path are independently verifiable.
- [ ] Injected missing, swapped, altered, duplicated, and forged evidence is rejected.
- [ ] A01–A14 parity evidence and all other Stage 2B gates remain separately checked.
- [ ] The owner specifically approves the disposable environment and Stage 2B experiment before any runtime action.

## Implementation requirements for a future offline source-only PR

A future pure checker may validate that each A07 trace, packet row and provenance manifest **claims** matching source/runner SHAs, fixture references, run IDs, and trace digests. Such consistency must be named `SELF_CONSISTENT_UNAUTHENTICATED`, never `CERTIFIED` or `PASS_STAGE_2B`. It must always return `stage2bCertified=false`, `executionAuthorized=false`, and `operationalAuthority=false`. No importing DB or transport runtime clients; no startup effects.

**Gate conclusion:** This is a design contract only. Every Stage 2B experimental result is **NOT_RUN**, and no transport candidate is selected or certified.

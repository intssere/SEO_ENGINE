# Task #67 — Engineering Closeout

Task #67 — **Market/Category Signal Source Registry & Refresh Planning Foundation v1** — is implemented, merged, CI-certified, and synchronized to the Replit workspace without publication.

## Canonical engineering release

- Issue: #101
- PR: #102
- first PR head: `1648d6b3e919b04471231e179c7fd4b46fdf4d29`
- first PR CI #196: tests passed but typecheck correctly failed on an incomplete return shape; this head was never merge-eligible
- corrected exact tested PR head: `d5207bbe17f3c9b277addc3d524dcd38256da5fc`
- corrected PR CI #197: success
- merged GitHub main: `444b22747ea537735e4778f6fd63bb39919f6a67`
- merged tree: `09cf5eaa76a2ea422600c904ee2f0a85c54754df`
- post-merge main CI #198: success
- Replit workspace: exact `main` sync to the merged SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- working tree: clean
- publication/redeploy: **not performed**

## Files added

Task #67 added exactly three files:

1. `artifacts/api-server/src/lib/signal-source-registry.ts`
2. `artifacts/api-server/src/lib/signal-source-registry.test.ts`
3. `docs/task67-signal-source-registry-refresh-planning.md`

No existing runtime route, provider connector, schema, migration, environment/configuration, target configuration, scheduler, worker, execution path, or production persistence path was modified.

## Control-plane capability delivered

Task #67 composes the Task #66 market/category identity model into a pure deterministic source-registry and refresh-planning layer.

A source descriptor now binds:

- stable source key/name
- source class: first-party or external
- supported signal types
- supported market/category fingerprints or explicitly declared wildcard coverage
- trust class
- quality score
- provenance completeness
- freshness policy
- volatility class
- collection mode descriptor
- manual-review state

External sources are not eligible until manually reviewed. Incomplete provenance is not eligible. Market/category/signal mismatches fail closed.

## Freshness and refresh planning

Task #67 supports source-specific freshness rather than one global TTL.

Normalized freshness states are:

- `missing`
- `fresh`
- `stale`
- `critical`

Refresh urgency combines freshness state with volatility. Higher-volatility sources receive higher urgency when otherwise equally stale.

Refresh plans are deterministic and bounded by:

- maximum sources per plan
- maximum signal types per source
- maximum total refresh items

The planner returns selected items, deferred items, blockers, and a deterministic plan ID/fingerprint. Unsupported requested signal coverage is surfaced explicitly instead of being silently skipped.

The fingerprint uses a minimized deterministic identity, while the returned selected/deferred items preserve their full source identity/class/score fields. This distinction was enforced by the corrected typecheck fix before merge.

## Deterministic tests

The dedicated Task #67 suite covers 13 cases including:

- capability safety markers
- deterministic source identity
- market/category eligibility separation
- first-party vs external/manual-review behavior
- provenance completeness
- fresh → stale → critical transitions
- volatility-aware urgency
- deterministic plan identity independent of source order
- bounded budget deferral
- unsupported coverage blockers
- duplicate source rejection
- duplicate observation-state rejection
- invalid timestamp/quality/budget fail-closed behavior

On the corrected PR head, dedicated tests, the full workspace test suite, typecheck, and build all passed.

## Safety certification

Task #67 capability remains planning-only:

- network collection authorized: false
- provider enrollment authorized: false
- credential mutation authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler: false
- batch: false
- autonomous worker: false
- retry loop: false
- provider writes: false
- public-site writes: false
- automatic transition: false
- schema mutation required: false

After the Replit engineering sync, sanitized read-only verification confirmed:

- Task #64 one-target dry-run execution gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence persistence gate: false
- public-site write gate: false
- no publish/redeploy occurred during verification
- no state modification occurred during verification

## Runtime distinction

The currently published production application remains the Task #65 application bundle. Task #67 is present in GitHub and the Replit workspace but was not separately published.

## Next engineering boundary

The next safe milestone should define the deterministic adapter/result and normalization boundary that turns a Task #67 refresh-plan item into a canonical observation object **without contacting any source**.

Recommended next milestone:

**Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1**

Safe scope:

- pure adapter request/response contracts
- canonical signal observation envelope
- market/category/signal/source lineage validation
- deterministic observation identity/fingerprints
- bounded normalized metrics
- explicit empty/partial/error semantics
- deduplication rules
- source quality/confidence carry-forward
- fail-closed mixed-scope detection
- deterministic tests/docs

Still separately authorized and out of scope under generic `continue`:

- real provider/competitor network collection
- provider enrollment or credential/OAuth changes
- evidence persistence
- target activation/config mutation
- scheduler/batch/worker/retry-loop activation
- production DDL
- Task #64 execution
- Task #53/#54 execution
- provider/public-site writes
- publication/redeploy

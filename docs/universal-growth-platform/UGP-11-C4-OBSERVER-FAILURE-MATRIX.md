# UGP-11.C4 — Independent Observer Failure Matrix

Baseline UGP commit: `e52f074fd16ca118e9e9d87b5b4f781ffd1519d3`; post-merge CI workflow `38248651096` completed with success.

This bounded increment adds a pure fail-closed regression matrix for the existing `reconcileFencedCommitEvidence` function. Cases cover unavailable/partial/conflicting observer evidence, incomplete marker-job observations, stale and advanced fence or attempts, changed ownership, cross-tenant/site identities, marker fingerprint conflicts, and duplicate or contradictory immutable attempt markers.

The tests require `manual_intervention_required` and explicit denial of automatic retry, provider dispatch, and production authority for every ambiguous outcome. Even complete matching evidence cannot grant those capabilities.

**Certification limit:** These are deterministic pure-contract tests, **not** actual database disconnect injection, independent client error propagation, snapshot provenance attestation, stale-replica testing, or a production PostgreSQL observer. The earlier PR #1124 supplies the separate disposable PostgreSQL locked-observer race fixture. Those missing end-to-end failure modes remain future explicitly bounded increments.

No main integration, live DB reads/writes, migrations, deployment, provider mutation, credentials, scheduler, autonomous retries, or P9 grant. Exact-head push and PR CI, separate merge authorization, and successful post-merge CI are mandatory.

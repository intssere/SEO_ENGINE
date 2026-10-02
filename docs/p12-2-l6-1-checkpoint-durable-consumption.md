# P12.2-L6.1 — Checkpoint stop and durable packet consumption

## What this milestone adds

L6.1 resolves two of the five fail-closed live-executor blockers:

- exact full-crawl interruption after a requested persisted checkpoint revision;
- durable L2 packet consumption across processes.

The ordinary full-crawl API retains its existing completion-only return type. The new interruption API is explicit and returns only after the target checkpoint revision has been persisted. It does not persist a completed-run snapshot.

The durable L2 execution API claims the packet fingerprint before invoking the executor. The claim is unique in PostgreSQL. A failed executor leaves the claim consumed, so a second process cannot retry the same packet. Successful execution upgrades that exact claim with the final L2 receipt.

## Migration 0008

`0008_first_party_crawl_l2_invocations.sql` adds `first_party_crawl_l2_invocations`.

The migration is additive, transactional, has no data migration/default-generated identities, and is independently CI-certified. It adds one table to the current Production P12.2 schema.

Repository merge does not authorize applying migration 0008 to Production.

## Remaining blockers

After L6.1, the readiness contract still blocks the first live crawl on:

1. incremental executable-material binding;
2. a real live executable entrypoint;
3. proof that a certified Production image contains that entrypoint.

No crawl, scheduler, worker, provider write, public-site write, Production DB migration, image release, or Railway deployment is authorized by this milestone.

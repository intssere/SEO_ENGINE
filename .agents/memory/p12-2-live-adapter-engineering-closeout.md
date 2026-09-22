# P12.2 live-adapter engineering — issue #387

## Scope

Issue #387 adds default-off production-capable first-party sitemap, robots, page, pacing-clock and PostgreSQL persistence adapters plus manual composition for the exact Diamond Shelf site.

Engineering is certified complete.

- issue: #387
- PR: #388
- exact tested head: `f7210f7c7d7b7ff3e079403ec107acefbf4f9cc0`
- tree: `317675fd81f3a83a0336be56c4e4c1f816ff82d9`
- exact-head PR CI #686 / run `35713158875`: success
- merge: `cfdb21f3853f6a6c604686d750016c08c7f43492`
- post-merge main CI #687 / run `35713968607`: success
- Replit Git-only sync: exact merge/tree, `0/0`, clean

## Permanent safety facts

- Exact site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`.
- Exact origin: `https://diamondshelf.us`.
- Manual confirmation: `AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768`.
- All four runtime gates default false.
- No HTTP route/startup/job/scheduler/worker binding.
- No response body, page content or raw sitemap XML persistence.
- Migration 0004 is source-controlled and never auto-applied by runtime bootstrap.
- Migration/persistence integration tests use only `P12_2_EPHEMERAL_DATABASE_URL`; never generic `DATABASE_URL`.

## Development-schema incident

An early local Replit migration test mistakenly used generic `DATABASE_URL` and applied 0004 once to Development, moving it from 34 to 37 tables. The three new tables were empty. Production remained at 34 and was not written.

No compensating DDL was performed. Reconciliation is separately authorization-gated.

The incident produced the durable rule that migration integration tests must use a dedicated, explicitly named ephemeral database variable and fail/skip when it is absent.

## Completion meaning

P12.2 live-adapter engineering is now certified complete.

That certification is engineering-only. It does not authorize:
- applying migration 0004 to Production;
- deployment/publication of the merged adapter layer;
- enabling any of the four live runtime gates;
- sitemap/robots/page network access;
- live crawl persistence;
- scheduler/worker activation;
- provider/public-site mutation.

Production remains at 34 tables. Development is at 37 only because of the disclosed migration-test incident. The next live path remains separately gated: Production schema application → deployment/runtime activation → bounded full crawl → interruption/resume → repeat/reconciliation → bounded incremental cycle → persisted evidence certification.

# P12.2 live-adapter engineering — issue #387

## Scope

Issue #387 adds default-off production-capable first-party sitemap, robots, page, pacing-clock and PostgreSQL persistence adapters plus manual composition for the exact Diamond Shelf site.

The engineering branch is `p12-2-live-adapter-engineering`.

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

Merging issue #387 will make P12.2 live-proof adapters engineering-ready only. It does not authorize schema application, deployment, network crawling, persistence, scheduler/worker activation or publication.

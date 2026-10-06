# P12.2-L10.13B — terminal-failure recovery and durable accounting

## Why this milestone exists

Packet 013 proved that the full Diamond Shelf inventory could be durably accounted for while still failing whole-site certification. Its final persisted checkpoint reached 3,044 / 3,044 finalized URLs with one terminal failure, but the pre-L10.13B model retained only the aggregate `terminalFailures` counter. The failed canonical URL, failure signal, and exact terminal attempt were not durably preserved. The bridge then built an uncertified snapshot and `saveCompletedRun` correctly rejected it because certified completed runs remain certified-only.

L10.13B fixes that evidence and recovery gap without weakening `wholeSiteCertified`.

## Contract

L10.13B adds three append-only persistence surfaces through migration
`0010_first_party_crawl_terminal_failure_recovery.sql`:

1. `first_party_crawl_terminal_failure_events`
   - exact canonical URL;
   - execution-plan and checkpoint lineage;
   - exact failure outcome/signal and attempt evidence in the payload;
   - event chain types `terminal_failure`, `recovery_failure`, and `recovery_resolved`;
   - a recovery event references exactly one source event, and one source event can be consumed only once.

2. `first_party_crawl_accounting_snapshots`
   - completed URL-accounting snapshots whether or not whole-site certification passed;
   - exact checkpoint and execution-plan lineage;
   - explicit `whole_site_certified` and terminal-failure count;
   - distinct from `first_party_crawl_completed_runs`, which remains certified-only.

3. `first_party_crawl_terminal_failure_recovery_receipts`
   - exact source and result checkpoint lineage;
   - deterministic recovery-plan and receipt fingerprints;
   - `resolved` or `incomplete` status;
   - exact URL receipts for the bounded recovery attempt.

All three tables reject UPDATE and DELETE at the PostgreSQL trigger layer. Recovery state is therefore append-only and auditable.

## Atomic failure evidence

When a normal full-site crawl finalizes a non-retryable URL failure, the bridge creates a deterministic terminal-failure event for that exact canonical URL. The event and the checkpoint advance are committed in the same database transaction.

A checkpoint therefore cannot durably advance past a newly terminal URL while silently losing the URL-level failure evidence.

The persisted event contains no page body, raw response body, raw sitemap XML, HTML, or page content.

## Accounting-complete but uncertified

The accounting-aware full-site path persists the complete snapshot to the accounting table before the certified-run gate.

If certification is blocked by terminal failures, the bridge returns a structured
`accounting_complete_uncertified` receipt containing:

- exact checkpoint revision and fingerprint;
- accounting snapshot fingerprint;
- terminal-failure count;
- certification blockers;
- confirmation that the accounting snapshot and terminal-failure evidence are durable;
- confirmation that no certified completed-run row was written.

The L2 one-shot contract accepts this state only for full-site phases. The durable L2 receipt can therefore complete rather than leaving a consumed invocation permanently in `claimed` when URL accounting is complete but certification is blocked.

Certified runs are unchanged: `first_party_crawl_completed_runs` still rejects any snapshot whose certification does not assert `wholeSiteCertified=true`.

## Bounded recovery

Terminal-failure recovery does not rediscover or guess URLs.

The recovery bridge:

1. loads the latest completed accounting snapshot for the exact run and execution plan;
2. loads the unresolved append-only terminal-failure event chain;
3. requires the number of unresolved evidenced URLs to equal the checkpoint's terminal-failure counter;
4. requires every evidenced URL to belong to the original execution plan;
5. retries only those exact URLs under the original request/retry policy;
6. advances the already-completed checkpoint by one revision;
7. appends one `recovery_resolved` or `recovery_failure` child event per source event;
8. rebuilds the completion certification;
9. atomically commits the result checkpoint, child events, accounting snapshot, recovery receipt, and—only when certification passes—the certified completed-run row.

If a recovery still fails, the new `recovery_failure` child becomes the sole unresolved evidence for that URL and the run remains uncertified.

If all failures resolve and the existing certification contract passes, the same atomic transition promotes the recovered snapshot to `first_party_crawl_completed_runs`.

## Legacy packet 013 boundary

L10.13B does **not** invent or backfill the missing terminal URL for packet 013.

Packet 013 predates terminal-failure event persistence. Its durable state contains one terminal-failure counter but no exact URL-level terminal evidence and no L10.13B accounting snapshot.

Therefore the bounded recovery path intentionally fails closed for packet 013. A separate future evidence-identification milestone would be required before any packet-013 recovery could be authorized. That milestone must establish the exact failed canonical URL from trustworthy evidence; a blind full-site recrawl or guessed one-page retry is outside this contract.

## Schema compatibility

The pre-L10.13B Production schema remains a recognized 44-table state. After migration 0010, the 47-table state is also recognized by current L10.13B source.

The currently deployed pre-L10.13B application image recognizes the 44-table state but not the 47-table state. Therefore a current application image that recognizes both 44 and 47 tables must be released and transitioned while Production is still at 44 tables, with health/readiness certified there, before migration 0010 can be applied.

The new live accounting-aware path requires the 47-table schema before it can durably record accounting/failure recovery state. Production application transition and Production migration remain separate explicit authorization boundaries.

## Safety properties

L10.13B does not grant scheduler, worker, provider-write, public-site-write, deployment, or publication authority.

The recovery bridge requires the same explicit network, live-execution, persistence-ready, and persistence-authorized gates as other executable first-party crawl paths. It has no sitemap rediscovery step and can execute only the exact unresolved URLs already bound to the durable accounting snapshot and execution plan.

This engineering PR does not apply migration 0010 to Production and does not execute any live recovery.

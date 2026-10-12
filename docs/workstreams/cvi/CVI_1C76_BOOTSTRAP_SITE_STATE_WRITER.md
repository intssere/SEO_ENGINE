# CVI-1C.76 — Bootstrap Site-State Writer and Lock-Order Implications

## Evidence and parent
Stacked on CVI-1C.75 PR #1135 HEAD `77231d073b94dfb848b54b0bf91018d311425630`, CI run #38255784919 passed. Source inspected at this exact parent: `lib/db/src/runtime-bootstrap.ts`, `artifacts/api-server/src/lib/first-party-crawl-persistence.ts`, and `artifacts/api-server/src/lib/authority-outreach-ugp-10-33-db-prepare.ts`.

## Important newly identified site writer
`lib/db/src/runtime-bootstrap.ts:246–279` defines `upsertDiamondShelf`. It enters `sql.begin` (249), upserts `organizations` (251–257), then upserts `sites` (263–274). The site conflict clause **sets `is_active = true`** at line 271, in addition to updating display/site metadata. This is a concrete site lifecycle writer absent from earlier limited API-route audits. It can reactivate an existing Diamond Shelf site **if the bootstrap path executes against that database**. The source does not establish whether or when a production deployment invokes that path. No bootstrap was executed in this audit.

## Additional separate writer
`artifacts/api-server/src/lib/first-party-crawl-persistence.ts` contains transactional writes to `first_party_crawl_checkpoints`, `first_party_crawl_completed_runs`, and `first_party_crawl_incremental_receipts`, with `FOR UPDATE` in the relevant data-access paths (lines 344, 443, 492). These are crawl state writes, not evidence of dormant tenant membership/site grant revocation. Do not activate crawling or infer those locks are CVI mutation authorization.

## Lock and lifecycle implications
- The bootstrap transaction follows **organization → site** row mutation ordering, distinct from the synthetic plan→grant test and dormant acquisition site→connection→session→membership→grant shared-lock sequence. It must be considered in any universal lifecycle and revocation lock-order proposal.
- A site's `is_active` status is potentially rewritten by bootstrap; a future fail-closed tenant authorization policy should explicitly define whether bootstrap may reactivate suspended/disabled sites, the provenance of that change, and its audit/approval gate.
- CVI dormant membership and read-grant migrations are still not activated for production. No live `edit_draft` grant or transaction-scoped authorization fence is thereby supplied.

## Required next work
Trace the call site and deployment gate of `bootstrapRuntimeDatabase` and `upsertDiamondShelf`, including its runtime migration list and failure behavior. Scan remaining application packages for sites/connections/auth_sessions/ACL writes to finish the branch-aware inventory. Require database and security signoff before changing bootstrap or live edit handlers.

## Restrictions
Read-only source analysis and document commit only. No database connections, migration runs, credential access, providers, crawling, CMS publishing, merges, or deployments.

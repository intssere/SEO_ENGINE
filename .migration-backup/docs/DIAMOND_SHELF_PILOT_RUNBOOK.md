# Diamond Shelf Pilot Runbook

This runbook is intentionally separated from CI. It is executed only in a controlled runtime where secrets can be supplied securely.

## 1. Freeze software baseline
Record the exact `main` commit and deployment identifier. Confirm CI green and `PUBLIC_SITE_WRITES_ENABLED=false`.

## 2. Supply runtime connections
Configure, without committing values:
- PostgreSQL `DATABASE_URL`
- Shopify shop domain + access-token secret reference
- GSC OAuth access through a secret-backed connection
- GA4 property + OAuth access
- configured SEO data provider transport/credentials
- AI visibility provider credentials only for providers intentionally sampled

## 3. Connection probes
Run read-only identity/scope probes first. Stop on shop/property mismatch or excessive scope.

## 4. Baseline window
Use a documented date range shared across GSC/GA4 comparisons where possible. Preserve raw provenance and observation timestamps.

## 5. Crawl
Start with a conservative bounded run. Increase the explicit maximum only after checking response behavior and crawl coverage. Do not claim complete coverage until discovered eligible URLs and inventory reconcile to an acceptable documented threshold.

## 6. Analyze
Normalize evidence and run technical SEO, Ranking Accelerator, Opportunity Engine, internal-link intelligence, AI visibility and Search Intelligence. Save the resulting evidence/findings/opportunities.

## 7. Human review
Review the first prioritized queue before any write capability is enabled. Validate that opportunity rationale matches source evidence and that expected impact is clearly estimated rather than verified.

## 8. Dry-run action plan
Create one low-risk reversible candidate and validate safety disposition, proposed payload, expected state and rollback state with writes still disabled.

## 9. Controlled mutation — separate authorization required
Only after explicit operator approval, enable the runtime kill switch for the controlled window and execute one supported action. Disable the kill switch again immediately after the controlled action window unless a separately approved operating policy says otherwise.

## 10. Verify
Fresh-fetch/crawl the target. Compare expected/actual state and capture proof. If a regression or mismatch appears, do not continue the rollout.

## 11. Measure
Track the action through an appropriate observation period. Use controlled experiments when sample size and comparability permit. Do not attribute normal traffic variance to the action without evidence.

## 12. Dashboard cutover
Replace Task #19 presentation fixtures with live aggregates only after their sources are certified. Every production metric should have freshness/status semantics.

## 13. Certification decision
Issue one state: `NOT_STARTED`, `READ_ONLY_READY`, `CONTROLLED_WRITE_READY`, or `PILOT_CERTIFIED`, with blockers and evidence. Never infer certification solely from successful CI.

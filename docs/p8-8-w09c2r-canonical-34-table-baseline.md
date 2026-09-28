# P8.8 W09-C2R — Canonical 34-table baseline certification

**Issue:** #624
**Status:** OFFLINE REPOSITORY-DERIVED BASELINE — NO PRODUCTION ACCESS
**Canonical recovery base:** `a88a656bec47dd99b8014421b20bd1855c09a86d`

## Purpose

Freeze the exact 34-table `public` baseline required by the future Gate-C preflight without querying Production. This baseline is derived only from immutable repository migration sources and the runtime schema-count contract.

## Provenance

The canonical 34-table state is:
- `0001_core.sql` blob `91510bc00226ffce8eed25101efe9488c1b8ef57`: 29 `CREATE TABLE` objects.
- `0002_auth.sql` blob `3f63b714a419eeac556e7e1e915695ff4bfc7c54`: 2 `CREATE TABLE IF NOT EXISTS` objects.
- `0003_observation_evidence_schema.sql` blob `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`: 3 `CREATE TABLE` objects.
- `lib/db/src/runtime-bootstrap.ts` blob `f3fe6563c9e13ec255fd695438a072b9564addbb` defines `EXPECTED_CURRENT_TABLE_COUNT = 29 + 2 + 3 = 34`.

This is deliberately distinct from the later P12.2 engineering baseline of 37 tables. Migration 0005 W04 engineering was tested against that 37-table P12.2 state and therefore is not the source of the Production-34 name baseline.

## Exact canonical table names

Sorted lexicographically, exact equality means these 34 names and no others:

1. `action_plans`
2. `actions`
3. `ai_citations`
4. `ai_queries`
5. `ai_responses`
6. `approvals`
7. `auth_audit_events`
8. `auth_sessions`
9. `connections`
10. `crawl_runs`
11. `deployments`
12. `evidence`
13. `experiment_cohorts`
14. `experiments`
15. `findings`
16. `jobs`
17. `learning_signals`
18. `opportunities`
19. `organizations`
20. `outcomes`
21. `page_snapshots`
22. `pages`
23. `policy_changes`
24. `policy_sources`
25. `policy_versions`
26. `rollbacks`
27. `rules`
28. `search_metrics`
29. `search_queries`
30. `seo_evidence`
31. `seo_observation`
32. `seo_observation_evidence`
33. `sites`
34. `verifications`

## Certification rule

A future read-only Production observation may call this baseline a match only when the sorted set of ordinary/base-table names in `public` is byte-for-byte equal to the list above. Count 34 alone is insufficient. Missing, additional, renamed, non-public, or ambiguous objects fail closed.

This artifact certifies only the repository-derived expected baseline. It does not assert that current Production has this schema and grants no SQL/session/migration authority.

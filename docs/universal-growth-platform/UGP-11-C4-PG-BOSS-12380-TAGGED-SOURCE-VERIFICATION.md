# UGP-11.C4 — Tagged pg-boss 12.38.0 source and MIT notice verification

**Date:** 2026-10-15. **SEO ENGINE baseline:** `initiative-universal-growth-platform` at `a14c461902d68c6240ad0db4fe77daa58cd6a168` following merged PR #1171. Source evidence carried forward from PR #1172 without runtime changes.

## Immutable source evidence captured (read-only GitHub)

- Upstream repository: `timgit/pg-boss`.
- Tag `12.38.0` resolves via GitHub Git ref API to commit **`2c1005b744952360e999c2000e155a1bfebb8951`** at review time. This is a **git ref observation**, not a cryptographic signature or guarantee that a movable tag never changes.
- `package.json` fetched by immutable upstream commit has Git blob SHA **`df5e4c9ce49ab9961aa48fa5a98b1bdf7f6c1b3c`** and declares: package `pg-boss`, version `12.38.0`, Node engine `>=22.12.0`, `pgboss.schema=46`, `license=MIT`. Four declared runtime dependencies: `cron-parser:^5.10.2`, `pg:^8.23.1`, `rrule-temporal:^2.2.8`, `serialize-error:^13.0.2`; peer dependency `@opentelemetry/api:^1.9.0`.
- `LICENSE` fetched at same immutable upstream commit has Git blob SHA **`e37b5797983fa2c3bbab44c9aa4291956253e142`**, contains MIT permission language, and copyright (c) 2016 Tim Jones. This verifies upstream tagged-repository *source* license text, **not npm tarball inclusion**, notice compliance of transitive packages or downstream third-party licensing.
- Read-only GitHub API routes: `/repos/timgit/pg-boss/git/ref/tags/12.38.0`; `/repos/timgit/pg-boss/contents/package.json?ref=12.38.0`. Full tagged-source review and npm tarball integrity verification are separate outstanding gates.

## What this evidence resolves vs. what remains open

| Question | Result |
|---|---|
| Upstream tag target at review | **Observed** `2c1005b744952360e999c2000e155a1bfebb8951` |
| Exact tagged source package manifest | **Observed** `12.38.0`, Node `>=22.12.0`, schema `46` |
| Upstream tagged source license notice | **Observed** MIT notice at immutable commit |
| npm tarball dist integrity / registry signing | **NOT CHECKED** |
| Published transitive dependency resolution and advisories | **NOT CHECKED** |
| SQL migration 45→46 and boot/start behavior | **NOT CERTIFIED** |
| Exact Railway live Node/PG versions | **NOT CHECKED** |
| Claim safety, timeout, kill/side-effect quarantine | **NOT CERTIFIED for pg-boss** |
| Independent owners/security approval and C2 trust #1054 | **OPEN** |
| Approval to install/select/deploy/dispatch/DDL | **NOT GRANTED** |

## Decision

This is a narrowly bounded **read-only tagged-source evidence checkpoint** for issue #1061, not a transport-selection or production-readiness decision. Follow with independent supply-chain/advisory review, exact-runtime nonproduction verification, migration inspection, safety experiment design and C2 review. **No package installation, lockfile edits, database access, workers, scheduler, provider calls, production changes, main merge, or runtime activation** are authorized by this artifact.

# UGP-11.C4 — Disposable Concurrent Lease-Rollover Negative Evidence

Baseline: `initiative-universal-growth-platform` at `f07bf968c410a7d249c77fd0eb27ea080dd4e72b` (post-merge CI successful). Workstream issue #1061. C2 trust owner/approval issue #1054 remains open.

This increment uses the existing disposable local PostgreSQL `seo_engine_test` fixture only. A test-created job starts with manually expired lease, simulated owner A, fence 7, and attempts 1. Two independent SQL transactions contend on the same fixture control row using `FOR UPDATE`, each conditionally attempting takeover from the same expired lease with fence 7. Exactly one succeeds; fence increases to 8, attempts to 2, and the new owner is B or C. Old A heartbeat and completion attempts must affect zero rows and leave the receipt empty. Test records are deleted on cleanup.

**Test boundary:** `source='fixture_only'` remains intact. All successful SQL rollover operations are synthetic fixture state mutation—not operational P9-certified claims or provider dispatch. No new migrations, DDL, worker, scheduler, authority issuer, real keys, external provider, deployment or website writes.

**Still unverified:** controlled simultaneous lock release interleavings with kill, lock timeout/retry behavior while reclaiming, rollback and ambiguous commit recovery, stale new-owner fencing, clock skew/lease edge cases, positive governed authorization, and production PostgreSQL adapter. This is negative SQL evidence only; C4 is not operationally certified. The test must pass exact-head PR CI and post-merge branch CI before being considered accepted.

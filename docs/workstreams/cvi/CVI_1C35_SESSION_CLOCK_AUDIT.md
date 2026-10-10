# CVI-1C.35 — Application and PostgreSQL Clock Consistency Audit

Parent: CVI-1C.34 PR #1059. Its implementation commit `90329ecaa8ff3e105aab1a5b4a7106a662392eee` passed full CI, run 38075490427. Documentation revision `ef4ea37c7ae67b843f00b5864c1424c3fca9689b` awaits independent exact-head CI.

## Source-backed gap
The authentication loader accepts a caller-provided `now` timestamp and uses it to evaluate expiry/idle limits and update last_seen_at in PostgreSQL. Token rotation instead evaluates against PostgreSQL `clock_timestamp()`. A future-shifted application timestamp can, under some conditions, cause a session refresh to write future last_seen_at. Tests need to establish whether this permits idle-time revalidation inconsistent with database time, while still rejecting absolute expiry and revocation.

## Required bounded next increment
Build disposable PostgreSQL tests for simulated positive and negative clock offsets, future timestamp writes, idle expiry checks after skew, rotated-token revalidation, and preservation of current role/CSRF state. Prefer a single trusted server/database time source for mutable session validation, without using caller time as an authority for persistent expiry. Preserve compatibility with existing API semantics, review current callers, and require full exact-head CI.

No public route, production database migration, live provider calls, publishing, merge or deployment. This document is an audit proposal, not a certification.

## Successful exact-head implementation CI
- PR #1062 implementation SHA `883891356404e1735a7470bde57191e53d93b6f6`.
- Workflow https://github.com/intssere/SEO_ENGINE/actions/runs/38078180357 — completed SUCCESS; validation job `114289438013`.
- Parent CVI-1C.34 final SHA `ef4ea37c7ae67b843f00b5864c1424c3fca9689b` passed CI https://github.com/intssere/SEO_ENGINE/actions/runs/38078029041.
- PR remains draft/unmerged; no deployment. Documentation update requires independent exact-head proof.

---
name: Internal pilot execution
description: Why the read-only ingestion pilot has no public run endpoint.
---

In-app pilot runs must use a short-lived signed same-origin capability and a database-backed single-run lock. The endpoint may only enqueue the existing read-only runner after all production preflight gates pass.

**Why:** The app has no user-login layer, while its deployment can be public. Same-origin authorization prevents cross-site triggering, and the database lock prevents retries or concurrent callers from multiplying provider, crawl, and database work.

**How to apply:** Keep the capability short-lived, signed, cookie-bound, and same-origin. Retain exact-site, connection, credential-decryption, and public-write preflight gates. Persist queue/run state in internal jobs and reject pending or active duplicates.
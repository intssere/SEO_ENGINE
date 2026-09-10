---
name: Internal pilot execution
description: Why the read-only ingestion pilot has no public run endpoint.
---

Keep the ingestion and baseline pilot shell-invoked rather than exposing a public HTTP mutation until the app has an authenticated operator trigger.

**Why:** The current app has no authenticated admin control. A public run endpoint would let anonymous callers consume provider quotas, crawl capacity, and database resources even if public-site mutations remain disabled.

**How to apply:** Run the pilot through the API artifact's internal CLI. If a UI trigger is added later, require authenticated operator authorization and retain the public-write safety gate.
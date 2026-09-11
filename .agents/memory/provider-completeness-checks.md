---
name: Provider completeness checks
description: Fail-closed rules for GA4 property access and Shopify catalog count/pagination disagreements.
---

GA4 resource discovery proves that the authenticated account can enumerate a property, but it does not prove that the Analytics Data API is enabled for the OAuth client project or that `runReport` is permitted. Validate the selected property against authenticated discovery and a read-only property lookup, then classify Data API failures using sanitized, allowlisted categories.

**Why:** Analytics Admin discovery can succeed while Analytics Data API requests fail with HTTP 403. Persisting only a generic permission error leaves API-disabled and property-access failures indistinguishable.

**How to apply:** Before GA4 ingestion, verify the exact selected property is among authenticated discoveries and remains readable. Never persist raw provider errors; reduce them to categories such as API not enabled or property access denied.

Shopify catalog pagination must not be skipped solely because the count endpoint reports zero. A zero or malformed count can disagree with a non-empty product listing, so bounded read-only pagination should run independently and reconcile the total from observed pages.

**Why:** A successful count response was interpreted as an empty catalog, suppressing pagination and falsely marking a known non-empty store complete.

**How to apply:** Parse count responses strictly, always start bounded cursor pagination, retain origin/loop/cap guards, and mark completeness only after pagination is exhausted and observed rows reconcile with the best known total.
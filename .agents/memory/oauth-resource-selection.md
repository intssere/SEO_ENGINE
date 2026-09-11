---
name: OAuth resource selection
description: How provider resource identifiers must be validated during post-OAuth confirmation.
---

Validate submitted provider resources against the exact authorized discovery results stored with the OAuth connection. Do not require assumed URL or identifier formats before that comparison.

**Why:** Search Console can return domain-property identifiers as well as URL-prefix properties. A hard-coded URL-prefix check rejected a valid discovered property before the persistence path ran.

**How to apply:** For any post-OAuth resource picker, require a valid signed flow, reject empty values, compare normalized submitted values to the stored discovery allowlist, then update only the existing connection metadata and status.
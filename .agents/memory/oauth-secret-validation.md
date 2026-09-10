---
name: OAuth secret validation
description: Keep OAuth readiness validation aligned with the encryption code that consumes the configured secret.
---

OAuth credential encryption must support both 32-byte Base64 keys and strong passphrases of at least 32 characters, deriving passphrases with SHA-256.

**Why:** A secret can pass a minimum-length readiness check while failing at callback time if encryption assumes every accepted value is Base64 encoding exactly 32 bytes.

**How to apply:** When changing OAuth readiness rules or encryption key handling, test the same accepted formats through an encrypt/decrypt round trip.
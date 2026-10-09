# UGP-11.1D8 — Signed P9 Control Lineage Fixture

**Status:** isolated cryptographic-validation prototype only. **NOT an authenticated durable authority issuer**.

Source baseline: `initiative-universal-growth-platform` at `10c03009752b73fbc11400f3030efb678ab45be2`.

This increment introduces canonical structural validation of an offline fixture decision, an HMAC-SHA256 fixture signature, constant-time digest comparison, and exact predecessor revision/fingerprint/scope validation. Tests cover signature validity, altered decision contents, wrong signing key, replayed predecessors, foreign tenant/site ancestry and malformed time/keys.

The signing key is supplied by the unit test, not read from environment, deployment secrets or a credential manager. The signing helper is **not** an issuer: any holder of its test key can generate valid fixture signatures. Cryptographic validity therefore does not equal authenticated, authorized P9 issuance. The review result always returns `authorityGranted=false`, `claimAllowed=false`, `dispatchAllowed=false`, even on a valid signature.

**Still required before real issuance:** authenticated operator identity, key governance and rotation, independent trust store, authorization policy review, append-only durable decision storage, transactional monotonic revision/nonce enforcement, certificate/revocation lifecycle, P9.6 control transition invariants and full recovery handling. Every source assertion must be independently verified rather than assumed from a caller-provided boolean.

**Still required before live claims:** source-certified P9 authority checked inside the same transaction as an exclusive fenced claim; database-clock expiry, lease/lost-response reconciliation and separate provider execution gates. Do not loosen the D5 `fixture_only` SQL CHECK or D6 zero-claim gate to make tests pass.

No production migrations, workers, schedules, network calls, external sending, customer-facing mutations, or deployment are included. The D8 objective is **partial**: signature/lineage fixtures are testable; authenticated durable issuance remains pending.

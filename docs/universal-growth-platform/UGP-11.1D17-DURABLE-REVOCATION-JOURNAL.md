# UGP-11.1D17 — Disposable Durable Revocation Journal

**Baseline:** `initiative-universal-growth-platform` at `d1627ac4e64808aef24f039007c8f423c94c1500`.

This bounded increment creates an opt-in PostgreSQL fixture journal in the `ugp11_transport_fixture` namespace, separate from all automatic migrations. Its primary key is issuer/tenant/site/key/sequence. It enforces uniqueness of event IDs and fingerprints per key, and blocks ordinary UPDATE/DELETE/TRUNCATE operations via triggers. The fixture journal uses a transaction-scoped PostgreSQL advisory lock per exact issuer/tenant/site/key, checks the D16 offline signature and previous fingerprint, then writes a contiguous event. It distinguishes exact replays from conflicting forks. Concurrent writers are serialized under the advisory lock.

**Crucial authority boundary:** D16 signatures are verified against caller-supplied public keys; a valid signature is therefore NOT independently governed revocation authority. These rows are marked `fixture_only` and cannot grant `keyTrusted`, `issuanceAllowed`, `claimAllowed` or `dispatchAllowed`. No P9 controls, live jobs, identity source or actual revocation enforcement are updated. A DB superuser can bypass the ordinary append-only safeguards; the fixture does not establish an external audit authority.

**CI:** Applies the SQL only to disposable localhost `seo_engine_test` after existing D1/D5/D9/D10 fixtures, tests concurrent duplicate submissions, exact replay, fork denial, forged signatures, immutable rows, and absence of P9 control projection side effects.

**Future work:** independently controlled revocation signing roots, trust-anchor governance, durable signed provenance and revocation publication, key custody, replay safety across key rotations, independent operator permissions, and certified P9 issuance/claim gating.

No production migrations, credentials, worker activation, scheduling, provider access, publication, external sends or deployment are authorized or performed.

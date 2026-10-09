# UGP-11.1D9 — Disposable Decision Journal and Replay Guard

**Baseline:** initiative head `40b9ae9c07911e8a429b691118f77b8eb83dde9f`. **Scope:** test-fixture engineering only, never operational authority.

Adds `ugp11_transport_fixture.decision_journal` exclusively through opt-in SQL outside `lib/db/migrations`, with per-tenant/site revision uniqueness, decision-ID and nonce uniqueness, and update/delete/truncate rejection. The isolated TypeScript journal writes under a tenant/site-scoped PostgreSQL transactional advisory lock, checks fixture HMAC and predecessor fingerprint, accepts contiguous append, classifies exact replay versus conflict, and never materializes P9 running authority. Its outputs always deny claim, dispatch and authority.

CI applies this fixture after D1 and D5 to the dedicated localhost `seo_engine_test` database and tests concurrent duplicates, sequential lineage, tampering, forks, append-only protections, and absence of control projection changes. The journal is intentionally not cleaned through delete because mutation is prohibited; CI uses a disposable database.

**Limits:** A fixture HMAC is not authenticated operator issuance or independently governed signing authority. The journal has no production DDL, secret governance, credential/role verification, audited operator authorization, key rotation or revocation, authoritative P9 projection, transactionally eligible worker claim, lease recovery or external execution. The current simulated journal intentionally cannot grant P9 certification. Append-only database triggers do not protect against database superusers or out-of-band administrative changes; production tamper-evident auditing remains unimplemented.

**Release boundary:** worker, scheduler, production migrations, pg-boss adoption, deployments, publishing and external sends remain NOT_GRANTED.

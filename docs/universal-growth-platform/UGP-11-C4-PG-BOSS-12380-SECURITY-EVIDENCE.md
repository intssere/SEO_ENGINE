# UGP-11.C4 — pg-boss 12.38.0 external package-security evidence (2026-10-18)

**Engineering baseline:** `initiative-universal-growth-platform` `5fcc05f15d691b0e31e6485cd8f8dfea14ae4bb5`; successful post-merge [CI #39107986898](https://github.com/intssere/SEO_ENGINE/actions/runs/39107986898). **Issues:** transport #1061 and independent P9 trust #1054 remain open. **Disposition:** preliminary public-source screening only, no package adoption.

## Fresh independent/public observations

1. [npm package listing](https://www.npmjs.com/package/pg-boss) lists **pg-boss 12.38.0**, MIT, Node >=22.12 and PostgreSQL >=13, and displays **four dependencies**. This public listing is an independently accessible catalog page, not verified downloaded tarball bytes or a pin in SEO ENGINE.
2. [Snyk pg-boss 12.38.0 package report](https://security.snyk.io/package/npm/pg-boss/12.38.0) currently reports **no known direct vulnerabilities** in its database. **Explicit exclusion:** Snyk states this does *not* cover dependency vulnerabilities; absence of a direct advisory is not proof of secure code.
3. [Snyk versions listing](https://security.snyk.io/package/npm/pg-boss/versions) reports zero listed direct vulnerability severities for 12.38.0 as of review. This corroborates **one provider's published advisory snapshot only**.
4. [Snyk package health](https://security.snyk.io/package/npm/pg-boss) shows 82/100 package health, describes maintenance as sustainable, and reports **one maintainer**. Treat scores/counts as time-sensitive provider observations and a potential stewardship risk for reviewer assessment, **not** an admission score.
5. The exact tagged Git source and source LICENSE evidence was already captured by `UGP-11-C4-PG-BOSS-12380-TAGGED-SOURCE-VERIFICATION.md` at upstream commit `2c1005b744952360e999c2000e155a1bfebb8951`: Node >=22.12.0, schema 46, four direct dependency declarations and MIT source notice. This is separate from npm artifact integrity.
6. `npm/registry` [package metadata guidance](https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md) documents registry `dist.shasum` and `dist.integrity` fields for identifying the published tarball. **Those exact 12.38.0 metadata values were not fetched or independently checked in this increment.**

## Evidence classification and remaining mandatory gates

| Gate | Review disposition |
|---|---|
| Published current candidate and upstream source manifest/license | Observed: 12.38.0, schema 46, source MIT |
| Known *direct* advisory signal from one public scanner | Observed: no listed direct vulnerabilities at review |
| Exact npm tarball SHA-512 `dist.integrity`, blob contents and source correspondence | **OPEN** |
| Frozen production dependency resolution, transitive advisory audit, SBOM and license obligations | **OPEN** |
| Upstream maintainer/key compromise, provenance and future release monitoring | **OPEN** |
| Exact nonproduction Node patch and PostgreSQL server version | **OPEN** |
| Schema-46 migration, implicit start/DDL behaviors and safe rollback | **OPEN** |
| P9 authority, claim-fence guarantees, no-auto-retry and unknown side-effect quarantine | **OPEN** |
| Independent architecture/security/privacy ownership and C2 #1054 | **OPEN** |

## Comparative recommendation

**Do not promote pg-boss or the existing thin PostgreSQL fixtures into an approved runtime transport.** The direct-advisory result is a narrow positive signal, but neither option has completed an equal-scope supply-chain, operational and security review. For any authorized follow-on, require independent exact npm registry metadata/tarball verification, resolved dependency/advisory analysis, nonproduction runtime verification, reviewed schema-46 migration, and isolated fault-injection parity against the engine-owned adapter. Approval must be explicit and independently reviewed; do not conflate an npm package-health score with architectural safety.

**Prohibitions:** no npm install/download into SEO ENGINE runtime or lockfile mutation; no database SQL/DDL, service startup, credentials, jobs, workers, scheduling, provider dispatch, retry of uncertain writes, deployment or `main` changes. This artifact is read-only documentation and is not a certification of any deployed environment.

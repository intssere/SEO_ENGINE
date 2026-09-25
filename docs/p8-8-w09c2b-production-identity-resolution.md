# P8.8 W09-C2B — Actual Production Identity Resolution

**Issue:** #523  
**Status:** READ-ONLY IDENTITY RESOLUTION — PARTIAL / DATABASE SESSION NOT OPENED  
**Canonical Git baseline:** `26b77dd8ee2e486c63e303b94d859c87688b9088`

## 1. Purpose and boundary

This milestone resolves which infrastructure is the canonical SEO ENGINE Production target before any further W09-C2 database evidence acquisition.

It is identity-only. It authorizes no database connection or SQL/catalog query, DDL/DML/migration, provider/public-site request, credential/config/gate mutation, deployment/publication, Railway staging mutation, scheduler/worker/runtime activation, branch reconciliation, or isolated-initiative merge.

No secret value is recorded.

## 2. Environment classification

The following classification is authoritative for this review:

- GitHub `main` is the canonical completed-work integration line.
- Railway `SEO ENGINE` / `seo-engine-shadow` and its Railway Postgres service are frozen staging/shadow infrastructure even though Railway internally labels the environment `production`.
- Railway staging must not be used as the W09-C2 Production database target or Production schema baseline.
- The separate long-running development initiative remains isolated from `main` until its own completion/certification and explicit merge authorization.
- Neither Railway staging nor the isolated initiative may be mutated by this milestone.

## 3. Current independently observed Production publication identity

A fresh read-only Replit publication-status inspection reports:

- Replit app: `SEO_ENGINE`;
- Repl ID: `4f36f99c-0492-43c4-80e7-a7f7660fc3f7`;
- published URL: `https://dsseoengine.replit.app`;
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`;
- publication status: `success`.

This independently confirms that the currently visible published SEO ENGINE application remains the Replit deployment, not the frozen Railway staging deployment.

It does **not**, by itself, prove the current database project/branch/timeline behind that publication.

## 4. Repository-certified historical Production database lineage

The canonical P3.6 closeout records the Production database that was independently certified before migration 0003:

- database: `neondb`;
- Neon project: `late-sunset-42762033`;
- Neon branch: `br-super-frost-b341k9ms`;
- Neon timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`;
- Replit Production read-only endpoint observed then: `ep-lucky-river-b3sh13is`;
- writable compute used then on the same project/branch/timeline: `ep-muddy-mouse-b34bjs0w`.

P3.6 independently verified that the endpoint difference still represented the same project, branch, database, timeline and schema state.

P3.6 also recorded current-at-that-time PITR enabled with a seven-day recovery window and a final Production public base-table count of 34.

These identifiers are **historical certified evidence**, not automatically current W09-C2 proof.

## 5. Later publication continuity evidence

The canonical current-main publication closeout records deployment `fbef9788-c08d-475d-a85d-88ede16e92c7` at `https://dsseoengine.replit.app`, matching the fresh publication-status observation.

That closeout also records that, at publication certification time:

- Production remained at 34 public tables;
- Production received no DDL/DML during the Development alignment;
- Development and Production were independently compared at 34/34 tables;
- the P3.6 Production tables remained present and empty;
- runtime/provider/public-write gates remained closed.

This is strong continuity evidence connecting the currently reported Replit deployment identity to a later certified 34-table Production state.

It still does not replace a fresh current database project/branch/timeline identity check.

## 6. Fresh database-lineage inspection attempt

A fresh read-only Replit Agent question was attempted to establish, without secrets and without opening/querying the database:

- whether the current published deployment's database binding still points to the P3.6 Neon lineage;
- current database/project/branch/timeline/endpoint identity if exposed;
- Development/Production resource separation;
- evidence of lineage change since P3.6.

The Replit Agent was already busy with an earlier request, so the question was **not submitted or queued**. No database connection, query or mutation occurred.

Therefore no fresh database-lineage evidence was obtained from that path.

## 7. Current identity determination

The evidence supports the following fail-closed determination:

### Independently current

- canonical Git `main`: `26b77dd8ee2e486c63e303b94d859c87688b9088`;
- published application is the Replit `SEO_ENGINE` app;
- published URL is `https://dsseoengine.replit.app`;
- deployment is `fbef9788-c08d-475d-a85d-88ede16e92c7`;
- publication status is successful;
- Railway is staging/shadow and excluded from Production qualification.

### Historically certified and continuity-supported, but not freshly re-proved

- Production database `neondb`;
- Neon project `late-sunset-42762033`;
- Neon branch `br-super-frost-b341k9ms`;
- Neon timeline `07b8ce1a7a41f71ba395a1bab2b03de3`;
- endpoint/compute identities recorded by P3.6;
- seven-day PITR as of P3.6;
- 34-table Production schema as of later publication certification.

### Not yet proved current

- exact current Production database binding of deployment `fbef9788-c08d-475d-a85d-88ede16e92c7`;
- exact current Neon project/branch/timeline/database identity;
- exact current endpoint/compute identity;
- current Development/Production resource separation;
- current recovery/PITR window.

## 8. W09-C2 Gate A verdict

**Gate A: PARTIAL — Production hosting is resolved to the current Replit publication, but current database lineage is not yet freshly re-proved.**

The historical Neon lineage is the leading candidate because it is certified and later continuity evidence reports the same Production 34-table state. It must not be promoted to current fact until fresh identity evidence confirms it.

No Production database connection/catalog inspection should begin until that identity equality is established.

## 9. Required final identity proof

The next read-only identity step should obtain a current, secret-free Replit Production database-resource description that proves or disproves equality with:

- database `neondb`;
- project `late-sunset-42762033`;
- branch `br-super-frost-b341k9ms`;
- timeline `07b8ce1a7a41f71ba395a1bab2b03de3`.

It should also identify the current endpoint/compute used by the published deployment and prove that it belongs to that same lineage.

If any identifier differs, stop and classify the lineage change before catalog access. Do not silently substitute another database.

After identity equality is proved, recovery evidence is the next prerequisite. Production catalog access remains a separate read-only step.

## 10. Explicit non-authorization

This record authorizes no Production database connection/catalog query, DDL/migration execution, DML/persistence, repair/drop SQL, provider/public-site access, credential/config/gate mutation, Railway staging mutation, deployment/republication, scheduler/worker/runtime activation, isolated-initiative reconciliation/merge, W03–W07 runtime execution, Task #51/#53/#54 execution, W09-C Stage 0 run, provider-read addendum, or W10.

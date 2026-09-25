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
- deployment ID returned by the Replit publication-status API: `fbef9788-c08d-475d-a85d-88ede16e92c7`;
- publication status: `success`.

A separate Replit Agent metadata inspection independently confirmed the published URL and successful build, but its own metadata view did not expose a deployment ID. Accordingly the deployment ID above is attributed specifically to the publication-status API rather than to Agent-visible live metadata.

This confirms that the currently visible published SEO ENGINE application remains the Replit publication, not the frozen Railway staging deployment.

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

The canonical current-main publication closeout records deployment `fbef9788-c08d-475d-a85d-88ede16e92c7` at `https://dsseoengine.replit.app`, matching the fresh publication-status API observation.

That closeout also records that, at publication certification time:

- Production remained at 34 public tables;
- Production received no DDL/DML during the Development alignment;
- Development and Production were independently compared at 34/34 tables;
- the P3.6 Production tables remained present and empty;
- runtime/provider/public-write gates remained closed.

This is strong continuity evidence connecting the currently reported Replit publication to a later certified 34-table Production state.

It still does not replace a fresh current database project/branch/timeline identity check.

## 6. Fresh database-lineage metadata inspection

A fresh read-only Replit Agent inspection completed without opening/querying a database and without exposing secrets.

The Agent reported:

- `https://dsseoengine.replit.app`: **CONFIRMED** as the current published URL with a successful build;
- current Production `DATABASE_URL` target/resource identity: **UNPROVED** because accessible deployment metadata does not expose where the binding points;
- equality with `neondb / late-sunset-42762033 / br-super-frost-b341k9ms / 07b8ce1a7a41f71ba395a1bab2b03de3`: **UNPROVED**;
- current endpoint/compute identity: **UNPROVED**;
- historical endpoints `ep-lucky-river-b3sh13is` and `ep-muddy-mouse-b34bjs0w`: not freshly re-attested;
- Development and Production are documented as separate database environments, but their current resource identities/distinctness for this deployment are **UNPROVED** because both resource IDs were not exposed;
- no lineage change is evidenced by the available metadata, but unchanged lineage is also **UNPROVED**.

The Agent explicitly reported that it did not inspect connection strings or secret values, execute SQL, connect to a database, or change state.

## 7. Current identity determination

The evidence supports the following fail-closed determination:

### Independently current

- canonical Git `main`: `26b77dd8ee2e486c63e303b94d859c87688b9088`;
- published application is the Replit `SEO_ENGINE` app;
- published URL is `https://dsseoengine.replit.app`;
- Replit publication-status API reports deployment `fbef9788-c08d-475d-a85d-88ede16e92c7` and status `success`;
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

- exact current Production database binding of the published Replit application;
- exact current Neon project/branch/timeline/database identity;
- exact current endpoint/compute identity;
- current Development/Production database resource identities and distinctness;
- current recovery/PITR window.

## 8. W09-C2 Gate A verdict

**Gate A: PARTIAL — Production hosting/publication is resolved to Replit, but current database lineage remains unproved by available secret-free metadata.**

The historical Neon lineage is the leading candidate because it is certified and later continuity evidence reports the same Production 34-table state. The fresh metadata inspection found no evidence of a lineage change, but it also could not prove unchanged lineage. Historical identifiers must therefore not be promoted to current facts.

No Production database connection/catalog inspection should begin until an approved evidence path can establish the target identity without ambiguity.

## 9. Required final identity proof

The remaining identity requirement is a current, secret-free Production database-resource attestation that proves or disproves equality with:

- database `neondb`;
- project `late-sunset-42762033`;
- branch `br-super-frost-b341k9ms`;
- timeline `07b8ce1a7a41f71ba395a1bab2b03de3`.

It should also identify the current endpoint/compute used by the published deployment and prove that it belongs to that same lineage.

The currently available Replit deployment metadata cannot provide this proof. A later milestone must define an approved bounded identity-attestation path rather than weakening Gate A or inferring equality from the URL/schema history.

If any identifier differs, stop and classify the lineage change before catalog access. Do not silently substitute another database.

After identity equality is proved, recovery evidence is the next prerequisite. Production catalog access remains a separate read-only step.

## 10. CI certification

PR #524 exact-head CI run #1108 completed successfully against head `98075af28394721460ad4b7e25085455155eea34` before this evidence update.

Because this document update creates a new PR head, that earlier run is retained as historical exact-head evidence only. The new head requires its own exact-head CI before PR certification.

## 11. Explicit non-authorization

This record authorizes no Production database connection/catalog query, DDL/migration execution, DML/persistence, repair/drop SQL, provider/public-site access, credential/config/gate mutation, Railway staging mutation, deployment/republication, scheduler/worker/runtime activation, isolated-initiative reconciliation/merge, W03–W07 runtime execution, Task #51/#53/#54 execution, W09-C Stage 0 run, provider-read addendum, or W10.

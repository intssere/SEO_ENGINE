# P8.8 W09-C3B — Explicit Railway→Neon IaC binding design

## Decision

Adopt a **two-channel desired-state design** for the C2Y-selected Railway runtime + external Neon architecture:

1. Railway IaC owns and pins all non-secret runtime/configuration identity and declares the intended Neon identity as non-secret desired state.
2. The actual Neon credential remains sealed/opaque and is never used as attestation evidence.
3. A separately authoritative Railway/provider attestation must join the exact deployed configuration to the exact Neon provider resource before C2Z/C2W may PASS.

**IaC declaration is necessary but not sufficient evidence of the live external Neon binding.**

C3B is a design only. It creates no `.railway/railway.ts`, applies no plan, changes no Railway resource, and approves no live provenance authority.

## Canonical basis

- base main: `d2327ccae07c64436ed2e3bf3652f8f9a9194673`
- C2Y: Railway runtime + explicitly certified external Neon lineage
- C2Z: pure sanitized Railway→Neon binding producer
- C3A: current Railway structural external-database association unavailable; fail closed
- existing root `Dockerfile`: single-service build/runtime adapter remains the application packaging baseline

## Railway IaC facts relevant to this design

Railway's current IaC model:
- uses one project/environment authoring file such as `.railway/railway.ts`;
- can be imported with `railway config pull`;
- supports a read-only `railway config plan`;
- can save a plan artifact and later apply that exact artifact;
- binds the plan to the environment `configEtag` and the checked-out `.railway/` tree;
- rejects apply when environment state or the planned IaC tree drifted;
- supports `preserve()` for an existing Railway-managed value without placing the value in source;
- supports native resource references such as `db.env.DATABASE_URL` for a Railway-managed database;
- allows environment variables to contain non-secret desired-state metadata.

These platform capabilities do not automatically prove an external Neon credential's provider resource identity.

## Why a native Railway Postgres reference is not used

A form such as:

```ts
const db = postgres("Postgres");
DATABASE_URL: db.env.DATABASE_URL;
```

would provide a strong Railway-native structural reference, but it would bind the application to the existing Railway-managed Postgres service. That contradicts C2Y Path A and would silently turn the runtime migration into a database-authority migration.

C3B therefore does not use or relabel the current Railway `Postgres` service as Neon.

## External Neon credential boundary

For the selected architecture, the future IaC may preserve the existing credential:

```text
DATABASE_URL = preserve()
```

This has only one certified meaning: **keep Railway's current value without revealing it or writing it to source**.

It does not prove:
- provider = Neon;
- Neon project;
- branch;
- database;
- endpoint;
- timeline;
- provider resource ID;
- that the preserved credential matches any declared identity.

Therefore `preserve()` can solve secret custody, but not binding provenance.

## Proposed non-secret desired-state manifest

The future IaC design should declare a closed, non-secret binding manifest alongside the preserved credential.

Conceptual fields:

```text
SEO_ENGINE_DB_BINDING_SCHEMA=p8-8-w09c3b-v1
SEO_ENGINE_DB_PROVIDER=Neon
SEO_ENGINE_DB_PROVIDER_PROJECT_ID=<certified project id>
SEO_ENGINE_DB_BRANCH_ID=<certified branch id>
SEO_ENGINE_DB_DATABASE_NAME=<certified database>
SEO_ENGINE_DB_ENDPOINT_ID=<certified endpoint id>
SEO_ENGINE_DB_TIMELINE_ID=<certified timeline id>
SEO_ENGINE_DB_PROVIDER_RESOURCE_ID=<certified stable provider resource id>
SEO_ENGINE_DB_BINDING_MANIFEST_ID=<deterministic non-secret manifest id>
```

These fields are declarations of intended state. They must never be treated as self-authenticating provider observations.

The manifest must contain no:
- URL;
- hostname copied from a credential;
- username/password;
- token/key;
- connection-string fragment;
- credential hash/fingerprint/redaction/encoding.

## Deterministic manifest identity

`SEO_ENGINE_DB_BINDING_MANIFEST_ID` should be derived only from canonical non-secret fields and schema version using the repository's deterministic canonicalization rules.

It provides:
- desired-state versioning;
- reviewable diffs;
- stable linkage from an IaC plan to a declared provider identity.

It does **not** prove that `DATABASE_URL` points to that identity.

## Exact Railway guardrails

The future IaC authoring function must fail before producing desired state unless its Railway context matches the approved target:
- project ID `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment ID `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- environment name `production`.

The application service intended for adoption is:
- service ID `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- current name `seo-engine-shadow`.

Because Railway IaC authoring is primarily name/graph oriented, service-ID continuity must be independently checked in the plan/control plane before apply. A same-name replacement service is not equivalent.

## Import-before-author design

Do not hand-author an IaC graph from memory and apply it to the existing environment.

Future authorized transition sequence:
1. freeze canonical Git commit;
2. read current Railway project/environment/service identity;
3. reconcile the existing staged patch separately;
4. run `railway config pull` without `--include-variables`;
5. verify imported secrets are represented with `preserve()`;
6. verify existing resources/volumes are preserved and no destructive replacement is proposed;
7. commit the imported baseline on an isolated branch;
8. add only the reviewed non-secret C3B manifest/guards;
9. run `railway config plan --out <artifact>` with values hidden;
10. review the exact plan;
11. bind approval to the saved plan, environment `configEtag`, IaC tree, canonical Git commit, project/environment/service IDs;
12. only under separate explicit mutation authorization, apply that exact saved plan.

C3B does not authorize any of these live commands.

## Existing staged patch gate

Current Railway state contains a staged patch first observed before C3B, including:
- an application service resource update;
- staged `AUTH_PUBLIC_ORIGIN`.

No IaC adoption may silently absorb, overwrite, or commit that patch.

Before any `config pull`/plan intended for later apply:
1. enumerate the patch through non-secret metadata;
2. identify exact resource/config delta;
3. classify each item intended/unrelated;
4. choose explicitly to preserve, separately commit, or discard it;
5. obtain authorization for that exact decision;
6. re-read environment state and freeze the resulting config revision.

A plan generated while the patch's disposition is ambiguous is not eligible for Production approval.

## Out-of-band override detection

The binding must fail closed if desired state and live state can diverge undetected.

Required controls:
- saved Railway plan artifact;
- environment `configEtag` pin;
- exact `.railway/` Git tree pin;
- exact canonical Git commit pin;
- exact Railway project/environment/service identity;
- exact terminal deployment ID + snapshot after apply/deploy;
- post-deployment read-only drift plan using `--detailed-exit-code`;
- non-secret control-plane comparison of declared binding manifest fields;
- rejection of any unexpected direct dashboard variable/config change;
- rejection if `DATABASE_URL` is changed out of band without a new binding certification.

The last condition requires a safe Railway mechanism that can report **change/revision identity** for the opaque variable without revealing its value. If Railway cannot provide such a mechanism, external-Neon live binding remains unprovable even after IaC adoption.

## Required authoritative association — unresolved by IaC alone

A Production PASS still requires an authority outside the repository declaration to attest:

```text
exact Railway deployment/snapshot
  -> exact config/binding revision
  -> opaque DATABASE_URL slot/revision
  -> exact external Neon provider resource identity
```

Acceptable future mechanisms include:
- Railway native external-resource integration exposing a stable non-secret resource ID;
- Railway control-plane attestation exposing unresolved external binding identity;
- a provider/platform signed binding receipt;
- another reviewed mechanism that establishes association without exposing or deriving from credentials.

Until such a mechanism exists, C2Z `structuralReferenceTargetResourceId` and `providerResourceId` cannot be populated authoritatively from the IaC declaration alone.

## Neon-side authority

Separately, Neon read-only control-plane evidence must establish current:
- project ID;
- branch ID;
- database;
- endpoint/compute ID;
- timeline/lineage;
- provider resource identity;
- recovery/PITR state.

Historical candidate IDs remain inputs for investigation only. They must not be embedded into the future IaC manifest until independently re-certified.

## Deployment and snapshot pinning

After a separately authorized IaC apply/deployment, certification requires:
1. exact Git commit used by Railway;
2. terminal `SUCCESS`;
3. exact deployment ID;
4. exact snapshot ID;
5. exact IaC tree;
6. exact reviewed plan artifact;
7. matching environment/config revision;
8. healthcheck PASS;
9. mutation/provider/scheduler/worker gates remain disabled;
10. no traffic cutover.

A failed or waiting deployment cannot be certified.

## Rollback model

Rollback is split into configuration rollback and runtime rollback.

### Configuration rollback
Retain:
- pre-change IaC tree;
- pre-change environment/config revision;
- exact reviewed forward plan;
- separately reviewed rollback plan.

Rollback must restore the prior desired-state graph without copying credential values into source.

### Runtime rollback
Before traffic cutover, Replit remains the serving fallback. Railway rollback must not mutate Neon lineage, run migrations, or change DNS as a side effect.

### Database rollback
C3B does not define a database rollback because it does not authorize a database migration. The selected Neon lineage remains independently governed.

## Existing Railway Postgres shadow resource

The current Railway-managed `Postgres` service and its persistent volume:
- remain untouched;
- are not Production authority;
- are not referenced by the selected external-Neon application binding;
- must not be deleted during IaC adoption;
- should be imported/preserved in the baseline so adoption cannot accidentally destroy them.

Future cleanup is a separate destructive milestone only after:
1. external Neon binding is certified;
2. Railway runtime is certified;
3. rollback dependencies are understood;
4. data-retention requirements are resolved;
5. explicit deletion authorization is granted.

## Future IaC shape

The eventual implementation should conceptually resemble:

```ts
export default defineRailway((ctx) => {
  assertExactTargetContext(ctx);

  const app = service("seo-engine-shadow", {
    // Existing source/build/deploy settings imported and preserved.
    env: {
      DATABASE_URL: preserve(),

      // Non-secret desired-state declaration only:
      SEO_ENGINE_DB_BINDING_SCHEMA: "p8-8-w09c3b-v1",
      SEO_ENGINE_DB_PROVIDER: "Neon",
      SEO_ENGINE_DB_PROVIDER_PROJECT_ID: certified.projectId,
      SEO_ENGINE_DB_BRANCH_ID: certified.branchId,
      SEO_ENGINE_DB_DATABASE_NAME: certified.databaseName,
      SEO_ENGINE_DB_ENDPOINT_ID: certified.endpointId,
      SEO_ENGINE_DB_TIMELINE_ID: certified.timelineId,
      SEO_ENGINE_DB_PROVIDER_RESOURCE_ID: certified.providerResourceId,
      SEO_ENGINE_DB_BINDING_MANIFEST_ID: manifestId,
    },
  });

  // Existing Railway Postgres must be preserved/imported, not selected as app DB.
  return project("SEO ENGINE", { resources: [/* imported graph */] });
});
```

This is illustrative architecture, not apply-ready code. `certified.*` values must come from a separately reviewed repository artifact created only after live Neon identity certification.

## Activation gates

IaC adoption does not authorize application activation.

Before any Production traffic or Stage 0:
1. C3B implementation separately reviewed;
2. staged patch resolved;
3. Neon identity independently certified;
4. external binding association authority available;
5. C2Z PASS;
6. C2W PASS with separately approved provenance;
7. fresh C2H-equivalent read-only schema/preflight PASS;
8. successful Railway deployment;
9. recovery/rollback certified;
10. explicit activation authorization.

## C3B conclusion

Railway IaC is valuable for deterministic desired state, drift detection, saved-plan review, and secret-preserving adoption.

It **does not by itself close the external Neon provenance gap** because `preserve()` intentionally hides the credential and Railway's native resource-reference semantics apply most strongly to Railway-owned resources.

The correct design is therefore:
- adopt IaC for deterministic runtime/configuration control;
- keep credentials opaque;
- declare intended Neon identity non-secretly;
- require a separate authoritative cross-side association before attestation PASS;
- fail closed if that association cannot be obtained.

## Next milestone

**W09-C3C — Railway IaC offline implementation + deterministic binding-manifest contract.**

C3C may add repository-only:
- `.railway/railway.ts` scaffolding that cannot apply accidentally;
- a deterministic non-secret binding-manifest schema/builder/verifier;
- synthetic tests;
- CI validation.

C3C must not contain historical Neon IDs as certified values and must not apply or plan against live Railway until separately authorized.

## Hard exclusions

No `railway config pull/plan/apply`, no live IaC import, no Railway mutation/deployment/redeploy/cancel, no staged-patch acceptance/discard, no variable values, no Secrets, no connection strings, no Neon mutation or DB/SQL, no migration, no Replit mutation, no scheduler/worker/provider activation, no DNS/cutover, no Stage 0, and no UGP integration.

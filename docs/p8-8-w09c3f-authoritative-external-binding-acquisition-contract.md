# P8.8 W09-C3F — Authoritative external-binding association acquisition contract

## Status

Repository-only acquisition contract. C3F performs no live Railway or Neon observation and grants no runtime authority.

Canonical base: `edb80b1288ecb0bc44e3d8ada1a5710bdbeea271`.

## Purpose

C3E certified a zero-drift Railway IaC baseline but deliberately left the external-Neon association unproved. C3F converts that residual gap into a field-by-field acquisition contract for the existing C2Z producer.

The governing rule is strict: **a secret or a fact derived from a secret is not provenance evidence**.

## Frozen facts inherited from C3E

C3F may rely on these already-certified Railway-side facts:
- project ID `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment ID `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service ID `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- repository `intssere/SEO_ENGINE`, branch `main`;
- C3D imported-IaC hash `F342D244C350D6109378651807BF6C70ECC6C37150C29A858D249C36FDE89818`;
- C3D plan artifact hash `E1545D064EF4B72AF3C0BD859D21BB85EE5F84323305CCF858AA21F19E6D6454`;
- C3D source tree `sha256:dfa2b6ac6c4491c06d1793c1c0e7ee996899f39cee3c27b7747830b45ea1f6ca`;
- C3D config etag `54374c11f22902bc0ecee0e9b247bfcf0c7d325653474b484d2b4d0112f97f49`;
- C3D change-set hash `sha256:afd0e2a6e0e497acf5a7048efbe8788a610c0e7a6e1e8c770eb0be917276676f`;
- the IaC plan had no changes, no diagnostics, and was non-destructive;
- `DATABASE_URL` was represented only as `preserve()`.

These facts establish IaC-visible configuration continuity. They do not establish an external Neon target.

## Evidence classes

Every acquired field must be classified as one of:

- **AUTHORITATIVE** — emitted by the control plane that owns the fact, with exact resource/revision identity and bounded observation time.
- **CROSS_ATTESTED** — emitted by a separately reviewed platform/provider mechanism that authoritatively binds two control-plane identities.
- **DECLARATIVE_ONLY** — desired-state metadata or repository constants; useful for comparison but not self-authenticating.
- **HISTORICAL_ONLY** — previously observed identity that has not been freshly re-certified.
- **UNAVAILABLE** — no accepted current acquisition mechanism.
- **REJECTED_SECRET_DERIVATION** — would require reading, parsing, hashing, redacting, fingerprinting, resolving, or otherwise deriving identity from credential material.

Only AUTHORITATIVE or CROSS_ATTESTED evidence may populate live C2Z identity fields.

## C2Z field acquisition matrix

| C2Z field | Current status | Required authority |
| --- | --- | --- |
| schemaVersion | AUTHORITATIVE_LOCAL_CONTRACT | frozen C2Z implementation |
| railwayProjectId | AUTHORITATIVE | Railway control plane; already C3E-certified |
| railwayEnvironmentId | AUTHORITATIVE | Railway control plane; already C3E-certified |
| railwayServiceId | AUTHORITATIVE | Railway control plane; already C3E-certified |
| deploymentId | UNAVAILABLE_FOR_PASS | fresh Railway terminal SUCCESS deployment observation |
| snapshotId | UNAVAILABLE_FOR_PASS | same successful Railway deployment observation |
| deploymentCommitSha | UNAVAILABLE_FOR_PASS | Railway deployment metadata, exact canonical commit |
| configRevisionId | PARTIAL | C3D config etag is certified baseline identity; a live binding certification must prove the successful deployment consumed the same revision |
| bindingRevisionId | UNAVAILABLE | Railway-native opaque-variable/binding revision or cross-platform attestation |
| structuralReferenceId | UNAVAILABLE | Railway-native unresolved reference identity or attestation |
| structuralReferenceTargetResourceId | UNAVAILABLE | authoritative Railway-side external-resource target identity |
| provider | DECLARATIVE_ONLY | C2Y/C3B selected Neon architecturally; live binding still unproved |
| providerProjectId | HISTORICAL_ONLY | fresh Neon control-plane observation required |
| branchId | HISTORICAL_ONLY | fresh Neon control-plane observation required |
| databaseName | HISTORICAL_ONLY | fresh Neon control-plane observation required |
| timelineId | HISTORICAL_ONLY | fresh Neon control-plane observation or certified lineage-continuity mechanism |
| endpointId | HISTORICAL_ONLY | fresh Neon control-plane observation required |
| providerResourceId | UNAVAILABLE | stable Neon-side identity suitable for exact cross-side comparison |
| observedAt | CALLER_BOUND | explicit observation time, freshness-bounded |
| provenanceKind | NOT_APPROVED | separately reviewed provenance mechanism |
| provenanceAuthority | NOT_APPROVED | separately reviewed authority identifier |

## Railway-side acquisition contract

A future Railway observation may PASS only if it returns non-secret metadata for the exact project/environment/service and establishes:

1. a terminal `SUCCESS` application deployment;
2. exact deployment ID;
3. exact snapshot ID;
4. exact deployed Git commit;
5. exact configuration revision consumed by that deployment;
6. an opaque database-binding revision identifier;
7. a structural reference identifier;
8. the structural reference's external target resource identifier;
9. no pending deployment/apply/config workflow that makes the observation unstable.

The acquisition must not request or render the value of `DATABASE_URL`.

A successful application connection is not a substitute for items 6–8.

### Railway PASS rule

Railway-side binding acquisition is PASS only when the platform itself, or a separately approved attestation mechanism, emits the association:

```text
deploymentId + snapshotId + configRevisionId
  -> bindingRevisionId
  -> structuralReferenceId
  -> structuralReferenceTargetResourceId
```

If the current Railway API/CLI exposes only a variable name, a preserved value, or a rendered value, the result is **UNAVAILABLE**, not inferred.

## Neon-side acquisition contract

A separately authorized read-only Neon control-plane observation must establish current:

1. provider = Neon;
2. project ID;
3. branch ID;
4. database name;
5. endpoint/compute ID;
6. timeline/lineage identity, or an independently certified exact lineage-continuity assertion;
7. stable provider resource ID suitable for the Railway join;
8. current resource state;
9. recovery/PITR state required by the Production recovery gate;
10. explicit observation time.

No SQL or connection string is needed or accepted.

Historical candidate identifiers may be used only as lookup selectors under explicit authorization. They are not evidence until the provider returns current authoritative metadata.

### Neon PASS rule

Neon-side acquisition is PASS only if the provider control plane returns the current resource hierarchy and stable identity without credential material and the hierarchy is internally consistent.

A failed lookup is not proof of absence and must not trigger automatic fallback to credential inspection.

## Exact cross-side join

C2Z live input may be materialized only when:

```text
Railway.structuralReferenceTargetResourceId
  === Neon.providerResourceId
```

and both values were independently acquired from approved authoritative mechanisms.

Equality of hostnames, database names, schema shape, table count, connectivity, or historical identifiers is insufficient.

## Explicitly rejected shortcuts

The following are permanently ineligible for C3F provenance:

- reading or displaying `DATABASE_URL`;
- parsing a hostname from a connection string;
- hashing/fingerprinting/redacting/encoding a credential or credential-derived hostname;
- comparing runtime environment dumps;
- SQL such as `current_database()`, server address, version, or catalog queries;
- treating `preserve()` as a provider reference;
- treating repository desired-state manifest fields as provider observation;
- treating the coexisting Railway-managed Postgres resource as Neon;
- inferring provider identity from successful connectivity;
- schema/table similarity;
- screenshots of credential-bearing connection details;
- historical candidate IDs without current provider confirmation.

## Minimum missing mechanism

Current evidence leaves one irreducible Railway-side gap:

**an authoritative non-secret mapping from the exact deployed opaque database binding to a stable external-provider resource identity.**

Therefore the minimum acceptable mechanism is one of:

1. Railway adds/exposes unresolved external-resource reference metadata with stable target resource ID and binding revision;
2. Railway emits a signed/sanitized deployment-binding attestation containing those identities;
3. Railway and Neon expose compatible non-secret integration/resource IDs that can be independently joined;
4. a separately reviewed platform mechanism produces the same association with cryptographic or control-plane authority.

If none exists, C2Z must remain fail closed. IaC adoption alone cannot manufacture the missing association.

## Bounded future authorization packets

### Packet A — Railway non-secret binding capability observation

`AUTHORIZE W09-C3F-A RAILWAY NON-SECRET BINDING CAPABILITY OBSERVATION — read only the exact SEO ENGINE Railway project 52265e29-921b-4652-ac0d-9da4e5e69936, production environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298, and application service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90; inspect only non-secret deployment/config/reference metadata sufficient to determine whether Railway exposes deployment→config/binding revision→external target resource identity; variable names are allowed but variable values, rendered references, secrets, logs, shell, agent, config pull/plan/apply, patch mutation, deploy/redeploy/cancel, DB/SQL, and automatic retry are forbidden.`

PASS does not mean the external target is Neon unless the authoritative metadata itself proves that fact.

### Packet B — Neon current identity observation

`AUTHORIZE W09-C3F-B NEON CURRENT IDENTITY OBSERVATION — perform exactly one bounded read-only Neon control-plane observation using the separately supplied candidate project selector only to locate current metadata; return only non-secret project/branch/database/endpoint/timeline/resource identity and recovery/PITR metadata; no connection string, password/token, SQL, DB session, mutation, branch/endpoint creation or deletion, credential rotation, Railway action, or automatic retry on authorization/not-found/tool ambiguity.`

This packet is not reusable after execution.

### Packet C — C2Z/C2W materialization

Only after A and B independently PASS:

`AUTHORIZE W09-C3F-C BINDING ATTESTATION MATERIALIZATION — using only the exact sanitized authoritative Railway and Neon evidence certified by W09-C3F-A and W09-C3F-B, materialize one C2Z producer input, require exact structuralReferenceTargetResourceId===providerResourceId, then evaluate C2Z and C2W purely in memory; no live platform/provider call, secret access, DB/SQL, persistence, deployment, mutation, retry, or provenance self-approval.`

Packet C must fail before C2Z invocation if either evidence packet is stale, incomplete, differently scoped, or lacks the exact cross-side resource-ID join.

## Sequencing

The safe sequence is:

```text
C3F-A Railway capability/binding observation
  -> if PASS, C3F-B Neon current identity observation
  -> if PASS, compare exact resource IDs
  -> C3F-C pure C2Z/C2W materialization
  -> only then consider a fresh C2H-equivalent Production read-only preflight
```

If C3F-A returns UNAVAILABLE because Railway cannot emit the structural association, stop. A Neon call cannot repair a missing Railway-side join.

## Relationship to the staged AUTH_PUBLIC_ORIGIN patch

The staged patch remains outside C3F. None of A/B/C accepts, discards, deploys, or rewrites it.

A Railway observation must distinguish existing staged state from deployed state and fail closed if that distinction cannot be made without mutation.

## Relationship to the Railway-managed Postgres shadow resource

The existing Railway Postgres service and volume remain shadow/staging resources. Their presence is not evidence for the selected external-Neon architecture and they must not be deleted or repurposed by C3F.

## C3F conclusion

C3D/C3E closed the IaC-baseline uncertainty. The remaining blocker is narrower: the current evidence does not contain an authoritative non-secret external-target identity for the deployed opaque database binding.

C3F therefore converts the next work into a strict acquisition sequence rather than further IaC changes.

No live C2Z input may be constructed until both sides independently provide the exact joinable resource identity.

## Hard exclusions

No Railway config pull/plan/apply, staged-patch mutation, deploy/redeploy/cancel, variable values, rendered references, logs, shell/agent secret discovery, Neon live call without Packet B authorization, DB/SQL, migration, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.

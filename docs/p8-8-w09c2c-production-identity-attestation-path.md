# P8.8 W09-C2C — Production Database Identity Attestation Path

**Issue:** #529  
**Status:** SPECIFICATION / NO PRODUCTION DATABASE SESSION AUTHORIZED  
**Baseline:** `13fd174cf5e58f672e9adee1b4b4576062d66852`

## 1. Purpose

W09-C2B established the current Production publication host but could not freshly prove the database lineage behind it. W09-C2C freezes the evidence contract and operator procedure required to prove that identity before any Production catalog access.

This milestone is identity-attestation design only. It does not authorize execution of the operator procedure.

## 2. Environment boundary

- GitHub `main` is canonical.
- The current Production publication is the Replit `SEO_ENGINE` application at `https://dsseoengine.replit.app`.
- Railway SEO ENGINE infrastructure is frozen staging/shadow, regardless of Railway environment labels.
- The separate UGP/development initiative remains isolated from `main`.
- Neither Railway staging nor the isolated initiative is a source of Production database authority.

## 3. Historical candidate lineage

P3.6 historically certified:

- database: `neondb`;
- Neon project: `late-sunset-42762033`;
- Neon branch: `br-super-frost-b341k9ms`;
- Neon timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`;
- historical Replit Production read-only endpoint: `ep-lucky-river-b3sh13is`;
- historical writable migration compute: `ep-muddy-mouse-b34bjs0w`.

These values are comparison inputs only. They are not current facts until freshly attested.

## 4. Identity layers

A valid W09-C2 identity proof must distinguish four layers.

### A. Publication identity

Prove the current application publication:

- Replit application identity;
- public Production URL;
- publication/deployment identity when exposed;
- current successful publication state.

Publication identity alone does not prove database identity.

### B. Binding identity

Prove that the current Production publication is bound to one specific database resource.

Acceptable binding evidence must identify the bound resource without revealing a credential or connection string. A variable name such as `DATABASE_URL`, by itself, is insufficient.

### C. Database resource identity

For the bound resource, prove the current tuple:

- provider;
- provider project/account/resource ID;
- database name;
- branch/timeline/equivalent immutable lineage ID;
- endpoint/compute identity;
- relationship of endpoint/compute to the project/branch/database lineage.

### D. Recovery identity

Prove that recovery/PITR evidence belongs to the exact resource tuple certified in layers B and C. Recovery evidence for a sibling branch, Development database, Railway staging database, or historical resource is invalid.

## 5. Evidence-source hierarchy

Evidence is accepted in this order.

### Tier 1 — direct platform resource metadata

Preferred. Read-only platform metadata that exposes both:

1. the current Replit Production publication/database binding; and
2. the database provider resource identifiers.

No secret value may be requested or displayed.

### Tier 2 — provider control-plane metadata

Acceptable only when the resource can first be bound unambiguously to the current Production publication. Provider metadata may then prove project, branch/timeline, database, endpoint/compute and later recovery state.

Provider metadata for the historical P3.6 project is not sufficient unless the current Replit Production binding is independently shown to target that resource.

### Tier 3 — bounded operator identity attestation

Required when ordinary Replit metadata cannot expose the binding/resource tuple.

The operator may inspect already-configured Production resource metadata through an authorized control-plane or shell surface, but must not:

- reveal/copy the full connection string;
- reveal username/password/token/secret;
- open a PostgreSQL session;
- execute SQL;
- alter variables or credentials;
- restart/redeploy;
- mutate the database or hosting resource.

The operator output must contain only sanitized identity fields required by this specification.

## 6. Frozen operator output

A later separately authorized identity-attestation execution must return exactly these semantic fields:

```text
publication_host
publication_deployment_id
binding_status
database_provider
database_project_id
database_branch_id
database_timeline_or_equivalent_id
database_name
database_endpoint_or_compute_id
historical_lineage_match
secret_material_exposed
database_session_opened
state_mutated
attestation_result
```

Allowed status values:

- `binding_status`: `proved | disproved | unavailable | ambiguous`
- `historical_lineage_match`: `exact | changed | unproved`
- `secret_material_exposed`: must be `false`
- `database_session_opened`: must be `false`
- `state_mutated`: must be `false`
- `attestation_result`: `pass | fail_closed`

No connection URI, host credential, password, token, API key, or secret-bearing environment value belongs in the evidence packet.

## 7. Gate A PASS criteria

Gate A may become PASS only if all are true:

1. current Production publication identity is established;
2. the publication-to-database binding is proved rather than inferred;
3. provider/project identity is explicit;
4. branch/timeline/equivalent lineage identity is explicit;
5. database name is explicit;
6. current endpoint/compute identity is explicit;
7. endpoint/compute membership in the same project/branch/database lineage is proved;
8. Development and Railway staging cannot be confused with the target;
9. historical P3.6 equality is classified as `exact` or `changed`, never assumed;
10. no secret material is exposed;
11. no database session is opened;
12. no state is mutated.

Any missing or ambiguous item yields `fail_closed`.

## 8. Lineage outcomes

### Exact

If the fresh tuple equals the historical P3.6 tuple, record `historical_lineage_match=exact`. This certifies identity continuity only. It does not certify current recovery state or schema state.

### Changed

If any identity-defining project/branch/timeline/database field differs, record `historical_lineage_match=changed` and stop. The new lineage requires its own recovery and pre-schema evidence before catalog access.

Endpoint/compute rotation alone is not necessarily a lineage change if control-plane evidence proves that the new endpoint belongs to the same project/branch/database lineage.

### Unproved

If the binding or tuple cannot be established without prohibited access, record `historical_lineage_match=unproved` and stop. Do not weaken the gate.

## 9. Execution authorization boundary

This specification does **not** authorize Tier 3 execution.

A future authorization must explicitly name W09-C2C identity-attestation execution and permit only the sanitized metadata procedure above.

That authorization is separate from:

- Production catalog/read-only SQL authorization;
- recovery/PITR certification;
- migration 0005/0006/0007 authorization;
- W09-C Stage 0 Production read authorization.

Identity-attestation success grants none of those authorities.

## 10. Post-attestation progression

If Gate A passes:

1. freeze the attested identity tuple in evidence;
2. certify current recovery/PITR against that exact tuple;
3. separately authorize bounded read-only Production catalog inspection;
4. evaluate exact pre-schema/no-drift state;
5. prove runtime/write fences;
6. only then consider Gate E migration authorization.

No step may borrow authority from the previous step.

## 11. Explicit non-authorization

W09-C2C specification work authorizes no Production DB session or SQL, catalog query, DDL/DML/migration, repair/drop statement, connection-string/secret inspection or disclosure, credential/config/gate mutation, Railway staging mutation, deployment/publication/restart, provider/public-site request, scheduler/worker/runtime activation, W03–W07 execution, Task #51/#53/#54 execution, W09-C Stage 0, provider-read addendum, W10, or UGP reconciliation/merge.

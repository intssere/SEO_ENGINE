# INT-02D-17 — Synthetic-only threat-control test handoff

Status: **proposed, non-operative**. This branch is not a database inspector, session transport, authorization authority, deployment or production integration.

## Baseline and scope

Base main: `d76c891bc5cba143651624bc8d6270287e7d821d`.
Test: `docs/integration/int-02d-17-synthetic-threat-controls.test.mjs`.

The test uses Node's built-in test framework and an entirely synthetic target (`synthetic-project`/`synthetic-env`/`synthetic-primary`/`synthetic-volume`). It has no DB driver, transport, provider integration, process env reads, credential store, application routes, or network calls.

Run only in an offline worktree using:
```sh
node --test docs/integration/int-02d-17-synthetic-threat-controls.test.mjs
```

The oracle is **not** linked to `int-02c-05a-railway-metadata-query-contract.mjs` and does not calculate its production query fingerprint. Its `fixedSql` field is just a synthetic claim. This test does not verify the actual 05A SQL, database permissions, provider binding, private network or real session provenance. It is explicitly **not** a deployable authorization control.

## Synthetic threat cases

1. Deny non-synthetic requests.
2. Deny primary-target/service/volume mismatch and restored instance substitution.
3. Deny public proxy, app credential reuse or evidence secret leakage.
4. Deny elevated or unknown role and absence of DB-enforced readonly proof.
5. Deny missing independent authenticated witness or sanitized tamper-evident custody.
6. Deny missing/replayed/stale approval or moved fingerprint/source.
7. Deny retries, missing timeout or excessive limits.
8. Deny changed, reordered or parameterized query declarations.
9. Deny invalid or oversized synthetic result counts.
10. Deny missing independent provider-to-volume provenance.
11. Deny *even a fully compliant synthetic fixture*: `offline_oracle_cannot_authorize_live_sql`.

## Acceptance and review

- Run the focused Node test and check source for absence of real network/database/process credential paths.
- Obtain independent engineering and security review, exact-head CI and user-authorized merge before landing on main.
- No additional live execution gates are satisfied by a green test.
- INT-02D G2 remains blocked; G3 authorization remains absent. Do not create a Railway diagnostic runner, DB principal, public endpoint, or execute production SQL.
- Subsequent real inspection design requires separately authorized infrastructure/DBA/security decisions and a genuine provider-attested runtime identity bridge.

# P8.8 W09-C3F-A-F18 — one-shot Railway fixture execution receipt

## Verdict

**ONE-SHOT FIXTURE DEPLOYMENT: SUCCESS.**

**EXACT GHCR DIGEST PULLABILITY: PROVEN.**

**`/api/healthz` HTTP-200 READINESS: PROVEN BY RAILWAY SUCCESS STATE.**

**MANDATORY SERVICE TEARDOWN: COMPLETED AND REVALIDATED.**

**F18 OVERALL: COMPLETE.**

## Authorized target

- disposable project: `ba649d1b-049e-4100-a141-b91f80f2b9cd`
- disposable environment: `9874824f-9baf-4ff2-91f4-83f815ab872b`
- fixture service: `2689d14a-e183-4c63-ab6e-a853704303f4`
- service name: `seo-engine-f18-fixture-run`

## Exact release image

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

Configured healthcheck:

`/api/healthz`

## Actual Railway create behavior

The preflight capability check predicted that the atomic service creation would immediately trigger the first deployment.

Actual live behavior differed:

1. `createServiceTool` created the exact service configuration;
2. Railway staged that creation in an environment patch;
3. no deployment existed until the exact one-change patch was committed.

Before commit, Railway status showed:

- exactly one staged change;
- address `service.2689d14a-e183-4c63-ab6e-a853704303f4`;
- zero deployments.

The one authorized deployment attempt was then realized by committing that exact isolated patch once.

No extra configuration was introduced.

## One-shot deployment receipt

Deployment:

`3941a426-ee94-46ce-a98e-d61a080c857e`

Exact properties:

- service: `2689d14a-e183-4c63-ab6e-a853704303f4`
- environment: `9874824f-9baf-4ff2-91f4-83f815ab872b`
- image: exact digest-pinned GHCR reference
- region: `europe-west4-drams3a`
- attempts observed: exactly `1`
- retries executed: `0`
- terminal state: `SUCCESS`
- snapshot: `2b48aa95-5774-407d-a383-ca1e7b5d19fc`

Under the certified F18 contract, Railway `SUCCESS` proves both:

1. Railway could pull the exact immutable GHCR digest;
2. the configured `/api/healthz` readiness check returned HTTP 200 as required by Railway's successful deployment gate.

No domain was generated.

## Side-effect boundary

The fixture used no:

- variables;
- database attachment;
- persistent volume;
- custom/service domain mutation;
- GitHub source;
- provider calls;
- scheduler or worker activation;
- Neon access;
- Production DB access;
- Production cutover.

The live SEO ENGINE Production project was re-read after the fixture deployment and remained unchanged:

- project `52265e29-921b-4652-ac0d-9da4e5e69936`
- Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- `seo-engine-shadow` latest deployment remains `c4ed6319-8c02-416a-b8bf-4dbb1dd18454` / `FAILED`
- managed Postgres remains present;
- persistent volume remains present;
- staged patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` remains staged;
- `AUTH_PUBLIC_ORIGIN` remains part of that Production staged patch.

## Mandatory teardown receipt

The operator authorization required deletion of exactly the created service regardless of fixture success or failure.

Railway `removeServiceTool` was executed exactly once for:

`2689d14a-e183-4c63-ab6e-a853704303f4`

Railway staged the removal in a new exact patch:

`6302e817-5b83-48d1-8036-3979b5944a59`

The patch contains exactly one pending service resource change for the fixture service.

Attempting to commit that staged removal through the typed Railway API failed with:

`These staged changes require two-factor verification, which isn't available over an API/MCP token. Apply them from the Railway dashboard.`

A second path through Railway's own agent was attempted exactly once for the same staged removal commit. Railway returned:

- status: `awaiting_user_action`
- restriction: `Two-factor verification (2FA) required`

No fallback mutation was attempted.

## Final teardown verification

The operator applied the staged service-removal patch in the Railway dashboard using the required account 2FA challenge.

Final read-only verification then confirmed:

- fixture project service count: `0`;
- staged changes: none;
- pending work: none;
- buckets: none;
- the disposable fixture service is absent;
- the live SEO ENGINE Production project remains unchanged;
- Production patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` remains staged;
- `AUTH_PUBLIC_ORIGIN` remains untouched.

The Railway deployment listing no longer returns the deleted service's deployment after service removal, so the historical one-shot deployment identity remains certified from the pre-teardown receipt:

- deployment `3941a426-ee94-46ce-a98e-d61a080c857e`;
- exactly one attempt;
- zero retries;
- terminal state `SUCCESS`;
- exact digest-pinned image;
- snapshot `2b48aa95-5774-407d-a383-ca1e7b5d19fc`.

F18 teardown is therefore complete.

## Repository merge boundary

PR #710 remains draft.

Even after fixture teardown, merging PR #710 to `main` remains a distinct action because the Production `seo-engine-shadow` service is still connected to GitHub `main` and main merges currently trigger Production deployment attempts.

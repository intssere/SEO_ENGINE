# P12.2-L1A-E6 — disposable credential-bearing Railway runner

## Status

**REPOSITORY RUNNER IMPLEMENTED / NOT DEPLOYED / NO PRODUCTION SQL EXECUTED.**

E6 is the concrete one-shot runtime wrapper for canonical E5.

## Railway runtime binding

The disposable service must obtain identity and credentials only through Railway runtime/reference variables:

- `RAILWAY_PROJECT_ID` — platform-provided for the runner;
- `RAILWAY_ENVIRONMENT_ID` — platform-provided for the runner;
- `P12_2_L1A_POSTGRES_SERVICE_ID=${{Postgres.RAILWAY_SERVICE_ID}}` — rendered from the exact Postgres service in the same environment;
- `DATABASE_URL=${{Postgres.DATABASE_URL}}` — rendered from that same Postgres service;
- `P12_2_L1A_AUTHORIZATION_LITERAL` — exact already-approved E2/E3/E5 authorization literal.

The runner does not query Railway APIs and requires no Railway API token.

## Execution behavior

- exactly one E6 call;
- E6 invokes canonical E5 exactly once;
- E5/E4 verifies actual runtime project/environment/Postgres service identity;
- executor accepts only the canonical E3 `psql` command shape;
- executable path is fixed to `/usr/bin/psql`;
- shell execution is disabled;
- DATABASE_URL is passed only in the child environment;
- no credential is placed in argv;
- stdout/stderr are bounded;
- zero retries;
- zero fallback transport;
- runner exits after completion/failure;
- no HTTP server, scheduler or worker exists.

## Image

`Dockerfile.p12-2-l1a-observation` is a dedicated one-shot image definition. It installs only the PostgreSQL client needed by E3 and copies only the bundled observation CLI into the runtime image.

The image is not a Production application replacement.

## Required live deployment boundary

A later live step must separately authorize all Railway mutations needed to create/configure/run the disposable service.

That future packet must fix at minimum:

- exact project/environment;
- exact GitHub source SHA/tree or immutable runner image digest;
- no GitHub autodeploy;
- no domain;
- no volume;
- no cron;
- restart policy NEVER;
- exact two Postgres reference variables above;
- exact authorization literal variable;
- exact start command/image;
- one deployment only;
- post-run receipt collection;
- teardown/disabling disposition after receipt collection.

Deployment authorization is distinct from the already-approved database one-shot authorization.

## One-shot safety

The existing DB one-shot remains unconsumed until the first certified SELECT is actually invoked.

A runner deployment that fails before the E5 executor invocation does not consume it.

After the first SELECT invocation, no retry/redeploy/restart may be treated as authorized by the original one-shot.

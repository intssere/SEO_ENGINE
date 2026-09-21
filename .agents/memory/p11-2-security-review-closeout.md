# P11.2 — security review closeout

## Status

P11.2 is complete and certified as deterministic/offline security review and bounded engineering-source hardening.

It does not authorize or perform production/public-site security scanning, exploitation, credential access/rotation, provider/OAuth activity, Production DB mutation, scheduler/worker activation, runtime/deployment mutation, autonomous execution, deployment or publication.

## Canonical implementation record

- Issue: #345 — `P11.2 — offline security review and bounded source hardening`
- Implementation PR: #346 — `P11.2 — offline security review and bounded source hardening`
- Base SHA/tree: `841c10c4a0fbe06fcd97d3c3fbcc84357dd18790` / `12036420976ac3f1ddc9413a070b3c71533abdd4`
- Exact tested implementation head/tree: `6b1380efebccea980123f293b550e599b65b22ba` / `e42872ed4887c48698ddd0358089931f166a4e9a`
- Exact-head CI: #596 / run `35574991295` — success
- Implementation merge/tree: `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb` / `e42872ed4887c48698ddd0358089931f166a4e9a`
- Post-merge main CI: #597 / run `35579001011` — success

## What P11.2 hardened

- Replaced direct first-value `X-Forwarded-For` parsing in auth audit/rate-limit paths with Express-resolved `req.ip` under the existing one-hop trusted-proxy policy.
- Added fail-closed normalization for OAuth/OIDC return targets: only bounded local paths survive; absolute/protocol-relative URLs, backslashes, ASCII controls, malformed/empty and overlong values fall back to `/`.
- Disabled Express `X-Powered-By`.
- Added COOP `same-origin` and CORP `same-origin` while preserving CSP, HSTS-in-production, frame/content/referrer and permissions headers.
- Registered middleware security tests in the normal API test command.
- Added a network-free posture contract protecting pnpm release-age controls, built-dependency allowlist, frozen-lockfile CI, read-only workflow permissions, no `pull_request_target`, query stripping, auth/cookie redaction, trusted-proxy identity handling and source-level header invariants.
- Pinned CI GitHub Actions to immutable 40-character commit SHAs.
- Preserved the existing competitor SSRF transport without broadening or activating it.

## Existing SSRF boundary retained

The competitor transport remains covered by deterministic tests for:

- URL/protocol validation;
- public-IP-only DNS resolution;
- connection pinning to validated IPs;
- DNS rebinding resistance;
- disabled ambient proxy routing;
- manual redirect handling with revalidation;
- rejection of credential-bearing targets;
- rejection of forwarded authorization/cookie headers;
- rejection of request bodies and unsupported methods;
- abort semantics before resolver/executor work.

P11.2 made no real competitor/provider request.

## Supply-chain and secret posture

P11.2 preserves:

- `pnpm install --frozen-lockfile`;
- `minimumReleaseAge: 1440`;
- explicit `onlyBuiltDependencies`;
- GitHub Actions `contents: read` permissions;
- absence of `pull_request_target`;
- immutable Action SHA pins;
- committed lockfile and reviewed build-tool pin/overrides;
- pino redaction of authorization/cookie/set-cookie fields;
- query-string removal from ordinary HTTP request logs.

No secret value was retrieved, printed, rotated or changed.

## Certification

GitHub exact-head CI #596 and post-merge main CI #597 both passed the complete gate set, including:

- schema/bootstrap validation;
- all workspace tests;
- P11.2 security/posture tests;
- existing SSRF transport tests;
- Ubuntu/Chromium Playwright;
- full typecheck;
- full build and P11.1 budget gate.

Replit was Git-only fast-forwarded to the implementation merge/tree:

- branch: `main`
- HEAD/tree: `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb` / `e42872ed4887c48698ddd0358089931f166a4e9a`
- origin/main: exact same SHA/tree
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- clean worktree.

Using existing dependencies only, Replit validation passed:

- recursive workspace tests: 1,182 reported passes / 0 failures;
- full typecheck;
- full build;
- P11.1 budget gate;
- `git diff --check`.

Replit P11.1 build diagnostics remained:

- JS: `589,405` raw / `169,557` gzip;
- CSS: `179,974` raw / `29,929` gzip;
- `P11_1_BUDGET_PASS`.

Existing tooltip/sheet sourcemap location warnings and the Vite >500 kB advisory remain non-fatal. No Replit system-package/browser installation was performed; GitHub CI remains the canonical Chromium runner.

## Residual risks and limitations

P11.2 is not a claim that no vulnerability exists.

- No live vulnerability/advisory service was queried.
- The CI PostgreSQL service remains referenced by the reviewed tag `postgres:17-alpine`, not a registry digest.
- CSP retains `style-src 'unsafe-inline'` and broad HTTPS image loading for current frontend compatibility.
- `trust proxy = 1` is correct only for the reviewed single-proxy topology; topology changes require re-review.
- Final production security acceptance must re-check current dependency advisories, deployed headers/configuration and all remaining P11/P12 criteria.

## Safety and publication

P11.2 performed no:

- production/public-site security scan or exploitation attempt;
- credential/secret retrieval or rotation;
- live OAuth/provider request;
- Production DB read/write/DDL/DML;
- dependency or lockfile change;
- scheduler/worker/retry activation;
- P9.8 implementation/activation;
- Task #51/#53/#54 execution;
- provider/public-site mutation;
- runtime/deployment configuration change;
- deployment;
- publication.

Published production remains the separately certified Task #73 application source.

## Next safe boundary

The next safe engineering boundary is:

**P11.3 — observability: metrics/logs/traces/alerts/job health**

Generic continuation may define deterministic/offline observability contracts and local/synthetic instrumentation/regression tests. It does not authorize production telemetry or alert credentials/sinks, Production DB mutation, provider/public-site activity, scheduler/worker activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

# P11.2 — Offline security review and bounded source hardening

## Scope

P11.2 reviews the current engineering tree across:

- authentication and authorization;
- CSRF and same-origin controls;
- SSRF/network-target controls;
- CSP and HTTP security headers;
- secret/log handling;
- npm/pnpm supply-chain controls.

This milestone is source/static/test hardening only. It does not scan or attack production, retrieve secrets, rotate credentials, contact providers, mutate Production data/schema, change deployment/runtime configuration, execute Task #51/#53/#54, activate P9.8, deploy or publish.

## Review baseline

Canonical start:

- GitHub main: `841c10c4a0fbe06fcd97d3c3fbcc84357dd18790`;
- tree: `12036420976ac3f1ddc9413a070b3c71533abdd4`;
- P11.1 complete and certified;
- Replit exact-aligned, `0/0`, clean.

## Authentication and authorization

Existing controls retained:

- Google OIDC authorization-code flow;
- state, nonce and PKCE S256;
- exact configured public origin;
- invite/allowlist-only access;
- server-side roles `viewer < operator < admin`;
- server-side PostgreSQL sessions;
- hashed session and CSRF tokens;
- session expiry/idle timeout/rotation semantics;
- protected operational API after auth routes;
- explicit high-control role requirements;
- rate limiting on auth and unsafe mutation paths.

P11.2 hardens post-login return paths. Only bounded same-origin application paths are retained. Absolute/protocol-relative targets, backslashes, ASCII control characters, malformed values, empty values and overlong values fail closed to `/`.

## Client IP and proxy trust

The Express app already configures `trust proxy = 1`.

Before P11.2, authentication audit/rate-limit code independently parsed the first `X-Forwarded-For` value. P11.2 removes that duplicate parsing and consumes Express-resolved `req.ip`, falling back only to the socket remote address.

This keeps the trust boundary in one framework configuration rather than treating a raw caller-supplied forwarding header as authoritative in application code.

Residual requirement: if deployment topology changes away from exactly one trusted reverse-proxy hop, the Express `trust proxy` policy must be reviewed before publication.

## CSRF and same-origin controls

Existing controls retained:

- unsafe authenticated methods require the session-bound CSRF token;
- CSRF comparison uses a hash plus timing-safe equality;
- high-control execution flows retain additional same-origin request checks;
- auth flow/session/CSRF cookies use Secure in production and SameSite=Lax;
- auth endpoints use no-store/no-cache response policy.

P11.2 does not weaken or bypass any execution confirmation/freshness requirement.

## SSRF review

The existing competitor transport remains the canonical supplied-URL network boundary and is unchanged by P11.2.

Existing tested controls include:

- explicit URL/protocol validation;
- DNS resolution before request;
- rejection of non-public/private/reserved network targets;
- IP-pinned execution;
- fresh resolution across requests to detect later DNS rebinding;
- ambient proxy disabled;
- manual redirect semantics;
- rejection of request bodies and unsupported methods;
- rejection of credential-bearing URLs;
- rejection of forwarded `authorization` and `cookie` headers;
- aborted requests stop before resolver/executor work.

P11.2 does not activate competitor collection or any live provider/network request.

## HTTP response hardening

Existing headers retained:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- restrictive `Permissions-Policy`;
- CSP with self-only default/script/connect, no objects, no framing and self-only forms;
- HSTS in production.

P11.2 adds:

- `Cross-Origin-Opener-Policy: same-origin`;
- `Cross-Origin-Resource-Policy: same-origin`;
- explicit Express `X-Powered-By` disablement.

P11.2 deliberately does not add COEP because the current application has not been certified for cross-origin isolation requirements. CSP still permits inline styles and HTTPS images for current frontend compatibility; those are documented residual tightening opportunities, not silently treated as absent.

## Secret and log handling

The review did not inspect or print secret values.

Existing controls retained:

- pino redaction for authorization, cookie and set-cookie fields;
- HTTP request logging strips query strings before serialization, preventing OAuth callback query parameters from entering normal request logs;
- auth audit data hashes IP/user-agent information when configured;
- OAuth callback logging records bounded categories/statuses rather than tokens.

A network-free source contract now asserts the logging/redaction and query-stripping controls.

## Supply-chain review

Existing controls retained:

- `pnpm install --frozen-lockfile` in CI;
- `minimumReleaseAge: 1440` (one day) for package releases;
- explicit `onlyBuiltDependencies`;
- GitHub Actions workflow permissions limited to `contents: read`;
- no `pull_request_target` workflow trigger;
- third-party GitHub Actions pinned to immutable 40-character commit SHAs while retaining version comments;
- committed lockfile and pinned/overridden sensitive build-tool versions.

A network-free security-posture contract protects those source controls from accidental removal.

This offline milestone does not query a current vulnerability/advisory service. A future explicitly scoped dependency-advisory review may add time-sensitive vulnerability intelligence; P11.2 does not infer "no vulnerabilities" from the static controls alone.

Residual infrastructure note: the CI PostgreSQL service still uses the reviewed image tag `postgres:17-alpine` rather than a registry digest. P11.2 does not change container provenance policy because no registry-digest verification mechanism is currently part of this repository workflow.

## Bounded hardening changes

P11.2 changes only engineering source/tests/docs:

- hardened auth return-target normalization;
- Express-resolved request IP for auth audit/rate limiting;
- explicit `X-Powered-By` disablement;
- COOP/CORP headers;
- expanded auth/security-header tests;
- static security-posture regression tests;
- this review record.

No dependency, lockfile, database, credential, provider, scheduler, execution, deployment or publication change is part of this milestone.


## Certification

P11.2 is complete and certified as a deterministic/offline engineering security milestone.

- Issue: #345 — `P11.2 — offline security review and bounded source hardening`
- Implementation PR: #346 — `P11.2 — offline security review and bounded source hardening`
- Base SHA/tree: `841c10c4a0fbe06fcd97d3c3fbcc84357dd18790` / `12036420976ac3f1ddc9413a070b3c71533abdd4`
- Exact tested implementation head/tree: `6b1380efebccea980123f293b550e599b65b22ba` / `e42872ed4887c48698ddd0358089931f166a4e9a`
- Exact-head PR CI: #596 / run `35574991295` — success
- Implementation merge/tree: `cdf1ca8d9c1138dc8dd9fed4d41c1d6e31f5b7cb` / `e42872ed4887c48698ddd0358089931f166a4e9a`
- Post-merge main CI: #597 / run `35579001011` — success
- Replit exact Git alignment: same merge/tree, origin/main exact, ahead/behind `0/0`, clean
- Replit validation: 1,182 reported tests passed / 0 failed, full typecheck PASS, full build PASS, P11.1 budget gate PASS, `git diff --check` PASS
- Canonical browser coverage: exact-head CI #596 and post-merge CI #597 both passed Chromium Playwright
- No deployment or publication

P11.2 remains an offline/source security pass and does not claim zero vulnerabilities. Final production security acceptance must re-check time-sensitive dependency advisories, deployment topology, current runtime headers/configuration and other P11/P12 acceptance criteria.

## Next safe boundary

**P11.3 — observability: metrics/logs/traces/alerts/job health**

Generic continuation may begin with deterministic/offline observability contracts, local/synthetic instrumentation and regression tests. It does not authorize production telemetry/alert credentials or sink configuration, Production DB mutation, provider/public-site activity, scheduler/worker activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.

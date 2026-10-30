# CH-R109 — Pre-merge customer preview boundary and acceptance review

Date: 2026-10-30. Scope: PR #1150, `workstream/ux-ch-recovery-customer-home-v1`. Source-only review; no merge or operational authorization.

## Verified evidence
- PR #1150 remains open and unmerged at reviewed HEAD `828454b8e1ac3752e9cbadf94d297445234a2172`; 107 changed files were returned by the GitHub PR patch inventory.
- GitHub Actions run 41033518765 passed on that HEAD, including browser regression tests and the 620,000-byte JavaScript / 190,000-byte CSS limits (619,239 JS / 189,776 CSS).
- Isolated Railway `customer-ui-staging` last succeeded at application commit `48c218e0a57c2373c0bddea0fca41c17f1ba8a59`, deployment `993513de-24a2-4080-b1cc-1aac35c33fa3` (619,640 JS / 189,776 CSS); HTTP logs have returned 200 for all nine customer routes. A 200 is not a rendered visual assertion.
- CH-R108 added browser assertions for card background, border, radius, padding and 320/390/1440px geometry on Results & Impact and My Websites. CI passed.

## Boundary and release blockers
1. **Mixed-scope PR:** includes customer UI, API customer trust/membership/attestation readers, certification tests, CI workflows and SQL migration candidates; do not treat green frontend CI as complete independent security and schema approval.
2. **Database candidates are not operational:** `lib/db/migrations/0015_customer_memberships_candidate.sql` and `0016_customer_attestations_candidate.sql` explicitly say NOT WIRED / REVIEW-ONLY. No database application, migrations, seeding, grants or bootstrap activation is authorized.
3. **Unused duplicate route modules:** `customer-results-impact.tsx` and `customer-portfolio.tsx` are distinct from the modules currently imported in `App.tsx` (`customer-readonly-reports.tsx`). Avoid reviewing unused files as deployed designs; cleanup should be a separately tested source-only change.
4. **Visual parity:** the user reported unstyled Screens 8/9; corrected layout is deployed and style regression is automated, but pixel-level comparison with the supplied approved references for every screen (including /home no-sidebar) has not been independently certified.
5. **Asset headroom remains thin:** last Railway build had 360 bytes JS and 224 bytes CSS headroom; further UI work requires verified structural reductions, not a budget increase.
6. **Security/privacy release review:** independent reviewer must assess authenticated customer scope, fail-closed evidence and trust boundaries, organization/site isolation and any future migration activation plan before merge. No provider operations are part of this acceptance.

## Required gates before merge recommendation
- Run and record deterministic browser acceptance at 320, 390, 768, 1024 and 1440px; confirm light presentation, /home no sidebar, customer nav on other pages, keyboard/focus and no invented metrics.
- Perform real deployed browser screenshots on each route and compare against the user-provided visual references. Record mismatches and fix in isolated PR branch; rerun exact-HEAD CI and Railway budget check.
- Independent security/schema review of the changed API readers and two inert migration candidates. Confirm no bootstrap path unintentionally includes them.
- Obtain explicit user authorization for any PR merge; no production, main, live DB/provider operations or migration under this review.

## CH-R110 — independent source inspection of security boundaries (2026-10-30)

This is a static source review, not an operational penetration test or deployment approval.

**Reviewed:** `customer-membership-reader.ts`, `customer-site-scope-loader.ts`, `customer-attestation-trust.ts`, `customer-certified-evidence-reader.ts`, `customer-staging-policy.ts`, `customer-staging-handler-candidate.ts`, `routes/customer-capabilities.ts`, migrations 0015/0016.

**Positive controls observed:**
- Membership SQL uses a parameterized authenticated principal, checks active organization/site memberships and active site, rejects malformed/mixed-principal result sets and duplicate sites; the scope loader converts lookup failures to `membership_unavailable` rather than escalating.
- Candidate route requires `req.auth.subject`, resolves site scope server-side, rejects cross-scope capability records, disallows unverified measurements, and emits only allowlisted fields. There is no route-registration side effect in the reviewed module.
- Attestation verification matches organization/site, reviewed issuer, verified evidence ID and freshness; staging policy rejects malformed issuer lists and invalid ages.
- The candidate composition is dependency-injected and does not itself touch environment configuration, DB pools, migrations or providers. Both SQL files remain explicitly marked not bootstrapped / review-only; customer membership rows default inactive.

**Unresolved gates and risks:**
1. Confirm the future HTTP router registers the handler only behind authenticated, securely configured principal creation, and never accepts an HTTP-derived trusted issuer, evidence ID or grant reader. The static candidate alone does not demonstrate that integration.
2. The generic handler trusts the injected scope reader and injected capability reader to be authoritative. A security reviewer must trace actual reader construction and validate tenant isolation, revocation behavior, atomicity and timing/error behavior before any activation.
3. The prospective database migration adds composite uniqueness and foreign keys. Validate pre-existing data, lock/rollback consequences, canonical organization scope, compatibility with every migration runner and permission model in a disposable PostgreSQL environment only under separate authorization.
4. The current preview remains intentionally unconnected. Do not represent returned HTTP 200, passing mock tests or a deployed static preview as proof of customer identity, production data authorization or evidence-backed reporting.
5. For future integration, independently review source observation and proof-reader trust provenance; an attestation's ID alone is not sufficient evidence without the verified server-side proof chain.

**Disposition:** No immediate fail-open defect identified in the reviewed isolated candidate implementations. Security sign-off is **withheld** until integration, schema, and independent specialist reviews are complete. No activation, migration, merge, live DB or provider work authorized.

## CH-R111 — runtime registration audit (2026-10-30)

- `artifacts/api-server/src/app.ts` mounts only `./routes` under `/api`, after session middleware.
- `artifacts/api-server/src/routes/index.ts` imports and mounts listed operational/health/auth routers and applies `requireApiAuthentication` before protected routers. It **does not** import or mount `customer-capabilities.ts` or `customer-staging-handler-candidate.ts`. Thus the reviewed candidate route is currently disconnected from this router entrypoint. Other dynamic registration paths were not exhaustively audited.
- `artifacts/api-server/src/index.ts` starts the application and performs an existing Diamond Shelf identity readiness check when a database binding is configured. It does not reference the candidate customer handler.
- `lib/db/package.json` defines the `bootstrap:runtime` entrypoint, but the exact migration inclusion/exclusion semantics require a separate inspection of `src/bootstrap-runtime.ts` and its dependency graph. **Do not infer candidate SQL exclusion only from its filename or comments.**
- The candidate handler's existing tests exercise unauthenticated (401), foreign-principal (404) and valid synthetic principal behavior, without contacting live providers.

**Release disposition:** candidate customer route not wired through the reviewed API entrypoint. Migration activation remains **unverified** until bootstrap/migration selection is checked. No runtime/database modification made.

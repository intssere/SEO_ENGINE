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

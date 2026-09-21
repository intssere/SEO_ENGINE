# P11.6 — responsive/product-polish closeout

## Milestone

Roadmap P11.6 — responsive/product polish.

- issue: #358
- implementation PR: #359
- implementation base SHA/tree: `75294652c5ddcf8f4b16873e78678b5c991dece6` / `d8fe375deff44bcc6fdaca8b37123d9ebe689f40`
- final exact tested implementation head/tree: `d3695e9467f26c4a1501acc27715f1b2c85fc2f3` / `6e55d861c171a3e412ef93d37318677285f6cb9e`
- exact-head CI: #631 / run `35605218166` — success
- implementation merge/tree: `93ccd007c9fb152f60e88daefe6c727afed3fb71` / `6e55d861c171a3e412ef93d37318677285f6cb9e`
- post-merge main CI: #632 / run `35605748067` — success

## What was certified

P11.6 upgrades responsive/product-quality checking from the P4.7 shared baseline into a route-wide deterministic browser gate.

Every explicit application route plus not-found is exercised at:

- 1440×1000 wide desktop;
- 1024×900 compact desktop;
- 768×1024 tablet;
- 390×844 phone.

The route matrix verifies:

- no document/body horizontal overflow;
- viewport-safe shell/main/content/mobile-navigation geometry;
- minimum content gutters;
- correct desktop vs compact shell state at the established 820px breakpoint;
- no accidental visible-copy clipping;
- no unintended visible interactive-control overlap;
- explicit internal horizontal scrolling for wide DataGrid/table content;
- 44px phone primary-control ergonomics outside dense DataGrid headers;
- opened mobile-navigation panel containment and target sizing;
- network isolation and browser-error cleanliness.

P11.5 remains unchanged and is rerun inside the same canonical browser suite.

Final GitHub Chromium result: **100/100 PASS**.

The 100 tests comprise the retained P11.5/P4.10/performance/visual suite plus 19 P11.6 tests. Each of the 18 routed P11.6 tests internally steps through all four viewport classes.

## Audit-driven stabilization

P11.6 intentionally started with the stricter test gate before broad styling changes.

### CI #626

Run `35603994772` failed 11 new P11.6 route tests.

Ten failures were audit-harness false positives: standard visually-hidden `.dataGridSearchLabel` and `.sr-only` labels were being interpreted as clipped visible copy.

One real issue was exposed on the Command Center phone layout: shared `.linkButton` actions were 36px high rather than the established 44px product touch target.

The fix:
- classify visually-hidden labels through geometry/computed-style semantics instead of class-name exceptions;
- raise mobile `.linkButton` targets to 44px.

### CI #629

Run `35604590286` then passed 99/100 browser tests.

The only remaining finding was real and isolated to `/performance` on phone:
- Reporting window select: 28px high;
- Country select: 28px high;
- Device select: 28px high.

The compact Performance selects were raised to 44px and locked by the static contract.

### CI #631

Run `35605218166` passed the full gate:
- workspace tests: 1,225 passed / 0 failed;
- Chromium: 100/100 passed;
- typecheck: PASS;
- build: PASS;
- P11.1 asset budget: PASS.

Post-merge CI #632 passed the same complete gate.

The failed audit runs are retained because they distinguish test-assumption defects from actual responsive/product defects and demonstrate that no P11.5/P11.6 gate was weakened merely to obtain a green result.

## Replit

Replit was exact Git-synced to implementation merge/tree:
- `93ccd007c9fb152f60e88daefe6c727afed3fb71`;
- tree `6e55d861c171a3e412ef93d37318677285f6cb9e`;
- origin/main exact;
- ahead/behind `0/0`;
- tracked changes 0;
- untracked files 0;
- clean;
- zero Git locks;
- no active repository writer.

Using existing dependencies only:
- workspace tests: **1,225 passed / 0 failed**;
- full typecheck: PASS;
- full build: PASS;
- P11.1 asset budget: PASS;
- `git diff --check`: PASS;
- JS: 589,405 raw / 169,557 gzip;
- CSS: 180,099 raw / 29,948 gzip.

GitHub Ubuntu/Chromium remains canonical for browser certification because Replit previously lacks the required Chromium shared libraries.

## Boundaries preserved

P11.6 is unpublished engineering certification only.

It performed no:
- production crawl or responsive/accessibility scan;
- provider/public-site request or mutation;
- Production DB/storage read/write/DDL/DML;
- secret/config/runtime mutation;
- scheduler/worker/retry activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

P11.6 does not certify:
- the separately published Task #73 application;
- every physical device/browser/OS combination;
- live provider content;
- future runtime content or code that has not passed the gate.

## Next safe boundary

P11.7 — reporting/export/shareable executive views.

Generic continuation may perform bounded deterministic/read-only engineering over existing supplied/read-only evidence, including report projection, executive summaries, printable/export formatting and local/synthetic share-state UX.

It does not authorize:
- production data export or exfiltration;
- external file/email/share delivery;
- public sharing/publication;
- provider/public-site mutation;
- Production DB/storage mutation;
- secrets/config changes;
- workers/schedulers;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- deployment or publication.

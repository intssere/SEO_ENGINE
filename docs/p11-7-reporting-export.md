# P11.7 — reporting, export and shareable executive views

## Scope

P11.7 adds a deterministic/read-only Executive Reports engineering workspace.

The milestone is intentionally bounded to supplied synthetic evidence and local browser projection. It does not add a report API, database table, server-side export job, delivery integration or publication path.

## Workspace

Route:

- `/reports` — **Executive Reports**

Navigation:

- domain: **Measure**
- item: **Reports**

The page uses only the P11.7 synthetic fixture and pure report-model helpers.

## Report model

`src/lib/executive-report-model.ts` provides:

- versioned synthetic report fixture validation;
- deterministic summary/KPI/highlight/evidence-lineage ordering;
- deterministic report fingerprinting;
- local CSV serialization;
- local JSON serialization;
- print-text projection;
- bounded share-state normalization/serialization/parsing;
- explicit local-only capability metadata.

The model fails closed on malformed fixture identity, invalid domain/reference time, duplicate row identities, invalid evidence fingerprints, unsupported share-state parameters, invalid view/sections and overlong share state.

## Local export semantics

CSV and JSON outputs are generated entirely in the browser from the synthetic fixture.

CSV:

- quotes every field;
- escapes embedded quotes;
- uses deterministic CRLF records;
- prefixes formula-like spreadsheet cells beginning with `=`, `+`, `-` or `@` after leading whitespace so a supplied value cannot become an active spreadsheet formula.

JSON:

- includes report identity/fingerprint;
- includes explicit safety/capability metadata;
- does not add a runtime loader or server export endpoint.

The page can download those synthetic strings with `Blob` + `URL.createObjectURL`. No network delivery occurs.

## Shareable view state

The share state contains only:

- `view=executive|operations`
- `sections=summary,kpis,highlights,guardrails`

It never contains:

- report evidence;
- metric values;
- source fingerprints;
- credentials;
- tokens;
- provider data.

Malformed or unsupported state fails closed to the safe default view in the UI.

There is no server-side share persistence and no public-link publication.

## Print view

The page exposes a local browser print action and print stylesheet.

Print CSS removes:

- application navigation;
- report controls;
- local export controls;
- invalid-state notices.

The printable report retains selected executive content and uses break-avoidance for report cards/highlights where practical.

## Inherited certification

Adding `/reports` updates both existing route inventories:

- P11.5 accessibility certification;
- P11.6 responsive/product-polish certification.

Therefore the new page must pass the same:

- all-impact WCAG 2.2 A/AA axe gate;
- 320px reflow;
- target-size/focus/reduced-motion checks;
- 1440/1024/768/390 responsive matrix;
- overflow/clipping/overlap/internal-scroll/compact-shell/touch checks.

P11.7 does not weaken either prior milestone.

## Focused browser certification

`e2e/reporting.spec.mjs` verifies:

- synthetic/read-only safety badges;
- executive summary/KPI/highlight rendering;
- URL share-state serialization with no report evidence payload;
- operations-detail state;
- section-selection round trip;
- malformed-state fallback;
- local CSV and JSON downloads;
- CSV/JSON/print previews;
- print media hiding controls while retaining report content;
- no unmocked API or external browser requests;
- no page/console errors.

## Explicitly not authorized

P11.7 does not authorize:

- production data export or exfiltration;
- server-side report generation/persistence;
- email delivery;
- Slack delivery;
- webhook delivery;
- file-provider/cloud-drive delivery;
- public report links;
- unauthenticated report publication;
- Production DB/storage access or mutation;
- provider/public-site request or mutation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- scheduler/worker activation;
- deployment or publication.

## Acceptance

P11.7 is complete only after:

1. report-model tests pass;
2. reporting safety/static contract passes;
3. focused P11.7 Chromium tests pass;
4. inherited P11.5 accessibility route certification passes with `/reports`;
5. inherited P11.6 route-wide responsive certification passes with `/reports`;
6. all workspace tests pass;
7. full Chromium suite passes;
8. typecheck passes;
9. build/P11.1 budget passes;
10. `git diff --check` passes;
11. exact-head PR CI is green;
12. exact tested head is merged;
13. post-merge main CI is green;
14. Replit is reconciled Git-only when its active agent lock clears;
15. closeout documentation/memory is merged;
16. no external delivery, deployment or publication occurs.

## Limitations

P11.7 certifies only the exact engineering tree and deterministic synthetic fixtures.

It does not certify:

- production reporting data;
- correctness of a future production report loader;
- real external file delivery;
- public sharing;
- a production reporting SLA;
- the separately published Task #73 application.

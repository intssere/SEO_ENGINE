# CVI-1C.72 — Remaining Mounted Router Source Inventory

## Baseline and scope
Source-read audit stacked on CVI-1C.71 draft PR #1131, HEAD `39727f172b6df95b84ced79ae66603317680173f`. Explicitly inspected the nine remaining top-level routers registered by `artifacts/api-server/src/routes/index.ts`: `authority.ts`, `authority-opportunities.ts`, `competitor-acquisition.ts`, `competitor-pilot-execution.ts`, `signal-collection-execution.ts`, `task53-write-scope.ts`, `pilot.ts`, `execution.ts`, and `dashboard.ts`. Together with CVI-1C.71's selected `auth.ts`, `operational.ts`, and `connections.ts`, this covers the explicitly mounted route source files; `health.ts` and `provenance.ts` are not individually inspected here.

## Findings from nine additional route files
| Router | Relevant mounted endpoints | Direct dormant ACL identifier / revocation references found |
|---|---|---|
| `authority.ts` | GET `/authority/dashboard` | None |
| `authority-opportunities.ts` | GET authority opportunities/qualification/outreach; POST mock outreach send, reviews | None |
| `competitor-acquisition.ts` | GET capability, POST dry-run and persist | None |
| `competitor-pilot-execution.ts` | GET capability, POST dry-run | None |
| `signal-collection-execution.ts` | GET capability, POST run | None |
| `task53-write-scope.ts` | GET/POST Shopify task53 start | None |
| `pilot.ts` | GET authorization/status, POST run | None |
| `execution.ts` | GET execution/task52/task53 resources; POST authorization renewals, task53 preflight/execute, task54 preflight/apply | None |
| `dashboard.ts` | GET dashboard | None |

Search within these nine file bodies found no direct text reference to `cvi_organization_memberships`, `cvi_site_read_grants`, `membership_revoked`, `site_grant_revoked`, `revoke`, or `disconnect`. **This proves only that the route files do not directly name these identifiers; a delegated helper could write the tables.**

## Impact
No direct membership- or site-grant-revocation API path is established by inspected route source. Existing real POST endpoints must not be characterized as read-only solely from route path names: they can call execution or provider helpers and should be separately assessed for authorization, side effects, and production scope. Dormant read-acquisition SQL locks and proposal-edit plan locks are not equivalent to a live transactionally fenced `edit_draft` capability.

## Remaining evidence to complete the audit
1. Read `health.ts`, `provenance.ts`, and the full delegated call graphs of `competitor-acquisition`, `execution`, `connections` and `pilot`.
2. Perform repository-wide *branch-aware* SQL-writer search, not default-branch code search: scan runtime .ts/.sql sources for UPDATE/DELETE/INSERT targeting dormant ACL tables and sites/provider connections; classify tests, migrations, and live code.
3. Verify the live service image, database migration inventory and runtime feature gates separately before stating anything about production deployments.
4. Require independent product/security/database approval for any new `edit_draft` site grant, fail-closed handler, unified row-lock order and rollout.

## Constraints
Documentation-only. No production DB read/write, migration activation, provider calls, crawling, publishing, merge or deployment. CI passing proves only tested branch behavior.

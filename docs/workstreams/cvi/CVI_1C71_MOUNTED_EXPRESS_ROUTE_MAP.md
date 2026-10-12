# CVI-1C.71 — Mounted Express API Route and Revocation Evidence

## Verified repository scope
Read-only source inspection at parent commit `4727608cc51b8215a7b17fe830429745f957f47f` (CVI-1C.70 PR #1128). Investigated `artifacts/api-server/src/app.ts`, `routes/index.ts`, `routes/auth.ts`, `routes/operational.ts`, `routes/connections.ts` and authorization middleware. This inventory is **limited to the inspected files**, not a full static SQL writer or compiled/deployed route inventory.

## Mounted router chain
`app.ts:51,53` attaches `attachAuthSession` then mounts the root router at `/api`. `routes/index.ts:20–23` mounts health, provenance and auth handlers before `requireApiAuthentication`; the mutation rate limiter precedes operational and connections routers. The route list imports dashboard, authority, operational, competitor acquisition/pilot, signals, task53, connections, pilot, execution and authority opportunities. No dedicated `tenant-acl` router appears in this **top-level registration list**. This alone does not prove that other routers lack nested ACL-write endpoints.

## Confirmed selected endpoints
| HTTP path (under `/api`) | Source | Operation and limitation |
|---|---|---|
| `POST /auth/logout` | `routes/auth.ts:176` | Calls live session revocation; not tenant membership/grant revocation |
| `POST /approvals/:id/decision` | `routes/operational.ts:35` | Calls proposal decision transaction; same-origin check, no transaction-scoped site-grant guard |
| `PATCH /approvals/:id/draft` | `routes/operational.ts:48` | Calls proposal draft transaction; same-origin check, no transaction-scoped site-grant guard |
| `GET /connections/status` | `routes/connections.ts:80` | Reads provider status; not a revocation mutation |
| `GET /connections/google/start` and provider OAuth callbacks | `routes/connections.ts:170,181,218` | Provider connection/auth flow, not the dormant tenant ACL |
| `POST /connections/google/select` | `routes/connections.ts:323` | Google selection endpoint; no indication from its route name of site-grant revocation |

## Material enforcement observation
`middlewares/auth-security.ts:70` passes requests to the next handler when authentication enforcement is disabled. Even if `req.auth` is missing, generic route middleware may continue. Do **not** infer that same-origin checks provide identity, tenant membership, site grant, or transaction-time authorization.

## What remains unverified
- Exhaustively inspect other mounted routers and non-router SQL-writing helpers for `UPDATE/DELETE` on `cvi_organization_memberships`, `cvi_site_read_grants`, provider connection/site status.
- Verify live-deployed service wiring and schema migration versions separately from repository presence.
- Product/security review of fail-closed edit grants and database owner's global lock order across revocation and mutation.

## Restrictions
Read-only evidence, documentation-only change, separate draft PR. No live provider or production database access; no migration activation, ACL grant creation, handler change, website publishing, merge or deployment.

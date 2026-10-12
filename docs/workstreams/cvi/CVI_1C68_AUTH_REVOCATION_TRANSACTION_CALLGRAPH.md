# CVI-1C.68 — Proposal and Session Revocation Transaction Call Graph

## Baseline
Stacked on CVI-1C.67 draft PR #1125, exact HEAD `0ed186724a63a37bc074b84ff17b795725be9722`. Its proof CI https://github.com/intssere/SEO_ENGINE/actions/runs/38247540373 was pending when this audit was written. Read-only source analysis; no production runtime modification.

## Inspected call graph
| Entry / operation | DB action and transaction boundary | Lock consequence |
|---|---|---|
| `PATCH /approvals/:id/draft` → `editProposalDraft` (`operational-data.ts:286`) | Readiness/site selected ahead of `sql.begin` (:295); scoped `action_plans` `FOR UPDATE OF ap` (:308); prior approval/revision/quality checks; `expected_outcome` update | Plan row first; no persisted session/member/grant fence within tx |
| `POST /approvals/:id/decision` → `decideProposalReview` (:211) | Readiness ahead of `sql.begin` (:221); scoped plan `FOR UPDATE OF ap` (:231); approval insert and plan status update | Plan row first; no persisted tenant/site ACL guard within tx |
| `attachAuthSession` middleware → `loadAuthSession` (`auth-foundation.ts:319`) | Independent SQL `UPDATE auth_sessions SET last_seen_at=clock_timestamp()` with active, expiry and idle filter (:336–342) | Row update acquires session lock but exits before proposal handler tx; req.auth is snapshot |
| Token rotation → `rotateAuthSessionToken` (:361) | Single independent `UPDATE auth_sessions SET token_hash=...,last_seen_at=clock_timestamp()` (:366–370) | Session row modified independently of proposal tx |
| Session revocation → `revokeAuthSession` (:378) | Independent `UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now())` by token hash (:382) | Session row modified; no plan row lock in this call |
| Dormant acquisition nonce trigger `0016_cvi_acquisition_revocation_serialization_draft.sql` | `FOR SHARE` site → connection → session → membership → `read_evidence` grant | Only synthetic/disposable acquisition receipt boundary; not edit permission |

## Implications
Auth middleware's persisted session update precedes the proposal transaction; its result is not automatically transaction-scoped authorization at mutation time. The actual plan mutation locks its plan row first, while dormant acquisition admission follows a site-first order. No inspected source establishes a unified plan/session/member/grant lock discipline. A production design must guard against authorization revocation racing a stale req.auth principal; choose locks compatible with all revocation and proposal paths.

## Evidence still needed
Map explicit membership/grant revocation APIs (if any), canonical site activity changes, provider connection revocation, database triggers and any other `action_plans` mutation paths. Validate exact environment behavior when `AUTH_ENFORCEMENT_ENABLED` is disabled. Decide approved `edit_draft` grant schema and test cross-tenant IDOR, 2-connection operation-first and revocation-first order. Do not mistake this selective call graph for a complete deadlock certification.

## Explicit restrictions
Documentation only. No real mutation grant, handler modification, production ACL migration, production DB, provider calls, website crawling/publishing, merge or deployment. Reviewer decisions remain unapproved.

# CVI-1C.41 — In-flight Authorization Consistency Review

Predecessor: CVI-1C.40 draft PR #1078. Its implementation CI passed at `ce348eadf46d3022c91ce4dcfa9f0b09944bf34d`; final documentation-inclusive CI remains outstanding.

## Source review
`attachAuthSession` loads the database session into `req.auth`. `requireApiAuthentication` then evaluates the attached role and CSRF values and calls `next()`. Authorization is not automatically re-evaluated at every later operation. CVI-1C.40 establishes new-request behavior after persisted role change, not mid-request consistency.

## Next bounded increment
Develop an isolated, synthetic-only concurrency test using a controlled pause between middleware authorization and a harmless test operation. Check behavior after a committed role change. Before modifying shared middleware, inventory sensitive write paths and determine which require transaction-scoped reauthorization and lock ordering. Validate with disposable PostgreSQL and exact-head CI. Avoid claiming comprehensive mid-request protection from an entry-middleware check alone.

## Restrictions
No production database access, real provider interactions, public CVI route, publishing, merges or deployment. This document is a design audit, not completed enforcement.

## Added synthetic mid-request experiment
A localhost Express probe now pauses an already authorized admin POST after shared middleware. A committed PostgreSQL role change to viewer occurs while the handler is paused; the probe records the pre-change request role snapshot and subsequent POST authorization is expected to deny. This explicitly demonstrates the entry-only authorization boundary; it is not a security fix for sensitive downstream operations. Full exact-head CI and transactional fencing design remain outstanding.

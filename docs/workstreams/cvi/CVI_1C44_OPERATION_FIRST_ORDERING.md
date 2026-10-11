# CVI-1C.44 — Operation-First Session Lock Ordering

Parent CVI-1C.43 implementation HEAD `188298252d855b7f3ef60099bf076266ff888f1d` passed full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38129564810. Parent documentation HEAD `b8b39a326445ce761c83229da38a8d16a0ac711a` awaits final certification.

## Bounded implementation
A synthetic disposable PostgreSQL test acquires `SELECT ... FOR UPDATE` on an eligible admin session inside an explicit operation transaction. A separate connection attempts to demote its role while that lock is held. The test observes PostgreSQL lock contention, commits the operation transaction, then verifies that demotion commits and a subsequent privileged HTTP POST denies. The protected operation is synthetic and makes no real mutations.

## Limitations
This establishes operation-first lock ordering and post-demotion request denial, not a full atomic mutation, tenant/site authorization, provider integration, or production authorization fence. Combined with CVI-1C.43, both lock acquisition orders are covered in disposable tests only. Full exact-head CI pending. No merge or deployment.

## Exact-head implementation CI receipt
- Corrected implementation HEAD `e02b9af566132b29da92b79384d9dfe523217df2`.
- Full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38131455420 — completed SUCCESS, job `114446465407`, no failed steps.
- Initial HEAD `cbc1c77a2b2d431b81ec866902442cae1c6e61be` failed because the competing query was not started before lock-wait polling. Corrected at `e02b9af566132b29da92b79384d9dfe523217df2`.
- Draft PR #1085 remains open, unmerged, undeployed. This documentation revision requires its own full exact-head CI.

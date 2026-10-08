# UGP-10.34 — Controlled Outreach Exit Evidence and Closure Gates

**Status:** Exit candidate; certification remains **OPEN** until cleanup is verified.  
**Source baseline:** `3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5` (merged UGP-10.33 PR #911).  
**Scope:** UGP-10 governed outreach only; this document does not grant production admission, migrations, provider credentials, autonomous sends, or scheduling.

## 1. Bounded UGP-10.33 evidence

All evidence below was retrieved from the isolated Railway `p12-2-fixture` environment in project `52265e29-921b-4652-ac0d-9da4e5e69936`, environment `8b8e54ee-810a-4020-b89d-8397d1fa5ef1`, on 2026-10-08.

| Evidence | Observed value | Disposition |
|---|---|---|
| Source commit | `3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5` | PASS |
| Plan fingerprint | `174ef27f03547e68f1ad746f2d8b69ba3c9875acbcfec54a0300d48cd109b23d` | PASS |
| Prepared disposable public base-table count | 49 | PASS |
| Database-preparation external calls | 0 | PASS |
| Live certification deployment | `15f8f405-958c-42e1-b6cc-810570f46e70` — SUCCESS | PASS |
| Certification receipt `pass` | `true` | PASS |
| First send disposition | `accepted` | PASS |
| Network calls for first invocation | 1 | PASS |
| Durable attempt count | 1 | PASS |
| Exact replay disposition | `existing_accepted` | PASS |
| Replay network calls | 0 | PASS |
| Reservation status | `consumed` | PASS |
| Suppression re-reservation | `suppressed_contact` | PASS |
| Automatic retry performed | `false` | PASS |
| Production mutation | `false` | PASS |
| Receiver's Railway HTTP log | one `POST /ugp-10-33/receive` with HTTP 200 | PASS |
| Railway network-flow entries for runner | no entries returned by query | **UNAVAILABLE — do not claim positive network-flow proof** |

The sanitized adapter receipt fingerprint was `b1a1ef470f4410a41afc3da980c1d27e83ca24befa94ab1d72abe18182840808`; execution fingerprint was `208c8ac93078ae4e9bb06967d93feff100355e8cea9e12181841b8a843a1865a`. These are identifiers, not secret credentials.

This proves a controlled HTTPS receiver certification, **not** production email delivery or arbitrary third-party contact authorization.

## 2. Disposable-resource closure

As of the audit, the following fixture-only resources are still deployed:

1. Receiver Function: `ugp-10-33-controlled-receiver-once` — service `787e4358-0446-4390-8ed8-0318d2d86c43`.
2. PostgreSQL: `Postgres-nk30` — service `86bdee49-473a-44e5-928b-b2195d800402`.
3. Disposable PostgreSQL volume: `b8e14558-79c5-4a6a-bd70-82287f832ffe`.
4. DB preparation runner: `ugp-10-33-db-prepare-once` — service `1808d0bf-9b4d-46c5-bb70-1971252217dd`.
5. Live one-shot runner: `ugp-10-33-live-cert-once` — service `57e44818-61b5-46eb-b8b9-ff05fde8f779`.

**Cleanup is not authorized by this document.** Before deletion: preserve the sanitized evidence and obtain separately scoped cleanup authorization. Delete only the exact fixture resources above; explicitly scope every delete to environment `8b8e54ee-810a-4020-b89d-8397d1fa5ef1`. Destroy the disposable DB volume only under explicit authorization acknowledging its irreversible data loss. Then independently re-inventory the fixture environment and record final absence. Never delete production resources.

## 3. UGP-10 exit decision

The original ROADMAP UGP-10 exit criteria require (a) no uncontrolled bulk-mail path, (b) every send bound to a real qualified prospect, and (c) duplicate/suppressed contacts failing closed.

The UGP-10.33 fixture validates governed qualification/authorization lineage and deduplication/suppression for **one deterministic controlled certification target**. It does not establish broad production recipient qualification or production-provider coverage.

Final UGP-10.34 PASS additionally requires:

- Reconcile UGP-10.1 through 10.33 provenance, CI, migrations and safety gates against canonical initiative head.
- Verify one authorized real controlled submission and **zero** additional sends, preserving HTTP 200 and durable receipt evidence.
- State separately whether Railway network-flow visibility is missing; absence of flow logs is **not** evidence of zero egress.
- Verify no production runtime, DB, mailbox, or credentials changed as a consequence of certification.
- Obtain and execute scoped fixture cleanup authorization; verify every disposable resource and volume absent, or record explicit evidence-retention exception.
- Record production-admission decision `NOT_GRANTED` regardless of UGP-10 closure; new production send scope requires separate design and authorization.
- Require exact-head CI success and explicit merge authorization for this evidence packet.

**Current disposition: UGP-10.33 controlled certification PASS; UGP-10.34 EXIT PENDING.**

## 4. Subsequent initiative boundary

UGP-10.34 closure is not UGP project completion. The ROADMAP still has UGP-11 durable automation, UGP-12 measurement, UGP-13 production hardening and UGP-14 final mainline integration. None is authorized by this evidence packet.

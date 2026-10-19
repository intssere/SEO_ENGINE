# UGP-11.C4 — Transport decision gate matrix (pre-adoption, no selection)

**Baseline:** `initiative-universal-growth-platform` `24ff05d018a4c241e1ec9157bce719ea8125c38a`, successfully certified by [post-merge CI #39111953985](https://github.com/intssere/SEO_ENGINE/actions/runs/39111953985). **Review date:** 2026-10-19. **Decision owner:** not appointed. **Independent P9 trust issue:** [#1054](https://github.com/intssere/SEO_ENGINE/issues/1054) OPEN. **Transport issue:** [#1061](https://github.com/intssere/SEO_ENGINE/issues/1061) OPEN. **Disposition:** NO ADOPTION, NO PRODUCTION AUTHORITY.

## Candidate identity and evidence reliability

The upstream `timgit/pg-boss` official GitHub release list reviewed on 2026-10-19 still shows **12.38.0** as the latest **core pg-boss** release; `proxy-1.13.0` and `dashboard-1.12.1` are **different artifacts** and must not be mistaken for a newer core package release. This is a release-list observation, not npm tarball integrity or a perpetual freshness assertion.

- `UGP-11-C4-PG-BOSS-12380-TAGGED-SOURCE-VERIFICATION.md` pins observed upstream tag to Git commit `2c1005b744952360e999c2000e155a1bfebb8951`; source manifest declares Node >=22.12, schema 46, MIT and four direct runtime dependencies.
- `UGP-11-C4-PG-BOSS-12380-SECURITY-EVIDENCE.md` documents narrow public direct-advisory screening. **It is not a complete supply-chain clearance.**
- `UGP-11-C4-PG-BOSS-12380-OPERATIONAL-CONTRACT-DELTA.md` tracks operationally significant behavior from publisher release notes; those descriptions have not been experimentally certified by SEO ENGINE.
- `UGP-11-C4-CERTIFICATION-EVIDENCE-ROLLUP.md` consolidates engine-owned disposable PostgreSQL fencing and uncertainty tests; they are **not** production admission or a complete end-to-end transport implementation.

## Same-standard decision matrix

| Criterion | pg-boss 12.38.0 candidate | Thin engine-owned PostgreSQL candidate | Evidence / required certification | Gate |
|---|---|---|---|---|
| Runtime versions | Tagged-source Node >=22.12; PostgreSQL >=13 publisher requirement | Uses repository's existing PostgreSQL client; deployed compatibility still needs proof | Current CI uses Node 22 without exact patch pin and disposable PostgreSQL 17; Railway image tags do not prove running versions | OPEN |
| Supply-chain trust | Upstream tagged manifest and MIT source notice observed; tarball integrity, transitive SBOM/advisories still absent | Existing dependency tree and source also require equivalent advisory/license review | Pin immutable artifacts, resolve transitive versions, check advisories, license obligations and maintainer recovery | OPEN |
| Schema lifecycle | Publisher schema 46; migration can occur on upgrade/start | Engine-owned SQL fixture/migration, production upgrade path not approved | Independently inspect 45→46 and startup DDL; isolated migrate/interrupt/rollback tests with explicit authority | OPEN |
| Enqueue/idempotency | Publisher singleton and unique-key behavior; 12.37.1 addressed cached-key starvation | Engine-owned dedupe/fenced fixture coverage | Parallel duplicate producers and conflicting identity; freshness, tenant isolation and no authorization from receipts | OPEN |
| Claim lease and fencing | Publisher heartbeat, settle attempt identity and abort behavior | Disposable claim/fence races and control-first lock tests | Independently test stale A after B reclaim, kill races, immutable fence CAS, expiry, no dispatch | OPEN |
| Ambiguous commit and side effects | Library retries, worker overruns and redrive must be constrained outside the transport | Disposable commit fault and read-only observer experiments; historical classification only | Never retry possibly started external write/send; reconcile exact durable marker or manual intervention; no provider access | OPEN |
| Bounded observation | v12.38 list calls have 1,000 default cap and cursor pagination | Engine-owned independent read observer with timeout, snapshot and unavailable classification | >1,000 rows and missing/deleted page tests; incomplete inventory never establishes absence | OPEN |
| Maintenance/destructive APIs | Batching and destructive delete / TRUNCATE behavior require restrictive wrapper | Engine-owned explicit cleanup and migration ownership | Neither side allowed cleanup or DDL under a read-only C4 grant | OPEN |
| Operations and long-term cost | Library upgrade/migration and maintainer dependence, optional observability | Internal maintenance, incident response, PostgreSQL correctness ownership | Quantified failure drill, operator SOP, retention/privacy, observability, cost and support ownership | OPEN |
| Independent trust and issuance | Queue is not a P9 issuer or approval authority | Fixture control is not a P9 issuer or approval authority | Appoint independent identity/KMS/security owners and certify durable trust in #1054 | BLOCKED |

## Decision rule and review recommendation

**Gate decision: DEFER SELECTION.** Neither candidate has sufficient *like-for-like* evidence to justify an operational choice. Do not preferentially award a PASS because one option has more documentation or more fixture tests. The thin adapter remains the engineering comparator, **not the default approved production implementation**. pg-boss remains a viable **unapproved** candidate at 12.38.0.

Only after an independent reviewer evaluates a consistent acceptance suite, separately authorizes any disposable package/DB experiment, and records owners, evidence IDs and risk acceptance may the architecture selection be proposed. **Architecture selection is distinct from runtime admission.** C2 #1054 independently blocks P9 authority, and any operational migration, start, worker, retry, provider dispatch, `main` merge or deployment still needs exact-scoped authorization.

## Immediate permissible next evidence

1. Complete **read-only offline** inspection of upstream tagged source for startup migration triggers, rollback assumptions, claim/fetch transaction boundaries, and library retry defaults. Do not run/install the package as part of this documentation increment.
2. Prepare a parity test specification with pass/fail and observable traces for both candidates, bounded to a future expressly authorized disposable PostgreSQL environment.
3. Identify named independent architecture/security reviewer and runtime/DB owner; do not fabricate approvals. Capture exact version evidence only after separately approved access to a designated nonproduction target.
4. Publish a final decision ADR only with reviewed artifacts, risk/operability evidence and accountable signatures; keep #1061 open until then.

**Actions not performed or authorized:** runtime/package installation, dependency/lockfile edits, PostgreSQL queries or DDL, Railway action, secret access, scheduler/worker/claim, external sends, provider/public-site writes, automatic retries, production deployment, `main` mutation or any modification to P12.2.

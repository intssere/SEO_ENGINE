# INT-02B — historical migration authority evidence gap ledger

**Status:** source-backed read-only investigation, 2026-10-11. **No authority to apply SQL, deploy, or inspect Production.**
**Integration PR:** #1072. Main baseline: `93f457f9f00d1ef36c3c92dacef1ca42aa2c2b9e`.
**Pinned UGP source for integration bytes:** `5cecb83da3352fd6a2e79423abbb69f2e7e9105b`.
This document distinguishes a source-defined contract from observed proof of an installed database.

## Source observations

1. `artifacts/api-server/src/lib/p12-2-l10-19-a-0011-apply-contract.ts` in main binds original `0011_first_party_crawl_expected_absence_disposition.sql` to Git blob `8749184f481474a4a085eaacf3ff154e8ebfe903` and SHA-256 `07a0ad844d34b401a8972a70a4bf767cf0c8853679ce5203c8a9f1b35bb9a700`; its authorization fingerprint includes named project/environment/Postgres service, Packet 014 and specific recovery evidence, plus one process/one attempt/no retries.
2. This contract demonstrates **defined execution authority**, not an independently re-read durable ledger proving the current state of any database. It must not be re-used to authorize UGP 0012–0015 or to rewrite original P12.2 0008–0011.
3. `artifacts/api-server/src/lib/authority-outreach-ugp-10-33-db-prepare.ts` in `initiative-universal-growth-platform` is executable SQL preparation for an explicitly gated non-Production certification fixture. It checks `NODE_ENV`, dedicated enablement, exact authorization, required inputs and an initially empty public schema, then explicitly applies 0001–0007 and the **original** UGP 0008–0011 filenames via `DATABASE_URL`.
4. The UGP preparation utility performs a 49-table post-install bootstrap and verifies the certification CHECK reason variants. It is **not** a historical installation receipt ledger or a safe adapter for the combined 0012–0015 integration namespace. Never directly import/call it in ordinary integrated startup.
5. Main `lib/db/src/runtime-bootstrap.ts` can apply initial 0001/0002 migrations and describes several table-count/shape states; no comprehensive 0001–0015 historical ledger was verified by that inspection. It must not independently approve the combined schema.
6. `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` identifies Neon Production authority versus Railway managed DB as an unresolved **verification** issue: C2Y Path A remains normative pending an approved superseding ADR; neither resource's actual live lineage is independently certified by the document. A Railway PITR rehearsal is not Proof-of-Production-authority.

## Evidence required before historical migration admission

| Evidence | Minimum acceptance requirement | Current observation |
| --- | --- | --- |
| Main 0001–0011 history | Per-migration applied identity, immutable file hash, time/operator/DB binding and trusted evidence of execution | NOT CERTIFIED |
| Legacy UGP 0008–0011 | Identify existing standalone installations before any renumbering; preserve original filename/hash and whether SQL effects already exist | NOT CERTIFIED |
| Combined 0012–0015 | Independent receipt source bound to exact migrated target and original SQL hashes, with no replay | Only disposable fixture SQL compatibility verified |
| Target DB identity | Reviewable provider/project/environment/service/database binding corroborated separately from application-supplied URL | Production NOT CERTIFIED |
| Schema authority | Full observed structural catalog including relevant columns, constraints, keys, indexes, triggers, enablement | Disposable fixtures verified; Production NOT CERTIFIED |
| Approval | Human exact target, exact migration sequence, prestate and verified independent receipts; scoped one-shot authorization | NOT GRANTED |

## Fail-closed installation decision

- **Main-only:** structural compatibility can be observed; do **not** authorize UGP 0012–0015 until all historical 0001–0011 receipts and DB authority have independent provenance.
- **Original UGP standalone:** original 0008–0011 already mean different SQL than main's 0008–0011; classify as a separate legacy lineage, never auto-replay as 0012–0015.
- **Combined candidate:** successful disposable 0001–0015 installation is a *new fixture* only; does not prove the identity, history, or eligibility of any existing DB.
- **Partial, mixed, unknown, mismatched:** reject; no repair, backfill, version stamp, or automatic reclassification from table count.
- **All cases:** automatic installer remains absent/default disabled. No verified Production plan yet. Prior explicit authorizations and original SQL remain immutable.

## Next bounded engineering task

Design a **read-only receipt evidence schema and verification adapter** that accepts independently captured, signed or controlled records from a specifically authorized fixture. It must not accept self-attested `verifiedOrigin` or a caller-created expected digest as an independent trust anchor. For real installations, request independently approved inspection and authority review first; do not infer source of truth from provider names or documents alone.

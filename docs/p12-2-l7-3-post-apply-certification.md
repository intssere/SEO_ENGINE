# P12.2-L7.3 — post-apply read-only certification

## Incident state

The single authorized L7.2 apply deployment was:

- service: `p12-2-l7-0008-apply-once`
- deployment: `347c5478-1bd1-4e55-8e03-e1d403958e7f`
- image digest: `sha256:d19204f49ab6c7b68dbccdff0a5d837786fbdae9169c65113816db508b8db267`

Its receipt showed:

- exact migration SHA-256 validated before psql start;
- one psql process;
- one attempt;
- zero retries/fallback;
- stdout: `BEGIN`, `CREATE TABLE`, `CREATE INDEX`, `COMMIT`;
- then a syntax error at the first post-verification SELECT.

The migration therefore committed. The apply authorization was invalidated and MUST NOT be replayed.

## Root cause

The L7.2 wrapper built SELECT statements without SQL terminators. psql meta-command execution allowed the included migration file to run and commit, while buffered wrapper SQL failed only afterward.

L7.3 adds a regression test requiring explicit statement terminators in the consumed L7.2 wrapper source.

## L7.3 verification boundary

L7.3 is SELECT-only and separately authorized. It verifies:

- exact Production project/environment/Postgres identity;
- PostgreSQL identity;
- exactly 38 public base tables;
- `public.first_party_crawl_l2_invocations` present;
- exact L2 columns;
- exact L2 constraints;
- exact L2 indexes;
- the three legacy P12 crawl tables remain present;
- exact active Diamond Shelf site binding.

The verification session sets PostgreSQL `default_transaction_read_only=on`, uses one attempt, zero retries, zero fallback, and never contains DDL/DML.

## Separate authorization stages

1. merge this PR;
2. immutable L7.3 certification-image release;
3. one-shot L7.3 Production read-only verification.

No authorization is reusable between stages.

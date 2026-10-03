# P12.2-L6.3 — Fail-closed one-shot live operator executable

## Purpose

L6.3 resolves the live-executable-entrypoint blocker without releasing or executing the operator in Production.

A new executable bundle, `p12-2-live-operator.mjs`, is emitted separately from the existing inspection-only `p12-2-crawl.mjs`.

## Operator boundary

Execution requires all of the following:

- explicit `--execute`;
- exactly one `--envelope <path>` argument;
- an exact L2 packet whose integrity is independently rebuilt and verified;
- the packet-specific authorization literal supplied through `P12_2_L2_AUTHORIZATION_LITERAL`;
- `DATABASE_URL`;
- migration `0008_first_party_crawl_l2_invocations.sql` present at runtime;
- a durable packet claim before executor invocation.

The CLI does not print the database URL, authorization literal, raw page bodies, sitemap XML, or credentials.

Failures emit only bounded deterministic error codes.

## Phase mapping

The live executor maps the exact L2 phases as follows:

- `full_initial` → bounded full crawl with no previous-run comparison;
- `full_interrupt` → bounded full crawl stopping only after the requested persisted checkpoint revision;
- `full_resume` → bounded full crawl using exact fingerprint-validated resume checkpoint material;
- `full_reconciliation` → bounded full crawl with previous-run comparison;
- `incremental` → L6.2 deterministic incremental-material resolution followed by bounded incremental crawl execution.

Every path remains first-party read-only, uses a maximum of one whole-run invocation attempt, and has no automatic whole-run retry.

## Build proof

The application build emits the live operator and `verify-build.mjs` fails closed unless its bundle and source map contain the required safety, durable-consumption, migration, authorization, and lineage markers.

This is source/build proof only. It is not Production-image proof.

## Remaining blocker

After L6.3, the L6 readiness contract remains blocked only on:

- `production_image_live_entrypoint_proof_missing`.

Production migration 0008, immutable image release, Railway image transition, and the first live Diamond Shelf crawl each require separate explicit authorization.

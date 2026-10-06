# P12.2-L10.14 — legacy packet-013 non-recoverability and fresh-run guard

## Purpose

Migration 0010 is now applied and independently post-certified in Production. The new L10.13B persistence model can durably record exact terminal-failure URLs, accounting snapshots, and recovery receipts for future executions.

Packet 013 predates that model. This milestone determines whether packet 013 can be safely recovered from existing trustworthy historical evidence and defines the forward path without guessing or recrawling to manufacture history.

## Historical packet 013 facts

Packet 013 remains immutable historical evidence:

- run ID: `p12-2-diamond-shelf-full-interrupt-010`;
- execution-plan fingerprint: `0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa`;
- final checkpoint revision: `307`;
- final checkpoint fingerprint: `6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99`;
- total/finalized URLs: `3044 / 3044`;
- pending URLs: `0`;
- terminal failures: `1`;
- Railway execution deployment: `87389cf3-5aae-4c29-ab10-2023aa7f5aad`;
- terminal operator code: `p12_2_persistence_completed_run_not_certified`.

The retained Railway deployment log contains the terminal operator code but no canonical URL identity.

## Why the exact failed URL cannot be reconstructed

The evidence gap is structural, not a transient operational failure:

1. The legacy `first_party_crawl_checkpoints` persistence key is unique on site/run/execution-plan and later revisions UPDATE the same row. Intermediate checkpoint revisions are not a durable historical ledger.
2. Packet 013 executed before migration 0010 existed in Production, so there was no `first_party_crawl_terminal_failure_events` row for the failure.
3. Packet 013 also predates the L10.13B accounting snapshot path, so there is no legacy accounting snapshot that carries URL-level terminal evidence.
4. The crawler intentionally does not persist raw response bodies, page content, or raw sitemap XML.
5. The final aggregate `terminalFailures=1` counter proves that one terminal failure existed, but does not identify which of the 3,044 canonical URLs failed.
6. A fresh recrawl could reveal present-day behavior, but present-day behavior is not trustworthy historical identity evidence for the packet-013 failure.

Therefore no exact failed canonical URL is currently established by trustworthy historical evidence.

## Deterministic guard

`p12-2-l10-14-packet-013-nonrecoverability.ts` adds a pure deterministic assessment contract.

An exact legacy URL may be considered identified only when evidence is:

- bound to the exact packet-013 run ID;
- bound to the exact execution-plan fingerprint;
- a canonical `https://diamondshelf.us` URL;
- direct URL identity evidence rather than an aggregate counter or guess;
- immutable;
- contemporaneous with the legacy execution;
- from an explicitly accepted historical evidence source.

Aggregate checkpoints, manual guesses, or fresh recrawl results cannot satisfy the contract. Conflicting exact evidence fails closed.

Even if an exact URL were later established, this milestone itself grants no packet-013 recovery or backfill authority.

## Canonical packet-013 decision

With the evidence currently available, the deterministic canonical assessment is:

- status: `legacy_exact_url_unavailable`;
- exact canonical URL: none;
- packet-013 recovery authorized: false;
- packet-013 backfill authorized: false;
- fresh run required: true;
- safe next phase: `full_initial`.

Packet 013 therefore remains a historical, accounting-complete-but-uncertified predecessor and must not be mutated to simulate L10.13B evidence that did not exist when it ran.

## Fresh-run guard

The L10.14 fresh-run builder wraps the existing L2 one-shot packet contract and requires:

- a new run ID, never the packet-013 run ID;
- phase exactly `full_initial`;
- no resume binding;
- no incremental binding;
- no intentional-interruption binding;
- the existing explicit manual network/execution/persistence gates before a packet can even be constructed;
- one invocation attempt;
- no automatic whole-run retry;
- scheduler and autonomous worker disabled;
- provider and public-site writes disabled.

This creates a clean post-migration lineage. If that future run encounters a terminal failure, the L10.13B bridge will persist exact terminal-failure evidence atomically with checkpoint advancement and an accounting snapshot, enabling bounded evidence-based recovery rather than inference.

## Safety boundary

This milestone is repository-only engineering.

It does not:

- execute a sitemap, robots, or page request;
- execute packet 013 recovery;
- backfill packet 013;
- query or mutate Production PostgreSQL;
- change Railway;
- release or transition an image;
- activate a scheduler or worker;
- write to a provider or public site;
- deploy or publish the application.

Any future fresh full-site execution requires a separately constructed exact packet and a separate explicit live authorization.

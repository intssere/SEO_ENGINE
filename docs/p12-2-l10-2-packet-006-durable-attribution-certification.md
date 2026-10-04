# P12.2-L10.2 — packet 006 durable failure-attribution certification

This milestone provides a packet-specific, SELECT-only Production certification boundary for bounded-pilot packet 006.

It proves:

- exact packet/site/origin/run/timestamp identity;
- one durable L2 invocation row;
- completed L2 receipt and both receipt fingerprints;
- latest persisted checkpoint and counters;
- no whole-site completed run for the bounded pilot;
- persisted aggregate `boundedPilotFailureAttribution`;
- attribution categories sum exactly to `terminalFailures`;
- persisted attribution terminal failures equal the latest checkpoint terminal-failure counter.

The certification cannot crawl, schedule, publish, invoke providers, or mutate the database. Every SQL statement is a single SELECT and runtime PostgreSQL is additionally forced to `default_transaction_read_only=on`.

Packet 006 remains permanently consumed and is never replayed.

# P12.2-L9.2 — Production migration 0009 boundary

This milestone packages the already-merged `lib/db/migrations/0009_first_party_crawl_l2_bounded_pilot_phase.sql` for a three-stage Production path: read-only pre-certification, one-process one-attempt apply, and read-only post-certification.

Exact migration identity:
- Git blob: `50de28599a3d6268e8805423726f0102f2b8e0c9`
- SHA-256: `388c444384f9ea268b422a43596ead50d60effc5467c72e50751df6227614191`

Pre-state and post-state both require 38 public base tables and the exact Diamond Shelf site binding. Pre-certification requires the L2 phase constraint to exclude `bounded_pilot`; post-certification requires it to include `bounded_pilot`. Existing invocation rows must remain within the legacy phases before apply.

The apply runner starts exactly one psql process with ON_ERROR_STOP, 15-second statement timeout, 5-second lock timeout, zero retries and zero fallback. It hashes the copied migration before starting psql.

Repository work does not authorize image release, Production database mutation, Railway restart/redeploy, Production application transition, or crawl execution.

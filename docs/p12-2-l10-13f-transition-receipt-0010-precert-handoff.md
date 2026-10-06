# P12.2-L10.13F — Production transition receipt and migration-0010 pre-cert handoff

## Completed Production compatibility transition

L10.13E transitioned only `seo-engine-shadow` from the previous immutable image to the fixture-proven schema-compatible image.

- authorized transition fingerprint: `970db42c4ead3751365706cb9693484f686e6a83fa367ae71f29e6937f3e5a0b`
- staged/committed patch: `fe96638e-8cf4-473e-872e-5fb4e3dc5703`
- old image: `ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283`
- new image: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`
- forward deployment: `11362736-c4ea-43a0-9e4b-f6627acdee24`
- deployment snapshot: `58a72727-79f4-42bb-a5ac-53fb1e52bffc`
- terminal status: `SUCCESS`
- attempts: 1
- retries: 0
- automatic rollback: not used

Final application state remained:

- `live` / Online
- 1/1 replica
- region `europe-west4-drams3a`
- healthcheck `/api/healthz`, timeout 120 seconds
- Runtime V2
- Dockerfile builder, build environment V3
- Railway domain `seo-engine-shadow-production.up.railway.app` on port 8080
- zero custom domains
- zero app volumes
- zero warnings / criticals / recent failures
- zero staged changes
- zero pending work

Postgres remained live with its existing deployment and persistent volume unchanged.

No migration `0010`, Production database read/write, scheduler/worker activation, crawl/recovery execution, or provider/public-site write occurred.

The L10.13E authorization is consumed and must never be reused.

## Migration-0010 next boundary

The application compatibility prerequisite is now satisfied. The next sequence returns to the already-merged L10.13C migration lane:

1. release the L10.13C-A immutable pre-certification image from the then-current canonical `main`;
2. execute the L10.13C-A SELECT-only pre-apply certification once;
3. only if pre-certification passes, release the L10.13C-B exact migration-apply image;
4. apply migration `0010` once under its separate authorization;
5. release and execute L10.13C-C post-apply read-only certification.

A subsequent first authorized L10.13C-A pre-certification attempt proved that the 44-table assumption was incorrect for Production: the deployed application independently reported `tableCount=38`, and the certification failed closed at its pre-state guard with one attempt, zero retries, and no write. The repaired L10.13C-A boundary therefore requires the exact 38-table Production lineage, with migrations `0005–0007` absent, durable L2/migration-0009 shape present, the three L10.13B tables absent, and packet-013 durable checkpoint/invocation evidence unchanged.

This L10.13F milestone does not release any migration image and performs no Production database query.

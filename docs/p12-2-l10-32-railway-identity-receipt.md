# P12.2 L10.32 — L10.31 Railway identity receipt and provenance boundary

**Scope:** Documentation of completed *authorized metadata-only* inspection; no new live inspection.  
**Issue:** #960. **Source baseline:** `cef497725db615e8d7254d5a52f8ed9aba70d330`.  
**Authorization consumed:** `AUTHORIZE:P12_2_L10_31_RAILWAY_METADATA_ONLY:3_READS:52265e29-921b-4652-ac0d-9da4e5e69936:7f8d920f-f6c6-44f0-b9fe-252cb4f32298:1e8c1e7d-16f7-4c63-8193-1021bcbe6d90:NO_SQL_NO_WRITES`. Three permitted reads were made, none remain.

## Fresh control-plane observations (October 9, 2026)

Exactly three Railway connector operations were performed in L10.31:
1. `describe_environment` for the exact approved project/environment;
2. `describe_service` for the exact approved project/environment/service;
3. `list_deployments` restricted to the exact approved project/environment/service, limit five.

Responses independently agree on these observed values:

| Item | Observed evidence |
|---|---|
| Railway project | `52265e29-921b-4652-ac0d-9da4e5e69936` — SEO ENGINE |
| Environment | `7f8d920f-f6c6-44f0-b9fe-252cb4f32298` — production, non-ephemeral |
| Service | `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` — seo-engine-shadow, live |
| Service source | `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2` |
| Latest deployment | `11362736-c4ea-43a0-9e4b-f6627acdee24` |
| Deployment state | SUCCESS, created 2026-10-06T11:13:16.813Z, updated 2026-10-06T11:13:25.309Z |
| Pending environment patch | null |
| Pending service staged changes | zero |

Historical F24 `CURRENT_STATE.md` records image `sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22` and deployment `18486079-d88f-4376-bc5c-abc14e190b7c`. **Both differ** from the freshly observed current values. The historical record remains intact and must not be silently rewritten as current state.

## Conclusion and limitations

**PASS_IDENTITY (Railway control-plane scope only).** The three exact selectors, deployed source image digest and most recent deployment are established at inspection time. This does **not** prove runtime source-tree identity, current health by application-level probes, database identity/schema contents, SQL execution permission, Packet 014 presence, or website/crawl freshness. `SUCCESS` is a Railway deployment status, not complete SEO ENGINE acceptance. Avoid inferring when/why the image changed or which GitHub commit produced it.

**Zero** Railway writes, image transitions, deployment changes, environment variable accesses, Production DB connections/SQL, provider/crawl accesses, and historical Packet 014 mutations were authorized or performed.

## Next required gates (not executed)

1. **Provenance:** Independently trace immutable image digest `45cbaecd…` to attested build/source tree and release receipt, with digest equality and a trusted registry/build evidence path. GitHub `main` alone is not proof the deployed image contains L10.26 or L10.27 code.
2. **Source/runtime compatibility:** Determine whether the running image requires the L10.26 reader module or whether exact SQL can be emitted from independently certified source under a separately approved least-privileged external reader. Do not deploy just to make these match.
3. **Database identity and least privilege:** Define a distinct human-authorized bounded read-only database identity/schema inspection. Do not borrow the exhausted Railway metadata approval for it.
4. **One-shot Packet 014 SQL:** Only after preceding gates pass, request fresh authorization for exact three L10.26 SELECTs, ordered fingerprint, read-only transaction/role, timeout/cardinality limits, evidence location and terminal PASS/BLOCKED disposition.
5. **Program:** P12.3–P12.10 remain pending and require independent certification.

**Current permitted work:** GitHub code/documentation review and PR/CI; no more Railway metadata calls absent new authorization. This document is a receipt of earlier observations, not a new credential or operation authorization.

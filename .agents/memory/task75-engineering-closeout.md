# Task #75 — GSC OAuth Profile-Isolated Runtime Binding Foundation v1 — Engineering Closeout

## Status

Task #75 engineering is complete, CI-certified, merged to canonical GitHub `main`, and Git-only synchronized to Replit. It has **not** been published/redeployed.

Authoritative issue: #142  
Implementation PR: #143

## Canonical lineage

Starting baseline:
- GitHub main: `f7fa31c6d3ad619cebaa26caa46e236b10d22a43`
- tree: `1f9ad207c8ae34b60b5adddd55ddf3daf21feb7f`
- baseline post-merge CI #243: success

Initial PR head:
- `f6216e0b69af56b8538998cc19e47a304cda5fe2`
- CI #244 / run `34890488841`
- Task tests and full workspace tests passed
- typecheck failed only in the new test capture because TypeScript did not narrow a value assigned from an injected async callback; production behavior was not implicated.

Corrected exact tested head:
- `45302ccfe5f289481b82a7fdeb0450e8a3e0d7cd`
- CI #245 / run `34890806443`: success
- Task tests: success
- full workspace tests: success
- typecheck: success
- build: success

Merge:
- `b6ae18db99baf022cdb7368f3e17c4bb1fa1a687`
- tree: `66cc24c044145eb93a8a198e3ca817db1aaeaffd`
- post-merge CI #246 / run `34891284127`: success

## Replit engineering synchronization

After post-merge CI, Replit was Git-only synchronized and verified:
- branch: `main`
- HEAD: `b6ae18db99baf022cdb7368f3e17c4bb1fa1a687`
- tree: `66cc24c044145eb93a8a198e3ca817db1aaeaffd`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

No publication/redeployment, runtime/config/environment mutation, DB/schema/data operation, credential/OAuth/provider mutation, safety-gate change, provider request, or public-site mutation occurred.

## What Task #75 implemented

Task #75 closes the Task #74 legacy-callback isolation gap at the runtime-foundation level.

The implementation adds:
- dedicated GSC-purpose OAuth start behavior;
- sealed Task #72 `gsc_read_only_v1` state;
- exact-true default-off `GSC_READONLY_OAUTH_RUNTIME_ENABLED` gate;
- GSC-specific config slots `GSC_OAUTH_CLIENT_ID` and `GSC_OAUTH_CLIENT_SECRET` with no fallback to legacy `GOOGLE_OAUTH_*`;
- shared Google callback purpose classification before legacy client-config selection, token exchange, provider transport or discovery;
- fail-closed handling for unknown Google OAuth purpose;
- exact single granted scope enforcement for `https://www.googleapis.com/auth/webmasters.readonly` in the pure injected orchestration path;
- GSC-only discovery dependency modeling;
- exact persistence identity `google#gsc-read-only-v1`;
- tests proving GSC state cannot fall through to GA4 discovery or generic `google` persistence;
- sanitized runtime capability reporting.

## Deliberately still inert

Task #75 does **not** bind a real Google transport. A GSC-purpose callback validates its isolated purpose/state/gate and then deliberately fails closed with the live transport unbound.

Therefore Task #75 performed none of the following:
- real Google OAuth client creation/configuration;
- client-secret placement/use;
- OAuth consent;
- access/refresh token acquisition;
- `sites.list` provider request;
- Search Analytics provider request;
- Search Console property binding;
- Task #70 live execution;
- observation/evidence persistence;
- scheduler/batch/worker/retry activation;
- DDL;
- provider/public-site mutation.

## Production release state

The currently published application source remains Task #73:
- SHA `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID `fbef9788-c08d-475d-a85d-88ede16e92c7`

Task #75 is engineering-complete but **not published**.

## Next boundary

A real GSC OAuth client is still blocked until Task #75 is separately published inert and production-certified under explicit publication authorization, as required by Task #74.

While publication/live-provider authorization is pending, the master roadmap permits the next safe/default-off engineering lane. The preferred next milestone is **P2.1 — Full-Site Crawl Controller Architecture: `baseline` vs `full_site`**, preserving the current 30-page baseline while designing a sitemap/inventory-driven, resumable, rate-limited, trap-resistant full-site crawl mode.

Generic `continue` may advance that pure/default-off crawler engineering task after this closeout is complete. It does not authorize Task #75 publication or any real Google/provider action.

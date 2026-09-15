# P2.7 — URL Explorer API/query model v1 closeout

## Scope

Roadmap P2.7 established a pure, deterministic, bounded, read-only URL Explorer query-model foundation over already supplied P2.2 sitemap inventory and an optional valid P2.6 incremental-recrawl plan. It did not add a network-facing route, live crawl/sitemap fetch, provider request, persistence/DDL, scheduler/worker execution, competitor execution, OAuth live stage, provider/public-site write, or publication path.

## Certified implementation lineage

- baseline `main`: `f640eb7c9d017a0e8e6faf4344332b18b1476023`
- baseline tree: `2e201263c28e50133c3d814466d51864dbd1e69a`
- issue: #165
- superseded PR: #166
  - head: `bf9294a3f4bdff1a338194167783ba6f485832f8`
  - CI #281 / run `35012502576`: failure
  - intentionally closed unmerged after the certified replacement merged
- certified implementation PR: #167
- exact tested PR head: `3046ab6f77604be45b175cf793948ea28908d33d`
- PR CI #282 / run `35021282299`: success
- merge: `f8e1d406b4985247f8b115b0105980e32510820e`
- merge tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- post-merge main CI #283 / run `35021463871`: success

Both certified runs passed the P2.7 task gate plus the repository workspace tests, typecheck, and build.

## Contract delivered

P2.7 provides:

- exact `siteId` and canonical-origin binding;
- semantic integrity checks for supplied P2.2 inventory before querying;
- optional P2.6 plan integrity and current-inventory lineage binding;
- stable URL identity plus canonical URL/pathname fields;
- retained sitemap source and `lastmod` fields only when upstream evidence actually contains them;
- P2.6-selected/deferred/not-planned recrawl membership, priority, and reasons only when proven by a valid supplied plan;
- deterministic filtering, sorting, bounded offset/limit pagination, and fingerprints;
- explicit unavailable per-URL dimensions for HTTP status, fetch outcome, redirect target, canonical target, indexability, and content fingerprint rather than inference;
- sanitized outputs with no raw HTML/XML/provider payload/token/secret/credential fields;
- explicit closed authorization/capability state for network execution, crawl execution, persistence, schedulers/workers, provider reads/writes, and public-site writes.

## Replit engineering reconciliation

After post-merge main CI succeeded, the Replit `SEO_ENGINE` workspace was Git-only reconciled and independently re-inspected at:

- branch: `main`
- HEAD: `f8e1d406b4985247f8b115b0105980e32510820e`
- tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- cached `origin/main`: same SHA/tree
- ahead/behind: `0/0`
- tracked changes: `0`
- untracked files: `0`
- working tree: clean
- extra local commit: none

No application publish/redeploy occurred during this synchronization.

## Published production remains separate

The currently published production application source remains Task #73:

- source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- deployment status: success

P2.7 is an engineering foundation only and has not been published as an application release.

## Durable lesson / next boundary

Do not infer URL-level crawl facts from aggregate completion artifacts. Until later evidence models actually retain per-URL fetch/indexability/content facts, URL Explorer must expose those dimensions as unavailable.

The next safe roadmap milestone is **P2.8 — Technical issue taxonomy and evidence model expansion**. It should remain a pure/default-off engineering task unless separately authorized otherwise; no live crawling, provider request, persistence/DDL, scheduler/worker activation, public-site/provider mutation, or publication is implied by this closeout.

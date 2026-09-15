# P2.2 — Sitemap Inventory / Discovery + Canonical Dedupe Foundation closeout

## Status
Engineering-complete, exact-head CI-certified, merged to canonical GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit. Not published. No live sitemap request or crawl occurred.

Authoritative issue: #151  
Implementation PR: #152

## Certified lineage
- starting `main`: `90b5adfe0f38de0c7c0667d4ba4f58dff188c14d`
- starting tree: `0c72752eb40fac7aae6dfcba108def2279521bfc`
- exact tested PR head: `b30e0b16bcf198a0e484b77712682ede13e6ab85`
- PR CI #258 / run `34989940853`: success
- implementation merge: `7822504b1d5cf6bbd9f1a5f797320526830978b4`
- implementation tree: `f7bab25db2d3b0ab0e2c45ecc52b1a961cb82d6e`
- post-merge main CI #259 / run `34990146084`: success

PR CI #258 and post-merge CI #259 both passed task tests, full workspace tests, typecheck and build.

## Replit reconciliation
After post-merge CI #259, Replit was Git-only synchronized and read-only verified at the exact implementation merge:
- branch: `main`
- HEAD: `7822504b1d5cf6bbd9f1a5f797320526830978b4`
- tree: `f7bab25db2d3b0ab0e2c45ecc52b1a961cb82d6e`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false.

No publication/redeploy, app run, live sitemap/crawl/provider/public-site request, runtime/config/environment mutation, DB/schema/data action, persistence activation, credential/OAuth/provider mutation, safety-gate change, competitor action, scheduler/worker/batch/retry action, provider/public-site write, or other non-Git mutation occurred.

## Implementation
P2.2 adds exactly three files under the API-server library:
- `sitemap-inventory.ts`
- `sitemap-inventory.test.ts`
- `sitemap-inventory-hardening.test.ts`

It is a pure deterministic supplied-document inventory layer for P2.1 `full_site` plans. It contains no network fetch primitive, provider client, crawler endpoint, DB write, persistence path, scheduler or autonomous execution path.

### Input and plan binding
The inventory builder accepts only a valid P2.1 `first_party_crawl_controller_v1` plan in `full_site` mode. It requires:
- explicit first-party site identity;
- normalized HTTPS canonical origin inherited from P2.1;
- sitemap-first inventory intent;
- same-origin control;
- canonical-deduplication control;
- all P2.1 execution/persistence/competitor/write authorizations still closed.

Baseline plans fail closed.

### Finite sitemap/inventory controls
Planning policy requires finite integer ceilings for:
- supplied sitemap documents;
- sitemap nesting depth;
- UTF-8 bytes per supplied document;
- unique inventory URLs;
- URL path segments.

Code-level absolute ceilings are:
- documents: 1,024
- nesting depth: 8
- bytes/document: 50,000,000
- inventory URLs: 25,000
- path segments: 64.

The configured inventory URL ceiling must also be less than or equal to the P2.1 crawl plan `pageHardLimit`.

Invalid, unbounded, fractional, negative or above-absolute values fail closed.

### XML safety and parsing
The dependency-free sitemap-specific XML reader:
- strips UTF-8 BOM;
- accepts only `sitemapindex` and `urlset` roots;
- rejects DTD/entity declarations;
- rejects malformed/multiple roots and invalid nesting;
- validates supported XML/XMLNS attribute syntax;
- supports namespace-prefixed sitemap elements by local name;
- decodes only XML built-in/numeric entities once;
- captures only direct `<url><loc>`, direct `<url><lastmod>`, and direct `<sitemap><loc>`;
- ignores nested extension locs for page identity, preventing e.g. `image:loc` from overwriting the page URL;
- does not retain raw XML in normalized output or fingerprint state.

### URL policy and canonical dedupe
Inventory/document URLs are deterministic and first-party constrained:
- HTTPS only;
- no embedded credentials;
- exact canonical origin;
- no fragments;
- no query strings in this foundation;
- utility/trap paths `/cart`, `/checkout`, `/account`, `/apps` excluded;
- configured path-depth ceiling enforced;
- repeated path slashes normalized;
- trailing root/path slash identity normalized.

Explicit rejection reasons include:
- `invalid_url`
- `unsupported_scheme`
- `credentials_not_allowed`
- `cross_origin`
- `fragment_not_allowed`
- `query_not_allowed`
- `excluded_path`
- `path_depth_exceeded`
- `sitemap_depth_exceeded`
- `inventory_url_limit_reached`.

Accepted URL occurrences are deduplicated by normalized canonical URL identity. Source sitemap provenance is merged/sorted and the latest valid normalized `lastmod` is retained.

### Traversal and completeness
Traversal starts from the supplied root sitemap and processes only supplied documents. Missing referenced sitemap children are recorded explicitly and make the inventory incomplete; the code never falls back to a network request.

Output records:
- supplied/processed/referenced document counts;
- missing supplied child documents;
- accepted occurrences;
- duplicate occurrences;
- unique canonical URLs;
- sorted rejection entries and per-reason counts;
- completeness reasons;
- whether a configured hard limit was reached;
- deterministic SHA-256 fingerprint over sanitized normalized state.

Authorization state in every result hard-codes false for:
- network fetching;
- crawl execution;
- persistence;
- scheduler;
- batch executor;
- autonomous worker;
- retry loop;
- competitor collection/persistence;
- provider writes;
- public-site writes.

## CI #257 fixture incident
PR CI #257 / run `34989513456` passed the dedicated task tests but failed one full-workspace API-server assertion. The implementation was not merged.

The failing fixture expected `&amp;unknown;` to behave like an undefined XML entity. That expectation was incorrect: XML decodes `&amp;` once to a literal `&`, so the string represents literal text `&unknown;` rather than a raw entity reference. The test was corrected to raw `&unknown;`. Parser/runtime behavior was not weakened to satisfy the test.

The corrected exact head `b30e0b16bcf198a0e484b77712682ede13e6ab85` then passed CI #258 fully, followed by green post-merge CI #259.

## Other bookkeeping notes
- One GitHub content update initially returned a blob-SHA mismatch while parser hardening was being applied. The update was not forced; the current blob SHA was resolved and the reviewed hardening was reapplied normally. No content was overwritten.
- One accidental connector call attempted to update nonexistent PR `#999999` and returned 404. It created no issue/PR/code/runtime/repository state and had no side effect.

## What P2.2 did not do
P2.2 did not:
- fetch a sitemap;
- execute a crawl;
- add a crawler/sitemap API route;
- persist inventory/observations/evidence;
- modify schema or data;
- add DDL;
- enable runtime/environment gates;
- enable scheduler/worker/batch/retries;
- modify competitor acquisition permissions;
- perform provider/public-site writes;
- create/use real OAuth credentials;
- publish or redeploy the application.

## Next safe boundary
Roadmap **P2.3 — Batched crawler, rate limits, trap guards, checkpoints/resume**.

P2.3 should initially remain default-off and first-party-only. It should compose P2.1 + P2.2 into a bounded execution architecture with explicit batch sizing, per-origin rate/concurrency budgets, redirect/trap protections, deterministic checkpoint/resume state, safe bounded retry classification, replay/idempotency controls, and completion-state handoff toward P2.4. It must not silently activate live full-site crawling, persistence, scheduler/autonomous worker, competitor collection, provider/public-site writes, or publication. Any live network-execution stage remains a separate authorization boundary.

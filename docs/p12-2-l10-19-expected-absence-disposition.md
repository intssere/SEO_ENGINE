# P12.2-L10.19 — Packet 014 expected-absence disposition and reconciliation

## Purpose

Packet 014 is already durably finalized by L10.18 as:

- packet fingerprint: `b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`
- run: `p12-2-diamond-shelf-post-0010-full-014`
- final checkpoint revision: `306`
- final checkpoint fingerprint: `f1aee026cc2227f9d72642e25b7ed4935fdfa94bcdc508e4eda7344a2d2b608f`
- total/finalized/pending: `3044 / 3044 / 0`
- fetched successful: `3043`
- raw terminal failures: `1`
- exact failed URL: `https://diamondshelf.us/blogs/news`
- terminal event fingerprint: `2ad7b75d87a05d4c49090afef13278b96a635b881391bd835ae3388e8d989693`
- compact accounting snapshot: `abbc068af41e6deb975d8512cef8e614b7374296b41b39c8e5538c12190e7e66`
- L2 receipt: `ceda9e572d2a3c2d8faa4c6b37e3d377445d2dcb6f6fadc62e13c99c15ee88c8`
- effective L10.18 state: `accounting_complete_uncertified_compact_finalized`.

The operator confirms that `/blogs/news` is not a real Diamond Shelf page.

L10.19 does **not** create the page, fabricate a success, or run terminal-failure recovery.

Its purpose is to determine whether the one historical failure is an expected permanent absence and, if so, append an explicit disposition and reconciliation record while preserving all historical crawl evidence.

## Required evidence

Disposition is permitted only when **both** historical and current evidence prove expected absence.

### Historical evidence

The original immutable Packet-014 terminal event must itself prove:

- event type `terminal_failure`;
- decision reason `permanent_http`;
- outcome kind `failure`;
- signal kind `http_status`;
- HTTP status exactly `404` or `410`;
- exact event fingerprint `2ad7b75d…`;
- exact URL `https://diamondshelf.us/blogs/news`.

A current 404/410 is not allowed to rewrite a different historical failure reason.

### Current evidence

The live verifier performs:

1. exactly one bounded GET of `https://diamondshelf.us/blogs/news`;
2. a bounded fresh same-origin HTTPS sitemap acquisition;
3. a fresh deterministic sitemap inventory build.

The current URL must also return exactly 404 or 410.

The verifier persists no response body, page content, or raw sitemap XML.

## Disposition classes

### `stale_inventory_absence`

Use when:

- historical event was 404/410;
- current GET is 404/410;
- the exact URL is absent from the fresh authoritative sitemap inventory.

### `sitemap_orphan_absence`

Use when:

- historical event was 404/410;
- current GET is 404/410;
- the exact URL is still present in the fresh sitemap inventory.

This means the page is still nonexistent but the sitemap remains stale/broken. It is a crawl-completeness disposition, **not** a claim that sitemap SEO health is clean.

No other category may be inferred automatically.

## Historical accounting is preserved

L10.19 never changes:

- checkpoint revision 306;
- raw checkpoint terminal-failure counter `1`;
- original terminal-failure event;
- L10.18 compact accounting snapshot;
- L2 invocation/receipt;
- completed-run table;
- recovery receipts.

The new reconciliation semantics are:

- raw terminal failures: `1`;
- expected absence dispositions: `1`;
- effective unresolved terminal failures: `0`;
- status: `certified_with_expected_absence`;
- legacy `wholeSiteCertified`: remains `false`;
- completed-run row: remains absent.

This distinguishes crawl completeness from SEO health without inventing a successful page fetch.

## Migration 0011

Migration:

`lib/db/migrations/0011_first_party_crawl_expected_absence_disposition.sql`

Git blob:

`8749184f481474a4a085eaacf3ff154e8ebfe903`

SHA-256:

`07a0ad844d34b401a8972a70a4bf767cf0c8853679ce5203c8a9f1b35bb9a700`

It adds exactly two append-only tables:

- `first_party_crawl_terminal_failure_dispositions`;
- `first_party_crawl_terminal_failure_reconciliation_receipts`.

Both reuse the existing L10.13B immutable UPDATE/DELETE rejection function.

Selective Production table count moves from 41 to 43. Runtime identity classification distinguishes that 43-table Production shape from the unrelated 43-table P8.8 engineering shape.

## Production authorization sequence

Every boundary is separate.

### 1. Historical-event preflight image release

Image:

`ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-preflight`

Release authorization:

`AUTHORIZE:P12_2_L10_19_PACKET_014_PREFLIGHT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

### 2. Historical-event Production SELECT-only preflight

Ten SELECT-only queries under:

`default_transaction_read_only=on`

Authorization:

`AUTHORIZE:P12_2_L10_19_PACKET_014_PRE_EXEC_READ_ONLY:<FINGERPRINT>`

This must prove the original event is 404/410 before any DDL.

### 3. Migration 0011 image release

Image:

`ghcr.io/intssere/seo-engine-p12-2-l10-19-a-0011-apply`

Release authorization:

`AUTHORIZE:P12_2_L10_19_0011_APPLY_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

### 4. Migration 0011 Production apply

Authorization:

`AUTHORIZE:P12_2_L10_19_0011_APPLY:<FINGERPRINT>`

One `psql` process performs exact preflight, applies only migration 0011, then proves exact post-state.

### 5. Post-migration cert image release

Image:

`ghcr.io/intssere/seo-engine-p12-2-l10-19-b-0011-post-cert`

Release authorization:

`AUTHORIZE:P12_2_L10_19_0011_POST_CERT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

### 6. Post-migration Production SELECT-only certification

Authorization is bound to the exact migration-apply Railway deployment:

`AUTHORIZE:P12_2_L10_19_0011_POST_APPLY_READ_ONLY:<FINGERPRINT>`

The two new tables must be empty before disposition execution.

### 7. Expected-absence disposition image release

Image:

`ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition`

Release authorization:

`AUTHORIZE:P12_2_L10_19_PACKET_014_EXPECTED_ABSENCE_DISPOSITION_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

### 8. Production live-read + disposition execution

Authorization:

`AUTHORIZE:P12_2_L10_19_PACKET_014_EXPECTED_ABSENCE_DISPOSITION:<FINGERPRINT>`

The fingerprint is bound to the immutable verifier image digest.

This boundary authorizes only:

- one exact URL GET;
- bounded fresh sitemap reads;
- one disposition insert;
- one reconciliation insert.

It does not authorize crawl replay, recovery, provider writes, public-site writes, checkpoint mutation, historical-event mutation, accounting mutation, L2 mutation, completed-run creation, or recovery-receipt creation.

### 9. Post-disposition cert image release

Image:

`ghcr.io/intssere/seo-engine-p12-2-l10-19-c-packet-014-post-disposition-cert`

Release authorization:

`AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_CERT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

### 10. Post-disposition Production SELECT-only certification

Authorization is dynamically bound to:

- exact disposition Railway deployment ID;
- exact immutable disposition verifier image digest.

Literal:

`AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_READ_ONLY:<FINGERPRINT>`

Successful terminal classification:

`certified_with_expected_absence`

## Safety / non-scope

L10.19 does not authorize:

- creating `/blogs/news`;
- synthetic 200/success/noindex/redirect;
- crawl retry/resume/replay;
- terminal-failure recovery;
- checkpoint mutation;
- original terminal-event mutation;
- L10.18 accounting or L2 mutation;
- completed-run creation;
- provider/public-site writes;
- scheduler/autonomous worker activation.

If the historical event is not 404/410, the lane stops at the historical-event preflight and a different root-cause milestone is required.

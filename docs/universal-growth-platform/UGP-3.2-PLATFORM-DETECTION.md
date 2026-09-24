# UGP-3.2 — Evidence-backed Platform Detection

**Status:** implementation candidate on `ugp-032-platform-detection`  
**Issue:** #505  
**Target:** `initiative-universal-growth-platform`

## Goal

Replace the pre-analysis URL-pattern hint with a deterministic, evidence-backed **advisory** platform/framework classifier.

UGP-3.2 does not connect a CMS, verify a provider account, grant connector capability, or execute any request. It consumes only caller-supplied observations already collected elsewhere and binds its result to a UGP-3.1 public-web resolution.

Pipeline:

```text
UGP-3.1 plan + resolution
        +
caller-supplied observations
        ↓
bounded normalization
        ↓
deterministic evidence signals
        ↓
advisory classification
```

## Detection families

The v1 family vocabulary is:

- `shopify`
- `wordpress`
- `woocommerce`
- `webflow`
- `wix`
- `headless_custom`
- `unknown`

`woocommerce` is distinct from generic WordPress. WordPress-base evidence is compatible supporting evidence when WooCommerce-specific evidence wins.

## Supplied observation contract

The detector accepts bounded normalized observations of these kinds:

- response header name/value;
- meta name/value, including generator metadata;
- asset/script URL;
- normalized HTML marker token;
- structured-data type;
- same-origin observed path plus supplied response status.

The detector does not parse raw HTML, issue path probes, resolve DNS, follow redirects, fetch assets, fetch robots, or crawl pages.

Header/meta values are used during classification but are represented in provenance by fingerprints rather than copied into the result. Raw HTML is not accepted as an HTML marker: markers are compact normalized tokens such as `data-wf-page`, `woocommerce-page`, or `__next_data__`.

## Evidence examples

### Shopify

Strong/moderate examples include:

- `x-shopify-*` or `x-sorting-hat-*` response headers;
- Shopify-attributed generator/response metadata;
- `cdn.shopify.com`, `/cdn/shop/`, or `/shopifycloud/` assets;
- normalized Shopify HTML markers.

A `.myshopify.com` hostname is weak evidence only.

### WordPress

Examples include:

- WordPress generator metadata;
- `api.w.org` Link response metadata;
- XML-RPC pingback response metadata;
- `/wp-content/` or `/wp-includes/` assets;
- supplied successful observations of `/wp-json/`, `/wp-admin/`, or `/wp-login.php`.

A `.wordpress.com` hostname is weak evidence only.

### WooCommerce

Examples include:

- WooCommerce generator metadata;
- WooCommerce-specific response headers;
- `/wp-content/plugins/woocommerce/` assets;
- WooCommerce HTML markers;
- supplied successful WooCommerce REST-path observations.

WooCommerce-specific evidence is weighted above generic WordPress-base evidence so a WordPress installation with WooCommerce can be described specifically without treating the WordPress base as contradictory.

### Webflow

Examples include:

- Webflow generator/response attribution;
- `assets.website-files.com` / Webflow asset fingerprints;
- `data-wf-*` normalized HTML markers.

A `.webflow.io` hostname is weak evidence only.

### Wix

Examples include:

- `x-wix-*` response metadata;
- Wix generator metadata;
- Wix/Parastorage asset fingerprints;
- normalized Wix HTML markers.

A Wix-hosted hostname is weak evidence only.

### Headless/custom

Headless/custom requires affirmative framework evidence, for example:

- Next.js / Nuxt / Gatsby / Astro generator metadata;
- recognized framework asset paths;
- recognized normalized framework HTML markers.

The detector never classifies a site as headless/custom merely because no CMS evidence was found.

## Result semantics

The detector returns:

- `state`: `identified | ambiguous | unknown`;
- `candidatePlatform`;
- `evidenceGrade`: `none | weak | moderate | strong`;
- `confidence`: `none | low | medium | high`;
- all matched evidence signals;
- supporting evidence;
- contradictory evidence;
- scored alternate candidates;
- normalized observation counts;
- UGP-3.1 plan/resolution lineage;
- observation fingerprint;
- detection fingerprint;
- a fully closed authorization object.

Confidence is a deterministic evidence band, **not a probability** and not a verification claim.

## Anti-overclaim rules

- Hostname patterns alone cannot produce `identified`.
- Competing strong evidence with insufficient score separation returns `ambiguous`.
- No matched platform evidence returns `unknown`.
- Headless/custom requires explicit framework evidence.
- A detected platform is not a verified connection.
- A detected platform grants no connector capability.
- Selection in the wizard or future UX does not grant execution authority.

## UGP-3.1 lineage

UGP-3.2 requires:

- a valid UGP-3.1 plan;
- exact plan fingerprint binding from the supplied resolution;
- supplied-only resolution provenance;
- final HTTPS first-party identity consistency;
- closed UGP-3.1 authorization state;
- a syntactically valid UGP-3.1 resolution fingerprint.

UGP-3.1 does not retain all redirect/DNS evidence required to recompute its resolution fingerprint later. UGP-3.2 therefore does not pretend to reconstruct unavailable upstream evidence; it validates the retained UGP-3.1 identity/authority contract and binds the detection artifact to the supplied resolution fingerprint.

## Authority boundary

Every UGP-3.2 result keeps:

- network read authorized = false;
- crawl execution authorized = false;
- persistence authorized = false;
- connector capability granted = false;
- scheduler enabled = false;
- autonomous worker enabled = false;
- provider writes = false;
- public-site writes = false.

UGP-3.2 adds no:

- API route;
- DNS/HTTP client;
- crawler;
- database/schema change;
- persistence;
- credential/config change;
- scheduler/worker activation;
- provider/public-site mutation;
- deployment/publication.

The detector is deliberately not imported by non-test API runtime source.

## Relationship to UGP-3.3

UGP-3.2 answers only:

> Given a validated UGP-3.1 site identity and supplied observations, what platform/framework classification is defensible?

UGP-3.3 remains responsible for the actual universal read-only site-analysis/runtime integration and for safely producing observations from the existing crawl architecture. UGP-3.3 must reuse the existing crawl safety model rather than creating a competing crawler.

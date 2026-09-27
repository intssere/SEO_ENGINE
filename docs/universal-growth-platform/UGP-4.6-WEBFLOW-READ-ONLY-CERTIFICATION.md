# UGP-4.6 — Webflow read-only provider certification boundary

## Purpose

UGP-4.6 supplies the provider-free contract/harness for the second non-Shopify CMS required by the UGP-4 exit criteria. It does **not** perform a live Webflow request and does not certify provider connectivity by itself.

## Maintained Webflow interface

The boundary models Webflow Data API v2 reads only:

- `GET https://api.webflow.com/v2/sites/{site_id}/pages` → universal `page`, provider scope `pages:read`;
- `GET https://api.webflow.com/v2/sites/{site_id}/collections` → universal `collection`, provider scope `cms:read`.

The Webflow site ID is bound to the universal connection's `externalAccountId` and must be a 24-character lowercase hexadecimal object ID. The universal site canonical origin remains the customer website origin; the provider API origin is separately fixed to `https://api.webflow.com`.

## Fail-closed contract

The plan requires:

- provider exactly `webflow`;
- a connected `api` connection;
- exact Webflow site identity;
- `GET` only;
- one of the two explicitly supported resources;
- a matching universal read-only capability;
- the provider scope required for that resource;
- bounded result count, maximum 100.

Receipt normalization requires:

- the exact planned Webflow API URL;
- HTTP 200;
- JSON-compatible caller-supplied evidence;
- normalized payload no larger than 1,000,000 bytes.

The contract emits deterministic request, state, and receipt fingerprints.

## Safety semantics

The implementation is intentionally:

- fixture/caller-evidence certification only;
- live transport disabled;
- credential material rejected by this boundary;
- authorization not granted;
- provider writes disabled;
- public-site writes disabled.

It adds no OAuth flow, token storage, network client, persistence, database/schema change, scheduler/worker activation, deployment, publication, or write/publish operation.

## Live certification gate

A later UGP-4.6L step may certify these reads against one explicitly approved Webflow site/account. That step requires separate authorization for the exact target and exact GET endpoints, plus an approved credential-handling execution path. A token or credential must never be committed to the repository or emitted in evidence.

UGP-4 remains exit-blocked until live Webflow evidence is normalized through this boundary and the separate UGP-4.7 Git-backed custom-site read/PR path is certified.

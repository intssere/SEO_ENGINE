# UGP-10.4 — Evidence-Bound Outreach Draft Preparation Brief

Version: `ugp-10-4-outreach-draft-brief-v1`

## Purpose

UGP-10.4 introduces the first bounded stage after the durable UGP-10.3 human review decision.

It converts the exact UGP-10.1/10.3 review workspace into deterministic **draft-preparation briefs** for prospects that are already terminally `approved_for_draft`.

This increment deliberately does **not** generate outreach text.

It prepares only the evidence and constraints that a future separately authorized drafting stage would be allowed to consume.

## Why a separate draft-preparation stage is required

`approved_for_draft` means a human reviewer has approved an evidence-bound prospect to proceed toward drafting.

That approval does not guarantee that the system has a safe owned destination page to reference.

The existing authority opportunity model deliberately permits opportunities such as:

- `competitor_link_gap`;
- `domain_intersection`;
- some supplemental opportunities;

to have `targetUrl = null`.

UGP-10.4 therefore refuses to invent a target page.

An approved prospect without an existing evidence-bound owned target URL enters:

`target_binding_required`

rather than becoming draft-ready.

## Input boundary

UGP-10.4 consumes:

- the exact UGP-9.4 prospect qualification result;
- the exact UGP-10 review history.

It rebuilds the UGP-10.1 workspace and runs:

`assertAuthorityOutreachWorkspaceIntegrity(...)`

before preparing any draft brief.

No opaque precomputed workspace or client-supplied draft context is trusted.

## Preparation states

Each workspace item maps to one of these bounded states:

| Workspace condition | UGP-10.4 state |
| --- | --- |
| `approved_for_draft` + existing owned `targetUrl` | `draft_brief_ready` |
| `approved_for_draft` + missing `targetUrl` | `target_binding_required` |
| awaiting/qualification review | `human_review_required` |
| rejected | `rejected` |
| deferred | `deferred` |
| insufficient evidence / blocked | `qualification_blocked` |

No state transition occurs automatically.

## Draft brief lineage

A `draft_brief_ready` item binds the exact:

- workspace version and fingerprint;
- workspace item ID and fingerprint;
- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- approval review fingerprint;
- opportunity kind;
- source domain;
- source URL when evidence supplies one;
- target domain;
- exact existing target URL;
- qualification score;
- evidence coverage;
- risk class;
- evidence fingerprints.

The brief receives deterministic:

- `briefFingerprint`;
- `briefId`.

The preparation projection receives a deterministic:

- `preparationFingerprint`.

## Controlled purpose codes

UGP-10.4 does not invent prose or outreach angles.

It maps the already-classified opportunity kind to one controlled context code:

- `competitor_link_gap` → `competitor_gap_context`;
- `domain_intersection` → `shared_referrer_context`;
- `broken_link_opportunity` → `broken_reference_context`;
- `unlinked_brand_mention` → `unlinked_mention_context`;
- `lost_link_recovery` → `lost_link_recovery_context`;
- `resource_page_opportunity` → `resource_page_context`;
- `partner_supplier_citation` → `partner_citation_context`;
- `content_promotion_prospect` → `content_promotion_context`.

These are machine-readable context classifications, not generated messages.

## Mandatory brief constraints

Every ready brief declares:

- claims must remain evidence-backed;
- relationship claims may not be invented;
- contact details may not be invented;
- the owned target page must remain the exact evidence-bound target;
- human editing/review is required before any future send stage;
- paid or reciprocal link schemes are not authorized.

## Safety semantics

UGP-10.4 explicitly records:

- deterministic: true;
- evidence bound: true;
- approved-for-draft required: true;
- existing target binding only: true;
- contact discovery authorized: false;
- contact discovery performed: false;
- outreach draft text generation authorized: false;
- outreach draft text generated: false;
- outreach sending authorized: false;
- outreach sending performed: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Explicitly out of scope

UGP-10.4 does not add:

- a database migration;
- persistent draft storage;
- a mutation endpoint;
- a drafting API;
- a customer drafting UI;
- contact/person/email discovery;
- email verification;
- mailbox access;
- LLM/model execution;
- generated subject lines;
- generated message bodies;
- sending;
- follow-up scheduling;
- provider HTTP;
- credentials;
- scheduler or worker activation;
- public-site writes;
- paid or reciprocal link automation;
- Railway or production changes.

## Tests

The regression suite verifies that:

1. an approved prospect with an existing owned target URL becomes `draft_brief_ready`;
2. an approved prospect without an owned target URL becomes `target_binding_required`;
3. unreviewed prospects cannot receive a brief;
4. rejected and deferred prospects cannot receive a brief;
5. no contact discovery, model execution, drafting, sending, persistence, or network semantics are enabled;
6. identical evidence and reviews produce identical preparation and brief fingerprints;
7. tampering is detected by integrity reconstruction.

## Next bounded increment

A later UGP-10 increment may add one of two separately controlled capabilities:

1. authoritative owned-target binding for `target_binding_required` prospects using an existing verified page/content inventory; or
2. bounded draft-text generation from a `draft_brief_ready` brief.

Neither capability is authorized by UGP-10.4 itself.

Contact discovery and outreach sending remain later independent authorization boundaries.

# UGP-10.1 — Evidence-Bound Outreach Review Workspace

Version: `ugp-10-1-outreach-review-workspace-v1`

## Purpose

UGP-10.1 creates the first Outreach Workspace contract on top of UGP-9.4 prospect qualification.

It converts qualification output into a deterministic review queue while preserving the exact qualification and evidence lineage that produced each prospect.

This increment is deliberately review-only. It does not discover contacts, draft messages, send outreach, persist workflow state, call providers, activate workers, or modify public websites.

## Input lineage

The workspace consumes the exact `AuthorityProspectQualificationResult` from UGP-9.4A.

Every workspace item is bound to:

- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- qualification status;
- score;
- evidence coverage;
- risk class;
- evidence fingerprints.

A review supplied against a stale qualification fingerprint is rejected.

## Initial workspace states

Qualification status maps to a review state without creating outreach authorization:

| Qualification status | Workspace state |
| --- | --- |
| `qualified_for_review` | `awaiting_human_review` |
| `needs_review` | `qualification_review_required` |
| `insufficient_evidence` | `insufficient_evidence` |
| `disqualified` | `blocked` |

No state transition occurs automatically.

## Human review decisions

The bounded review decisions are:

- `approved_for_draft`;
- `rejected`;
- `deferred`.

`approved_for_draft` is permitted only for a prospect whose qualification status is `qualified_for_review`.

It also requires the explicit review reason:

`editorial_fit_confirmed`

This prevents a review record from bypassing UGP-9.4 evidence coverage or turning a lower-confidence prospect into a drafting candidate.

### Important semantic boundary

`approved_for_draft` means only:

> a human reviewer has confirmed that this evidence-bound prospect may proceed to a future draft-preparation stage.

It does **not** mean:

- contact discovery is authorized;
- an email address may be acquired;
- drafting has occurred;
- sending is authorized;
- sending has occurred;
- a provider may be called;
- a link exchange or purchase is authorized;
- a public website may be changed.

## Review lineage

Each review record binds:

- exact qualification fingerprint;
- exact prospect fingerprint;
- decision;
- controlled reason code;
- reviewer identifier;
- explicit canonical timestamp.

Each review receives a deterministic fingerprint and identifier.

Review history is ordered by explicit timestamp and fingerprint. The latest review determines the visible review state.

## Determinism and integrity

The workspace produces deterministic:

- item fingerprints;
- review fingerprints;
- workspace fingerprint;
- summary counts.

`assertAuthorityOutreachWorkspaceIntegrity(...)` rebuilds the workspace from the exact qualification and review inputs and rejects mismatches.

## Safety semantics

UGP-10.1 records:

- deterministic: true;
- evidence bound: true;
- human review required: true;
- approval for draft only: true;
- contact discovery performed: false;
- outreach drafting performed: false;
- outreach sending performed: false;
- outreach sending authorized: false;
- network operation performed: false;
- persistence performed: false;
- scheduler enabled: false;
- automatic transition: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Explicitly out of scope

UGP-10.1 does not add:

- an API endpoint;
- a customer UI;
- database tables or migrations;
- contact/person/email discovery;
- email verification;
- message drafting;
- template generation;
- Gmail or other mailbox access;
- sending;
- follow-up scheduling;
- autonomous outreach;
- paid or reciprocal link workflows;
- provider HTTP;
- credentials;
- Railway or production changes.

## Tests

The regression suite verifies that:

1. qualified prospects enter the human-review queue;
2. human approval advances only to draft eligibility;
3. stale qualification reviews are rejected;
4. insufficient-evidence prospects cannot bypass qualification through draft approval;
5. workspace tampering is detected;
6. identical evidence and reviews produce identical output.

## Next bounded increment

A later UGP-10 increment may expose this review workspace through an authenticated read-only API/customer surface.

Draft generation, contact discovery, persistence, and sending remain separate authorization boundaries and must not be implied by this contract.

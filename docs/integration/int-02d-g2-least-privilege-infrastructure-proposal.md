# INT-02D G2 — Offline least-privilege infrastructure proposal

Status: **DESIGN ONLY / NOT AUTHORIZED / G2 BLOCKED**  
Date: 2026-10-29  
Baseline: `1cb81068ca8f9bb63d247b2686dee2ea9b407ed7`  
Tracking: #1159

## Objective
Assess how SEO ENGINE could obtain independently witnessed, private, least-privilege access to *catalog metadata only* in its intended Production PostgreSQL service. This document does not establish an active access channel or grant authority to use one.

## Target identity and exclusions
Candidate primary Railway service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`, volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`. Separate restored database `ad459f76-e3fa-4aef-bcb7-0bff509aa326` is explicitly out of scope. The reported application variable reference and provider service-name match are partial G1 evidence, not runtime binding proof.

## Options
| Option | Design | Disposition |
|---|---|---|
| A | Independently attest an already approved private operator channel and existing restricted PostgreSQL identity | **Preferred** if both are proven to exist |
| B | Propose a dedicated operator-only private transport and separate restricted database identity for later infrastructure approval | **Fallback proposal only**; no provisioning authorized |
| C | Reuse application privileges, expose database publicly, retrieve resolved database variables, automate access from CI or deploy an inspection service | **Rejected** |

Railway SSH is a provider-documented transport candidate, not evidence of project access authorization. Default database-connect workflows are unsuitable if they reveal credentials or exceed operator privileges.

## Required security boundaries
- Named accountable owner, authorized operator, independent reviewer and current timestamp.
- Explicit proof of primary service identity and exclusion of restored instances.
- Private, authenticated, narrowly bounded operator transport, with auditable lifecycle and revocation.
- Separate database principal, neither superuser nor database owner, with no role escalation or access to customer rows.
- Effective permissions assessed across memberships, inherited grants, object ownership, functions and default privileges; a role name or read-only transaction alone does not prove confidentiality.
- Reviewed metadata-only query allowlist, bounded outputs, read-only transaction controls, and independent evidence custody for any separately approved future inspection.
- No secrets, connection strings, customer content or authentication tokens in GitHub, chat, logs or evidence packets.

## Gate requirements
| Stage | Evidence needed | Current status |
|---|---|---|
| G1 | Independent structural binding and primary service witness | Partially corroborated |
| G2-A | Existing private channel and restricted principal attestation | Unverified |
| G2-B | If G2-A fails, separately approved change design and security review | Not authorized |
| G3 | Exact-target, one-time SQL inspection authorization and execution safety | Not granted |
| G4/G5 | Verified database identity, schema/catalog and historical migration ledger | Not performed |
| PITR | Independently assessed recovery evidence | Not certified |

## Independent approval sequence
1. Review and certify this **proposal only** through source PR and CI.
2. An authorized operator separately supplies non-secret control-plane evidence of any existing safe access arrangement. If missing, G2 remains blocked.
3. If infrastructure changes prove necessary, the security owner proposes an exact scoped change with impact, permissions, custody, rollback and independent review. **A new explicit owner authorization is mandatory.**
4. Any subsequent database inspection requires its own exact-target authorization and cannot be inferred from this document.

Stop immediately on target ambiguity, elevated or unverified privileges, credential exposure, missing witness, or any need to connect to PostgreSQL under the current permission.

**This proposal does not authorize** Railway changes, connections, credentials, SQL, role creation, migrations, deployments, public-site or provider writes, or merge. Preserve `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

References: `AGENTS.md`, `docs/integration/int-02c-06-railway-operator-inspection-procedure.md`, `docs/integration/int-02d-g1g2-operator-evidence-handoff.md`, `docs/integration/int-02d-g2-private-transport-security-decision.md`.

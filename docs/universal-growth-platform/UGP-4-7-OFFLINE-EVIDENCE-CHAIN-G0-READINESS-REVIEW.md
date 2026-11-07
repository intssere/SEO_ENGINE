# UGP-4.7 — Consolidated offline evidence-chain review and G0 decision register

**Status:** SOURCE-ONLY REVIEW / NOT AUTHORIZED / NOT CERTIFIED  
**Reviewed integration baseline:** `b7a92f7568c25be46dbe6de306b8193a2ea9d2b7`  
**Parent:** [UGP-4.7 #653](https://github.com/intssere/SEO_ENGINE/issues/653), [UGP-4 exit #574](https://github.com/intssere/SEO_ENGINE/issues/574)  
**Governing documents:** `UGP-4-7-GIT-READ-PR-CERTIFICATION-CONTRACT.md` and `UGP-4-7-G0-READ-CERTIFICATION-PREFLIGHT.md`

This is a review register, not a provider-acquisition tool, approval, CI result, signed receipt, or independent certification. All content in the checked-in offline validators remains caller-supplied and unauthenticated. **No GitHub read/write certification, deployment, provider operation or database action is approved by this file.**

## 1. Verified source coverage (not live evidence)

| Evidence requirement | Source implementation | Observed review conclusion |
|---|---|---|
| Chain identity consistency across repository, base, read, patch, commit, PR and CI claims | `ugp-4-7-offline-git-evidence.ts` (#1236) | Checks self-reported fields; no provider provenance |
| Baseline read bytes and Git blob object ID / content SHA-256 | `ugp-4-7-offline-blob-read-proof.ts` (#1238) | Hashes captured bytes, not proof of repository membership |
| Read-chain-to-blob binding | `ugp-4-7-read-blob-cross-evidence.ts` (#1239) | Checks mutual claim consistency |
| Acquisition metadata correlation | `ugp-4-7-acquisition-claims.ts` (#1240) | Accepts a declared source kind/HTTP metadata **as claims only** |
| Proposed G0 scope intake; fail-closed fields and single base-commit GET endpoint | `ugp-4-7-g0-offline-intake.ts` (#1243–#1245) | Returns `REVIEW_REQUIRED_UNAUTHORIZED`, never G0 approval |
| Proposed replacement-content bytes / deterministic patch metadata fingerprint | `ugp-4-7-offline-patch-bytes.ts` (#1246) | Checks bounded supplied bytes, not actual patch application |
| Proposed commit object preimage, parent and root tree reference | `ugp-4-7-offline-commit-object.ts` (#1247) | Supports limited synthetic single-parent format; no provider authentication |
| Root-to-leaf **proposed after-commit** tree path / final after-blob | `ugp-4-7-offline-tree-membership.ts` (#1250) | Verifies supplied tree bytes internally; not provider observation |

**Scope of checks:** The latest commit/tree validator binds a *claimed resulting commit* to its proposed after-content, but is not a complete G0–G5 certification, nor a guarantee that only the intended file changed. In particular, matching one path does not establish absence of unrelated tree changes.

## 2. Hard gaps, in order of operational importance

**BLOCKER A — G0 target and independent approval absent.** No explicitly designated isolated nonproduction owner/repository, numeric repository ID, installation principal, immutable base OID, exact nonsecret path, named operator and independent reviewer, approved retention/evidence store, minimal credential scope, or completed security/side-effect review has been supplied and independently verified. Existing development repository access does not count. Owner approval for G1 is **NOT GRANTED**.

**BLOCKER B — authenticated acquisition adapter / provenance absent.** There is no approved, independently observed, sanitized GitHub receipt binding real provider metadata to an approved scope. Synthetic `httpStatus:200`, timestamps, Git object IDs and `sourceKind` cannot stand in for authenticated provider observations.

**BLOCKER C — baseline commit-to-blob membership incomplete.** The baseline file proof verifies caller-supplied blob bytes and associates a `baseSha` claim, but does not currently link a verified baseline **commit preimage → root tree → allowlisted path → before blob**. The new after-commit tree proof does not close this separate baseline gap. Both directions must be checked against independently acquired provider evidence for future certification.

**BLOCKER D — unrelated modifications / lifecycle effects not established.** A matching resulting tree path does not prove that unrelated files were unchanged. There is no independently observed branch collision/pre-existing ref check, no authorized controlled G3 write/PR lifecycle, no provider-authenticated CI run/head identity or approved side-effect containment; G2–G5 remain outside the offline proof.

**BLOCKER E — scope protocol and evidence protocol require review.** The G0 intake accepts exactly one *proposed immutable commit GET* endpoint. Follow-on tree/blob/metadata requests are **not implicitly included** and need separately reviewed endpoint/object scope under an explicit G1 authorization. The source's strict `JSON.stringify` form is a local-format constraint, not an interoperable canonical JSON or signature scheme. Current tree parser accepts only limited entry types and bounded path depths, and source-only CI is not a substitute for independent evidence review.

## 3. G0 decision register — no implied defaults

| Required decision / observed evidence | State |
|---|---|
| Owner names a new or existing **isolated nonproduction** GitHub repository | UNSET |
| Independent reviewer verifies test-only classification / absence of secrets | NOT_DONE |
| Repo ID, installation/account identity, approved principal and least privilege corroborated | NOT_DONE |
| Exact default/base branch and immutable baseline commit established | NOT_DONE |
| Exact nonsecret allowlisted file and required GET methods/objects approved | NOT_DONE |
| Independent operator and distinct reviewer assigned | NOT_DONE |
| CI/webhook/external side effects, redirect/error handling and stop rules reviewed | NOT_DONE |
| Sanitized immutable evidence retention / access controls approved | NOT_DONE |
| G0 recorded approval and **separate** bounded G1 owner authorization | NOT_GRANTED |

**G0 decision:** `BLOCKED_PENDING_TARGET_SECURITY_AND_SCOPE_APPROVAL`.  
**G1:** `NOT_AUTHORIZED / NOT_RUN`.  
**G2–G5:** `NOT_RUN`.  
**UGP-4 exit:** `NOT_CERTIFIED`.

## 4. Proposed controlled next sequence (subject to new owner decisions)

1. Nominate a dedicated nonproduction GitHub test repository and independent operator/reviewer **without making any live certification request**.
2. Security reviewer records the exact repository/installation identity, data classification, read-only credential permissions, allowed path, immutable baseline, method/endpoint allowlist, rate-limit/redirect stop conditions, side effects, evidence retention, and approval identifiers.
3. Complete any missing **offline baseline commit/tree/allowlisted-before-blob proof** and negative tests, keeping all authorization flags false; independently review protocol coverage before using its results.
4. Request a *separate explicit G1 read-only authorization* scoped to the exact reviewed nonproduction objects and bounded reads. Do not infer tree/blob permissions from the base-commit endpoint.
5. Only after a duly authorized provider observation, record redacted immutable evidence, independently reconcile the full baseline and proposed chain, then separately authorize any G2/G3/G4 work and G5 closure. No merge, default-branch mutation or deployment is included.

## 5. Reviewer signoff fields (unfilled on purpose)

- Test repository identity and immutable ID: **UNSET**
- GitHub installation/principal: **UNSET**
- Immutable baseline commit: **UNSET**
- Exact allowlisted path and GET scope: **UNSET**
- Operator: **UNSET**
- Independent reviewer / security decision: **UNSET**
- Data classification / retention / side-effect approval: **UNSET**
- Owner G0 signoff: **NOT GRANTED**
- Owner G1 authorization reference: **NOT GRANTED**
- Certification verdict: **NOT CERTIFIED**

**STOP:** Do not use any existing token to discover a candidate certification target, execute live reads or writes, change production data, merge into `main`, deploy, or mark #653 / #574 complete based on this document.

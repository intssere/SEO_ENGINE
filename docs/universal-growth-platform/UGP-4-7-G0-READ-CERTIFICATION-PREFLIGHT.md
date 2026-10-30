# UGP-4.7 — G0 nonproduction Git read-certification preflight and approval packet

**Status:** DRAFT / NOT APPROVED / G0–G5 NOT_RUN.  
**Parent:** [UGP-4.7 #653](https://github.com/intssere/SEO_ENGINE/issues/653); [UGP-4 exit #574](https://github.com/intssere/SEO_ENGINE/issues/574).  
**Baseline UGP integration commit:** `e191c8778a5879f01fd86e2994ebb6dd301d0227`.  
**Controlling contract:** `UGP-4-7-GIT-READ-PR-CERTIFICATION-CONTRACT.md`.

## 1. Purpose and hard stop

This document is a source-only, offline preparation artifact for a **future, explicitly authorized, read-only G1** on an isolated nonproduction test repository. It does not select or approve a repository, obtain or use credentials, make a GitHub API call, establish authenticated evidence, grant a Git permission, trigger CI, create a branch or PR, deploy, or close a certification gate.

**STOP unless a distinct owner instruction explicitly identifies the repository and authorizes the exact G1 read endpoints and paths.** Existing GitHub tool connectivity, ordinary development access, merged offline validator PRs, and GitHub Actions green CI are NOT substitutes for G0 approval.

## 2. G0 intake register — all entries mandatory before any live read

| Required item | Current value / completion rule | Status |
|---|---|---|
| Nonproduction repository owner/name | **UNSET**; explicitly supplied by owner | NOT_PROVIDED |
| Immutable GitHub numeric repository ID | **UNSET**; separately corroborated from authorized provider metadata | NOT_VERIFIED |
| Installation/account numeric ID and principal | **UNSET**; security owner identifies exact principal and minimum scopes | NOT_VERIFIED |
| Test-only classification and asset owner | **UNSET**; confirm absence of customer/production data | NOT_VERIFIED |
| Approved default/base ref and immutable commit SHA | **UNSET**; 40-char Git OID, no moving-ref evidence accepted alone | NOT_VERIFIED |
| Approved allowlisted file paths | **UNSET**; one or more exact nonsecret test files, regular mode 100644 | NOT_VERIFIED |
| Approved read endpoints and methods | **UNSET**; enumerate exact GET endpoints, no redirects or arbitrary URLs | NOT_AUTHORIZED |
| Authenticated provider-observation operator | **UNSET**; separate from independent reviewer | NOT_ASSIGNED |
| Independent technical/security reviewer | **UNSET**; checks permissions, receipt provenance, side effects | NOT_ASSIGNED |
| Token minimization, logging and retention | **UNSET**; no token or raw private content in receipts | NOT_VERIFIED |
| CI/workflow/webhook/Actions side-effect review | **UNSET**; verify reads cannot cause unexpected dispatch or disclosure | NOT_VERIFIED |
| Rate-limit and denial incident owner | **UNSET**; stop on 401/403/404 ambiguity, 429, 3xx, 5xx | NOT_ASSIGNED |
| G1 approval statement scoped to the above | **NOT GRANTED**; separate owner authorization required | BLOCKED |

The repository `intssere/SEO_ENGINE` is the **development repository**, not an implied approved G1 certification target. Do not infer that any development repository, customer site, or deployment environment may be used for the live certification exercise.

## 3. G1 permitted actions only after explicit G0 approval

1. Confirm the exact approved account/repository binding, immutable repository ID, installation identity, URL host and allowed path **using only authorized read-only requests**. Refuse changed owner/name or repository transfer.
2. Observe the approved base ref and immutable commit identity. Ref drift requires stopping and requesting renewed approval; do not silently rebase the approval to a new head.
3. Observe the one approved file's blob OID, regular-file mode and bounded content only when read of that content is expressly approved. Refuse symlinks, submodules, binary data, oversized responses and unexpected paths.
4. Record UTC observation time, request method, sanitized endpoint identity, response code, redirect status, content type and response digest. Preserve immutable evidence in the separately approved evidence store; do not log Authorization headers, cookies, tokens, raw private file contents, or arbitrary response bodies.
5. Independently reconcile authenticated receipts against the offline validators in PRs #1236, #1238, #1239 and #1240. **The existing source validators only process self-reported JSON; a passing result is not proof of authenticity.**
6. Stop before branch creation, commit, pull-request creation, CI/status polling, installation changes, merge, default-branch mutation, provider write, deployment, database access, queue dispatch or worker execution. Those phases require additional, explicit approvals.

## 4. Provider observation evidence manifest — proposed, not yet implemented

A future G1 evidence bundle should record:

- Approved scope: exact owner/repo, immutable repository ID, installation/account, GitHub host, approved paths, base ref and starting commit, reviewer/operator approval reference.
- Authenticated observation provenance: tool/operator identity, provider request ID if available, sanitized endpoint/method, response status and no-redirect proof, observed UTC time, *independently observed* account/repository identity.
- Content identity: requested immutable ref, observed commit OID, path/mode, Git blob OID, computed Git-object SHA-1 and SHA-256 over exact bounded bytes. Distinguish immutable commit membership proof from a mere blob-hash match.
- Cross-check result: offline evidence-digest references, known limitations, all discrepancies, denied attempts, and reviewer decision **NOT_CERTIFIED** unless G5 later separately passes.
- Data hygiene: hash-only redacted receipt, storage access control, retention approval and zero credential material.

Do **not** label a synthetic `sourceKind`, HTTP 200 field, timestamp or self-reported repository ID as an authenticated provider acquisition. The G1 acquisition adapter and independent provenance attestation are **not implemented** by the existing offline PRs.

## 5. Fail-closed stop conditions

Stop and record `G1_DENIED_OR_UNVERIFIED` on any missing G0 field or approval, different repository/installation ID, owner transfer, unexpected host, redirect, moving ref, commit/path/blob drift, mode other than 100644, noncanonical content encoding, credentials exposure risk, oversized or unsupported content, wrong API content type, unexpected network activity, or ambiguity in rate limit/authentication/provider availability. Never retry writes, auto-correct a drifted baseline, widen scopes or choose a substitute repo without new approval.

A green synthetic validator or CI run only establishes **offline source quality**, not live read certification. Git SHA-1 is a Git OID, not a provider-authenticity signature; neither the SHA-1 nor SHA-256 recomputation proves that the claimed commit contains the blob. Current parsers also do not fully establish canonical JSON / duplicate-key elimination, signed source provenance or cross-language normalization; these are open assurance gaps to address before any positive certification claim.

## 6. Independent review checklist

- [ ] Repository is demonstrably test-only and controlled by the named owner.
- [ ] Exact account/installation/repository IDs and read endpoints independently reviewed.
- [ ] Data classification, secret exposure and sanitized logging checked.
- [ ] Base commit and allowlisted file(s) bound to explicit consent.
- [ ] Read-only credential scope independently verified, with no unnecessary write privileges.
- [ ] CI/workflow/webhook and external deployment side effects evaluated.
- [ ] Bounded capture and fail-closed error handling proven in tests before G1.
- [ ] Evidence storage, operator/reviewer separation and incident process approved.
- [ ] G1 authorization issued **after** all above are complete; no G2–G5 authority inferred.

## 7. Proposed future owner authorization template — NOT AN AUTHORIZATION

`AUTHORIZE UGP-4.7 G1 READ-ONLY CERTIFICATION IN NONPRODUCTION REPOSITORY <owner/repo> (REPOSITORY ID <id>, INSTALLATION ID <id>) AT BASE COMMIT <40-hex-sha>, ALLOWLISTED PATHS <exact paths>, ENDPOINTS <exact GET endpoints>, WITH OPERATOR <person>, INDEPENDENT REVIEWER <person>, APPROVED READ SCOPE <scope>, SANITIZED RECEIPT STORAGE <location>, NO WRITES/DEPLOYMENT/MERGE. G0 SAFETY REVIEW COMPLETED <record>.`

Missing or placeholder values mean **STOP**. Authorization is restricted to the exact agreed methods, objects and scope; further provider interactions require separate approval.

## 8. Exit disposition

**G0 NOT APPROVED; G1 NOT RUN; G2–G5 NOT RUN; UGP-4.7 NOT CERTIFIED.** This packet is suitable for offline source review and PR CI only. It does not satisfy issue #653, UGP-4 exit issue #574, UGP-4.8, UGP-5 or any production readiness gate.

# UGP-4.7 — Git-backed custom-site read/PR evidence and certification contract

**Status:** SOURCE-ONLY PROPOSAL / NOT CERTIFIED  
**Parent:** UGP-4 exit gap #574; UGP-4.7 #653  
**Scope:** Exact-scope GitHub read, proposed patch, non-default-branch PR and CI provenance for one approved test repository.  
**Authority:** None. This contract cannot grant GitHub access, execute writes, merge a PR, publish, deploy or authorize any customer operation.

## 1. Critical boundary

UGP-4.3 currently plans Git capabilities but does not certify real Git lifecycle execution. Provider-neutral fixtures and captured receipts may be built and tested offline under ordinary source-only review. **A live read, branch creation, commit, PR creation or status request requires a distinct authorization naming its repository, account, files, methods and permitted effects.** There is no implied authorization from this document, passing CI, capability discovery, repository ownership or an existing OAuth token.

Only a test repository explicitly approved for UGP-4.7 is eligible for bounded live certification. Never use `main` or another default/protected branch as a write target. Never use production/customer repositories by inference.

## 2. Immutable evidence chain

The certification record must bind the following values through a single chain. All SHA-1 object identities are Git object IDs, *not* independently authenticated signatures; obtained object IDs are evidence only when separately anchored to an approved repository and authenticated provider receipt.

| Evidence stage | Required captured fields | Fail-closed condition |
|---|---|---|
| Target binding | approved host, installation/account, owner, repo, immutable repository ID, default branch, allowed file paths, read/write permissions | unexpected host, repo transfer or different installation |
| Baseline read | exact base ref + commit OID; file path, mode, blob OID and bounded content digest; UTC observed time; provider request/status metadata | file/ref/commit or blob identity drift, missing scope, symlink/submodule or unsupported mode |
| Content assessment | framework/content-source classification with source paths and bounded evidence fingerprints | classification based only on unverified hints |
| Patch proposal | expected base commit and each expected blob; explicit before/after content digests; deterministic patch fingerprint, allowed-size and path limits | nonallowlisted path, binary or generated artifact, unexpected deletion, stale blob, patch exceeds bound |
| Non-default branch | proposed branch name and starting base commit; exact approved creation scope | branch already exists unexpectedly, targets default, forced update, branch drift |
| Commit result | exact resulting commit OID, parent OID and tree OID; changed path/blobs match proposed patch | parent/tree mismatch, unrelated paths, signed provenance claimed without proof |
| Pull request | PR number, provider URL, exact base and head repo/ref/OIDs; draft/approval status | base/head changed, unrelated commits, auto-merge or unsolicited deployment |
| CI observation | workflow identity, run/check-suite ID, checked head OID, started/completed timestamps, conclusion and required checks | check on other SHA, pending/skipped/neutral evidence treated as passing, untrusted workflow identity |
| Reviewer disposition | named independent reviewer, evidence manifest digest, explicit allowed next step, unresolved exceptions | missing reviewer, stale chain, unsigned/unattested acceptance represented as certified |

Treat webhook events and user-submitted receipts as **untrusted claims** unless corroborated by authorized read-only provider observations. Do not persist tokens, Authorization headers, credential material, raw private file contents or uncontrolled response bodies as certification artifacts.

## 3. Offline fixture and normalizer requirements

The provider-free fixture must include: (a) a canonical repository/baseline snapshot; (b) selected content-path reads with immutable commit/blob identities; (c) a proposed patch and non-default-branch/commit/PR/status observations; and (d) bounded metadata describing the acquisition source. All IDs in a *synthetic* fixture must be clearly labelled synthetic.

The normalizer must:
1. Accept only bounded, schema-validated, caller-supplied evidence, without network, shell, file writes or Git subprocess execution.
2. Require exact repository identity, base/ref, file path and blob/commit linkage across every stage.
3. Reject evidence with missing keys, unexpected fields where schemas are exact, duplicates, malformed hashes, excessive sizes, unsupported modes or nonallowlisted paths.
4. Compute deterministic normalized receipts and stable SHA-256 fingerprints; freeze or copy inputs so caller mutation cannot change already-reviewed outputs.
5. Expose separate outcomes: `STRUCTURALLY_CONSISTENT_UNVERIFIED`, `INCOMPLETE_OR_UNSAFE`, and only later an independently approved certification status. **Never equate structural consistency with authenticated provider evidence or runtime authority.**
6. Keep `gitReadAuthorized=false`, `gitWriteAuthorized=false`, `mergeAuthorized=false`, `deploymentAuthorized=false` for offline-only reviews, regardless of input claims.

Canonical JSON, signed receipt verification, and identity attestation require their own approved protocols before any positive trust claim. JSON serialization/hashing alone cannot prove source authenticity.

## 4. Mandatory adversarial matrix

| Test | Expected |
|---|---|
| Repo owner/name matches but repository ID or installation differs | DENY |
| Base branch moves after read; commit OID differs | DENY / recapture |
| Expected blob OID or file mode differs | DENY |
| Path traversal, case-fold collision, escaped path, symlink/submodule, unexpected rename | DENY |
| Proposed patch modifies protected/default branch | DENY |
| Force-push, existing branch collision or unrelated modified path | DENY |
| PR head points at a different repository/ref/commit | DENY |
| CI success corresponds to earlier or different head OID | DENY |
| Required CI check missing, skipped, neutral, pending or cancelled | NOT CERTIFIED |
| Provider response has a redirect, rate limit, authentication or permission ambiguity | STOP / DENY |
| PR merged or deployment triggered unexpectedly | STOP, investigate; never claim clean certification |
| Forged/fabricated provider response or self-asserted reviewer approval | UNVERIFIED / DENY |
| Inputs too large, cyclic/malicious JS objects or malformed JSON | DENY |
| Valid synthetic chain with all safety flags false | STRUCTURALLY CONSISTENT, **NOT CERTIFIED** |

## 5. Live certification gates — separately authorized

**Gate G0 — approval:** identify exact nonproduction GitHub repository ID/name, controlled owner, immutable starting commit, allowlisted paths and minimal credential scope; authorize distinct read and write phases. Security owner approves no sensitive data exposure and no workflow side-effect risks.

**Gate G1 — read-only acquisition:** collect exact repository/ref/file/provider metadata and a sanitized evidence manifest. Reconcile with offline normalizer. Reads do not authorize branch/PR creation.

**Gate G2 — controlled proposed patch:** independently review a non-sensitive test fixture file and deterministic patch. Explicitly approve a unique non-default branch and one commit. Confirm repository Actions/webhooks cannot dispatch unwanted deploys or external operations.

**Gate G3 — bounded Git lifecycle:** with new exact-scope approval, create the approved test branch/commit/PR, prohibit force-push/default branch writes, and collect immutable head/tree/PR receipts. No merge.

**Gate G4 — CI observation:** observe only the previously approved PR's exact head; require validated workflow identity and successful required checks. A CI pass is not permission to deploy, merge or write customer sites.

**Gate G5 — independent closure:** reviewer examines complete immutable provider acquisition evidence, permissions and negative tests, reconciles drift, and writes an explicit UGP-4.7 pass/fail decision. Only then consider UGP-4.8 cross-connector exit tests. No automatic UGP-5 authorization.

## 6. Completion evidence register

Record the approved test repository, reviewer and operator, immutable acquisition manifest, hashes of sanitized receipts, exact GitHub Actions runs, offline regression suite, all denied negative cases, deviations and incident notes. At present **all live gates G0–G5 are NOT_RUN / NOT_GRANTED**; a source-only merged PR or fixture test cannot change that.

## 7. Explicit exclusions

No automatic customer Git mutation, provider/publishing writes, default-branch edits, production credentials, third-party execution, queue/scheduler, database DDL, deployment, live network observation, merge, or new tool/SDK installation. This contract does not complete UGP-4 exit criteria by itself.

# UGP-4.7 — Git-backed custom-site live certification evidence

Issue: #653

## Status

**CERTIFICATION EVIDENCE PREPARED — MERGE PENDING EXPLICIT AUTHORIZATION**

This document persists the bounded UGP-4.7 Git-backed custom-site certification evidence after the authorized live lifecycle and the provider-free offline attestation correction.

No new live GitHub fixture mutation was performed while producing this document.

## Certified mechanism

The certified bounded lifecycle is:

```text
exact immutable repository/file read
  -> deterministic proposed-content identity
  -> non-default branch
  -> one fixture-only commit
  -> pull request
  -> exact-head CI/status observation
  -> offline captured-evidence attestation
```

This does not certify direct default-branch writes, arbitrary Git execution, merge authority, deployment, publication, or autonomous operation.

## Repository and lineage

- Repository: `intssere/SEO_ENGINE`
- Default branch: `main`
- UGP certification base: `1441871b303143e647df19e5ef9233a6ae57b6d2`
- Provider/mechanism: GitHub Git-backed custom-site workflow
- UGP-4.7 attestation version: `ugp-4-7-git-certification-v2`

## Immutable repository read

- Observed path: `docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md`
- Observed blob SHA: `7e13efaa3c83585571f87c4db59a346a4384d5e3`
- Read-only: true

The immutable repository read and the created fixture are distinct paths. The v2 attestation contract preserves that distinction rather than claiming that the observed source file was modified.

## Deterministic fixture creation

- Working branch: `ugp-047-live-certification-fixture`
- Change path: `docs/universal-growth-platform/fixtures/UGP-4.7-LIVE-GIT-CERTIFICATION-FIXTURE.md`
- Expected prior blob: `null` (create-file operation)
- Resulting fixture blob: `f0c4b148b2e9eb753d694b1728d0c67ca6310b4d`
- Proposed-content SHA-256 fingerprint: `96cad6fb3a3f7b9a44be5e87c9659a9c2fc9634c83413d2714d3c2f74785123e`
- Resulting commit: `438aa79caaeb2b07d38400749b36a500c6695aef`
- Direct default-branch write: false
- Force push: false

## Pull request and CI evidence

- Pull request: #656
- PR target: `initiative-universal-growth-platform`
- PR exact head: `438aa79caaeb2b07d38400749b36a500c6695aef`
- CI run: #1388
- CI commit/head: `438aa79caaeb2b07d38400749b36a500c6695aef`
- CI conclusion: `success`
- PR #656 remained open and unmerged during certification.

PR #656 is historical certification evidence. Later advancement of `initiative-universal-growth-platform` does not rewrite or invalidate the exact historical CI result at the certified fixture head.

## Offline attestation

The offline attestation used only already captured evidence and the existing UGP-4.3/4.7 plan and attestation model.

Certified deterministic outputs from PR #669 exact-head CI:

- Plan fingerprint: `f56ff7494164b03f209708d65eb781632568591aea03d314e3591b4345b7ba3f`
- Receipt fingerprint: `de15e9fa35839d46dd16179144aae568760beabadeed71012d00cf653e76a165`

The receipt binds:

- repository: `intssere/SEO_ENGINE`
- default branch: `main`
- immutable base: `1441871b303143e647df19e5ef9233a6ae57b6d2`
- immutable repository-read path/blob
- distinct create-file change path
- exact resulting fixture blob
- deterministic proposed-content fingerprint
- non-default working branch
- exact resulting commit
- PR number/head
- exact CI commit/head
- successful CI conclusion

## Safety assertions

The attestation asserts and CI verifies:

- captured evidence only: true
- network calls during attestation: false
- credentials: false
- force push: false
- default-branch write: false
- merge: false
- deployment: false
- publication: false
- grants authorization: false

No provider/public-site write, database mutation, credential/configuration change, deployment, publication, scheduler/worker activation, or live GitHub fixture mutation occurred during the offline attestation/documentation step.

## Attestation-model correction

The initial UGP-4.7 v1 attestor assumed the observed blob path and changed path were identical. That model was valid for update-style patches but did not truthfully represent the already completed live certification, which read the contract file and created a separate fixture file.

UGP-4.7 v2 therefore:

- preserves the existing update-path behavior;
- permits a deterministic create-file patch with `expectedBlobSha=null`;
- keeps repository-read path/blob separate from the change path;
- requires exact resulting blob identity for create-file evidence;
- fails closed on missing or inconsistent create-file evidence.

This correction does not add runtime GitHub execution or broaden authorization.

## Certification conclusion

UGP-4.7 certifies only the bounded Git-backed custom-site path:

```text
exact immutable read
  -> deterministic patch identity
  -> non-default branch/commit
  -> PR
  -> exact-head CI/status observation
```

It does not grant arbitrary Git execution or authorization and does not certify direct default-branch writes.

Subject to successful final exact-head CI and explicit merge authorization for PR #669, UGP-4.7 may be marked COMPLETE and the initiative may proceed to UGP-4.8 connector-plane exit certification.

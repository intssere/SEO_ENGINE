# UGP-8.1 — Git-backed Markdown/MDX article publishing mapping

## Status

IMPLEMENTATION CANDIDATE — MAPPING-ONLY / SYNTHETIC CERTIFICATION / NO LIVE GIT WRITE

## Purpose

This bounded UGP-8.1 increment maps the merged connector-neutral article publication plan to a Git-backed Markdown or MDX content artifact while reusing the merged UGP-4.3 controlled Git connector.

The mapping is deliberately branch-and-pull-request only. It never writes directly to the repository default branch.

## Existing Git safety boundary

UGP-4.3 already requires:

- one exact repository;
- one observed immutable base commit SHA;
- a working branch different from the default branch;
- exact expected blob SHA for existing files;
- deterministic proposed-content fingerprints;
- pull-request-required semantics;
- read-only CI/status observation;
- no direct default-branch write.

UGP-8.1 preserves that contract rather than introducing a second Git execution model.

## Markdown/MDX schema binding

Git-backed sites differ in frontmatter conventions.

This mapping therefore requires explicit bindings for:

- title field;
- description field;
- publication-state field;
- draft value;
- published value.

It does not assume that every site uses `draft: true/false`.

## Operation mapping

### create

For `create.article`:

- target file must not already have an expected blob SHA;
- generated frontmatter uses the configured draft value;
- article body is written after frontmatter;
- exactly one deterministic file patch is proposed;
- the patch is carried only through a non-default working branch and PR plan.

Create is structurally unpublished.

### update

For `update.article`:

- an exact observed existing blob SHA is required;
- caller must provide the currently observed publication-state value;
- the generated file preserves that value exactly;
- title, description and article body may change;
- publication state cannot silently flip.

### publish

For `publish.article`:

- an exact observed existing blob SHA is required;
- the configured publication field is changed to the explicit published value;
- the article artifact remains deterministic;
- the resulting change is still only a branch/PR proposal.

A publish mapping does not merge the PR and does not claim that a deployment happened.

## File identity

The mapping binds:

- Markdown vs MDX format;
- exact repository-relative file path;
- target resource external identity when already known;
- exact expected blob SHA for existing files;
- deterministic full-file content fingerprint.

A non-planned universal target external ID must equal the mapped file path.

## Rendering

The generated artifact contains deterministic YAML-compatible frontmatter:

- configured title field;
- configured description field;
- configured publication field;

followed by the quality-gated article body.

Frontmatter scalar values are serialized deterministically.

## Authority boundary

The mapping:

- does not create a branch;
- does not commit;
- does not open a PR;
- does not merge a PR;
- does not observe CI;
- does not use credentials;
- does not perform network or filesystem operations;
- does not construct a live mutation execution request.

It only produces an integrity-checked controlled Git plan and exact file artifact.

## Safety semantics

Every result permanently declares:

- mappingOnly = true;
- deterministic = true;
- branchAndPullRequestOnly = true;
- directDefaultBranchWrite = false;
- createStartsUnpublished = true;
- updatePreservesObservedPublicationState = true;
- publishChangesPublicationStateOnlyByExplicitBinding = true;
- performsNetworkOperation = false;
- performsPersistence = false;
- usesCredentials = false;
- executionAuthorized = false;
- providerWrites = false;
- publicSiteWrites = false.

## Future execution requirements

A live Git executor must separately:

1. obtain explicit SEO ENGINE execution authorization;
2. verify exact repository/default branch/base commit;
3. verify file/blob identity;
4. create only the planned non-default branch;
5. apply only the deterministic patch;
6. create a PR;
7. observe exact-head CI/status read-only;
8. require a separately governed merge decision;
9. verify the deployed/public state after merge where the site's deployment model requires it;
10. fail closed on any repository/ref/blob/status drift.

## Synthetic certification

Tests prove:

- create produces a draft/unpublished full-file artifact;
- update preserves supplied publication state;
- publish uses only the explicit configured published value;
- existing-file blob identity is mandatory;
- default-branch working targets are rejected;
- format/path drift is rejected;
- target-file identity drift is rejected;
- controlled Git plan remains PR-only and direct-default-write denied;
- file and mapping fingerprints are tamper-evident.

No test performs GitHub, Git, network, shell, filesystem, credential, deployment or publication operations.

## Explicit exclusions

This increment does not:

- call GitHub or another Git provider;
- create branches, commits or pull requests;
- merge any pull request;
- write the default branch;
- use credentials;
- change Production DB/schema;
- deploy;
- change Railway;
- activate scheduler/worker/autonomous publication.

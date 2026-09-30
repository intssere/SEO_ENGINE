# P8.8 W09-C3F-A-F8 — Railway controlled-upload staging/transport adapter certification

## Result

**OFFLINE STAGING ADAPTER CONTRACT IMPLEMENTED / EXACT INVENTORY VERIFICATION IMPLEMENTED / LIVE RAILWAY TRANSPORT NOT AUTHORIZED.**

F8 bridges canonical F7 source bytes to the directory-shaped input required by a future controlled Railway CLI upload without claiming that an upload has occurred.

## Canonical staging model

The staging root must be newly created, isolated, empty, and disposable. The adapter admits only the exact F7 payload entries.

For each entry the staging inventory records:

- normalized relative path;
- kind: regular `file` or `symlink`;
- executable boolean;
- exact byte size;
- SHA-256 of exact file bytes or exact symlink-target bytes.

F7 modes map exactly:

- `100644 -> file, executable=false`;
- `100755 -> file, executable=true`;
- `120000 -> symlink, executable=false`.

Symlinks must be created from the exact target bytes and must never be dereferenced while staging or observing the staging root.

## Deterministic inventory

F8 derives its plan only after canonical F7 materialization passes. It binds:

- F7 manifest SHA-256;
- F7 artifact SHA-256;
- exact entry count;
- exact ordered inventory;
- deterministic inventory SHA-256.

The inventory hash is SHA-256 over LF-terminated canonical JSON tuples of:

`[path, kind, executable, size, contentSha256]`.

No absolute staging path, mtime, uid/gid, host identity, temporary-directory name, environment value, or credential enters identity.

## Observation contract

A staging observer must return only schema, source mode, and exact ordered entries. Unknown fields fail closed. The pure verifier requires exact equality with the planned inventory and certified F7 identities.

This catches:

- omitted source entries;
- extra files such as accidental local configuration;
- byte mutation;
- executable-bit mutation;
- symlink dereference or kind mutation;
- reordering/duplicate-path ambiguity;
- wrong F7 manifest/artifact identity.

## Required physical staging procedure for a future runner

The future offline filesystem runner must:

1. create a fresh private staging directory outside the repository;
2. assert it is empty;
3. create parent directories only as needed;
4. write regular-file bytes with no text/newline transformation;
5. set executable state from the F7 mode and no other mode source;
6. create symlinks from exact target bytes without dereference;
7. enumerate the completed tree without following symlinks;
8. reject any unsupported filesystem object;
9. hash exact regular-file bytes and exact symlink-target bytes;
10. feed only the sanitized inventory to the F8 verifier;
11. permit Railway transport only after PASS.

The staging directory itself is ephemeral execution material and is not canonical evidence.

## Railway CLI transport boundary

F8 does not call `railway up`.

A later live/disposable test may invoke Railway only from the exact verified staging root. It must not invoke the CLI from the developer checkout or repository root.

Before invocation, the runner must freeze the verified inventory. After invocation it must not rewrite the staging root and claim the old verification.

Railway ignore/exclusion semantics are a separate transport concern. If the CLI can omit or transform an identity-bearing path and the resulting uploaded source cannot be bound to the pre-upload inventory through authoritative evidence, the live test must fail closed. Successful build status alone is not proof of artifact identity.

## First disposable upload packet — prepared, not authorized

A future explicit authorization must bind:

- repository `intssere/SEO_ENGINE`;
- exact canonical commit and root tree at execution time;
- exact F4 attestation identity;
- exact F6 manifest SHA-256;
- exact F7 artifact SHA-256;
- exact F8 inventory SHA-256 and entry count;
- exact Railway project/environment/service selected as disposable/non-production;
- exactly one `railway up` attempt from the verified isolated staging root;
- zero persistent variable/config/IaC/staged-patch changes;
- zero Neon/DB/provider/public-site operations;
- read-only resulting deployment/snapshot/build observation;
- no automatic retry;
- cleanup only if explicitly authorized.

If the Railway target cannot be independently proven disposable/non-production before invocation, do not upload.

## Offline regression certification

Tests prove deterministic plan generation and exact-pass behavior plus fail-closed handling for additions, omissions, byte mutation, executable-bit mutation, symlink dereference, wrong F7 identities, unknown fields, unsorted observations, and invalid executable symlinks.

## Important remaining limitation

F8 certifies the local staging boundary, not Railway's server-side receipt of exact bytes. The next step must determine whether Railway exposes enough authoritative post-upload source/transport evidence to bind a resulting deployment/snapshot to the exact F8 inventory/F7 artifact. If it does not, build success or source similarity cannot substitute.

## F8 verdict

F7 -> staging plan: **IMPLEMENTED**.

Exact staging inventory verification: **IMPLEMENTED**.

Railway transport: **NOT EXECUTED / NOT AUTHORIZED**.

Production readiness from F8 alone: **NO**.

## Next milestone — F9

**W09-C3F-A-F9 — Railway controlled-upload receipt/transport evidence contract.**

F9 should first be repository/research-only. It must define the minimum authoritative receipt needed to prove that a future one-shot disposable upload corresponds to the exact certified F7/F8 artifact. No live upload is authorized by F9 design work.

## Hard exclusions

No Railway upload/deploy/redeploy/config/variables/staged-patch/IaC mutation; no Neon/DB/SQL; no provider/public writes; no scheduler/worker activation; no Stage 0; no cutover.

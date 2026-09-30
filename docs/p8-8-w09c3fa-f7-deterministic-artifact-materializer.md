# P8.8 W09-C3F-A-F7 — deterministic artifact materializer + offline byte-for-byte certification

## Result

**DETERMINISTIC MATERIALIZER IMPLEMENTED / OFFLINE BYTE IDENTITY CERTIFIABLE / NO RAILWAY UPLOAD AUTHORIZED.**

F7 closes the byte-production gap intentionally left by canonical F6. It is repository-only and performs no filesystem, Git, network, Railway, Neon, database, provider, or environment I/O.

## Canonical artifact format

Format identifier: `seo-engine-source-artifact-v1`.

The artifact is a deterministic binary framing, not a platform tar/zip whose metadata could vary by operating system or archiver.

Bytes are:

1. UTF-8 `seo-engine-source-artifact-v1\n`;
2. unsigned big-endian 32-bit entry count;
3. for each entry, in strictly ascending path order:
   - unsigned big-endian 32-bit UTF-8 path length;
   - exact UTF-8 path bytes;
   - unsigned big-endian 32-bit mode-string length;
   - exact ASCII/UTF-8 mode bytes;
   - unsigned big-endian 64-bit payload length;
   - exact payload bytes.

There are no timestamps, uid/gid, host paths, platform separators, locale values, compression headers, random values, or filesystem metadata.

## Supported Git payload semantics

Exactly three leaf modes are admitted:

- `100644`: regular non-executable file;
- `100755`: regular executable file;
- `120000`: symbolic link, where payload bytes are the exact Git symlink-target blob bytes.

Gitlink/submodule mode `160000`, directories as payload entries, devices, sockets, FIFOs, and other modes fail closed. Directories are represented implicitly by safe leaf paths.

Paths must be relative, slash-separated, NUL-free, non-empty, without backslashes, duplicate separators, absolute roots, or dot/dot-dot traversal. Entries must already be strictly sorted and unique; F7 does not silently reorder input.

## Binding to F6

For every admitted payload entry F7 derives the exact F6 manifest tuple:

`path, mode, size, SHA-256(payload bytes)`.

It then calls canonical F6 `sourceManifestSha256`. Therefore the same exact source payload deterministically yields:

- the same F6 manifest;
- the same F6 manifest SHA-256;
- the same F7 artifact bytes;
- the same artifact SHA-256.

`verifyMaterializedSourceArtifact` fails closed unless the derived manifest is byte/field-equivalent to the expected certified F6 manifest and manifest hash. If an expected artifact SHA-256 is supplied, it must also match exactly.

## Offline certification properties

Regression tests certify:

- repeated materialization is byte-for-byte identical;
- copied input buffers produce identical bytes and hashes;
- executable-mode changes alter manifest and artifact identity;
- symlink-target changes alter manifest and artifact identity;
- content tampering cannot satisfy the certified F6 manifest;
- unsafe paths fail closed;
- duplicate or unsorted paths fail closed;
- unsupported modes fail closed;
- unknown input metadata fails closed;
- explicit binary length framing prevents concatenation/boundary ambiguity;
- artifact SHA-256 recomputes from exact emitted bytes.

## Exact-tree acquisition boundary

F7 deliberately does not read a working directory. A future offline runner must acquire an exact immutable Git commit/tree through the F4/F6 chain, enumerate leaf objects from that exact tree, read exact blob bytes, preserve only supported Git modes, sort by Git path bytes under the certified normalization contract, and pass that payload to F7.

A mutable checkout, dirty working tree, filesystem traversal, generated build output, `.git` directory, ignored file, local symlink dereference, or timestamp-based packaging is not acceptable source material.

## Railway compatibility boundary

The F7 binary format is the canonical identity container. Railway CLI compatibility must not be assumed to mean Railway accepts this binary directly.

Before the first upload, a later bounded step must prove how the exact certified payload is staged into the directory/file representation accepted by `railway up` without changing bytes, modes, paths, or symlink semantics. If Railway's upload client transforms or excludes content in a way that cannot be independently bound to the F7 artifact identity, fail closed.

Thus F7 certifies source bytes; it does not claim a Railway upload receipt yet.

## Disposable upload prerequisites

The first disposable/non-production upload remains separately authorized. Before it can execute, the packet must bind:

- canonical repository, commit, root tree and branch;
- exact F4 attestation;
- exact F6 manifest SHA-256;
- exact F7 artifact SHA-256;
- exact deterministic payload entry count;
- exact Railway project/environment/service disposable target;
- one upload maximum;
- zero persistent variables/config changes;
- zero staged-patch acceptance;
- zero DB/Neon/provider/public-site access;
- read-only deployment/snapshot/build observation;
- no automatic retry;
- explicit cleanup authority if cleanup is desired.

An additional Railway staging/transport adapter certification is required before that packet is executable.

## F7 verdict

Deterministic materializer: **IMPLEMENTED**.

F6 manifest binding: **IMPLEMENTED**.

Byte-for-byte repeatability: **TESTED**.

Tamper/mode/symlink/path fail-closed behavior: **TESTED**.

Railway upload: **NOT AUTHORIZED / NOT EXECUTED**.

## Next milestone — F8

**W09-C3F-A-F8 — Railway controlled-upload staging/transport adapter certification.**

F8 should remain offline/repository-only: define and test reconstruction of the certified F7 payload into an isolated staging directory and prove the Railway CLI input boundary cannot silently add, omit, dereference, or mutate identity-bearing source content. It must prepare but not execute the disposable upload authorization packet.

## Hard exclusions

No Railway upload/deploy/redeploy/config/variables/staged-patch/IaC mutation; no Neon/DB/SQL; no provider/public writes; no scheduler/worker activation; no Stage 0; no cutover.

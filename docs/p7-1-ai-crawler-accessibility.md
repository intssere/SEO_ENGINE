# P7.1 — Deterministic AI Crawler/Bot Accessibility Audit v1

## Purpose

P7.1 provides a deterministic, network-free audit of caller-supplied AI crawler/bot accessibility evidence.

It answers a narrow question:

> Given the supplied robots-policy result and supplied HTTP/challenge/body observations for this exact bot and path, what accessibility status does the evidence support?

It does not live-crawl a site, fetch robots.txt, identify vendor policy from bot names, call an AI provider, persist evidence, or recommend a site change.

## Supplied evidence only

The caller supplies:
- canonical audit reference time;
- normalized opaque site key;
- one or more exact bot/path observations.

Each observation contains:
- normalized `botKey`;
- exact caller-supplied `userAgent`;
- exact caller-supplied site-relative `path`;
- exact evidence fingerprint;
- canonical observation timestamp;
- supplied robots decision;
- optional supplied robots-rule fingerprint;
- supplied HTTP status;
- supplied challenge-detected flag;
- supplied body-available flag.

P7.1 does not parse robots.txt.

It does not make an HTTP request.

It does not look up whether a named bot belongs to a vendor or what that vendor's current policy is.

## Exact bot identity

`botKey` is normalized only for deterministic identity.

`userAgent` is preserved exactly.

All observations using the same normalized bot key must use the same exact user-agent string.

Conflicting user-agent identity fails closed.

This prevents P7.1 from silently merging different crawler identities.

## Exact target path

The caller supplies the site-relative path.

P7.1 validates that it begins with `/`, remains within the length bound and contains no fragment/control characters.

P7.1 does not:
- canonicalize URLs;
- resolve redirects;
- fetch the path;
- infer that two different paths are equivalent.

## Robots-policy input

`robotsDecision` is one of:
- `allowed`
- `disallowed`
- `unknown`

This is already-evaluated caller-supplied policy evidence.

P7.1 does not implement a robots.txt parser in v1.

An optional robots-rule fingerprint may bind the supplied policy result to upstream evidence.

## HTTP/challenge/body input

P7.1 accepts supplied:
- HTTP status;
- challenge-detected flag;
- body-available flag.

These are descriptive supplied observations only.

P7.1 does not infer how they were collected and does not re-request the resource.

## Probe classification

Every unique observation produces one probe.

### blocked

`blocked` wins when either:
- robots are explicitly disallowed; or
- supplied HTTP status is 401/403.

### unavailable

When no block applies, `unavailable` is used for:
- 404;
- 410.

### limited

When neither block nor unavailable applies, `limited` is used for:
- detected challenge;
- 429;
- unresolved 3xx response.

### accessible

`accessible` requires all of:
- robots explicitly allowed;
- supplied HTTP status in 200–299;
- `bodyAvailable=true`.

### indeterminate

Every other combination is `indeterminate`.

Examples include:
- robots decision unknown;
- missing HTTP status;
- 5xx;
- body availability missing/false when no stronger status applies;
- otherwise unclassified combinations.

## Diagnostic reasons

P7.1 retains diagnostic reasons alongside the chosen status.

Reasons include:
- robots allowed/disallowed/unknown;
- HTTP success/access denied/unavailable/rate-limited/redirect/server-error/other/missing;
- challenge detected;
- body available/unavailable/unknown.

Status precedence does not discard other supplied diagnostics.

For example, a robots-disallowed observation that also returns 404 remains `blocked` while retaining both diagnostics.

## Duplicate handling

Exact duplicates collapse only when their complete normalized observation metadata match.

The duplicate identity is:
- bot key;
- path;
- evidence fingerprint.

If the same identity is supplied with conflicting metadata, P7.1 fails closed.

Different evidence fingerprints may represent separate observations for the same bot/path.

## Bot summaries

P7.1 groups probes by exact normalized bot key / exact user-agent identity.

A bot summary is:
- `accessible` when every probe is accessible;
- `blocked` when every probe is blocked;
- `limited` when every probe is limited;
- `unavailable` when every probe is unavailable;
- `indeterminate` when every probe is indeterminate;
- `mixed` for all other combinations.

The summary also retains per-status probe counts.

It is not a score, ranking or recommendation.

## Critical semantic boundaries

### Robots allowance is not consent

A supplied `allowed` robots decision does not mean:
- training consent;
- data-use license;
- contractual permission;
- vendor-policy acceptance.

P7.1 records accessibility policy only.

### Accessibility is not indexing

An `accessible` result does not prove:
- index inclusion;
- search retrieval;
- AI retrieval;
- cache inclusion.

### Accessibility is not citation

An `accessible` result does not prove the page:
- was cited;
- will be cited;
- was used in an AI answer;
- will appear in an AI answer.

Those concerns belong to later P7 collection/visibility milestones.

### Status does not diagnose vendor intent

A blocked/limited/unavailable result describes supplied evidence.

It does not infer why a crawler vendor behaved that way.

### No hidden page-directive inference

P7.1 v1 does not invent semantics for:
- page meta robots;
- X-Robots-Tag;
- vendor-specific AI directives;
- terms/licensing signals.

If later milestones need those inputs, they require an explicit reviewed contract.

## Determinism

P7.1 deterministically produces:
- normalized site/bot keys;
- canonical observations;
- probe statuses/reasons;
- probe fingerprints;
- bot summaries and fingerprints;
- report counts;
- report fingerprint.

Observation input order and exact duplicate order do not change report identity.

## Bounds

P7.1 v1 bounds:
- observations: 512;
- distinct bots: 64;
- user-agent string: 256 characters;
- target path: 2,048 characters;
- normalized keys: 96 characters under the canonical key grammar.

Bounds fail closed.

## Separation from later P7 milestones

P7.1 deliberately does not:
- build prompt/topic sets — P7.2;
- collect AI answers, brand mentions or citations — P7.3;
- compare citations/domains/competitors — P7.4;
- score AI visibility/history — P7.5;
- generate AI/GEO opportunities — P7.6;
- create the production AI Visibility workspace — P7.7.

## Runtime and safety boundary

P7.1 is pure deterministic engineering only.

It adds no:
- route or OpenAPI change;
- live crawl;
- robots.txt fetch;
- provider request or credential use;
- AI/LLM request;
- source admission;
- observation/accessibility persistence;
- database read/write/DDL/DML;
- scheduler/worker/retry behavior;
- approval grant;
- provider/public-site write;
- automatic transition;
- deployment/publication.

Generic continuation remains default-off engineering only.

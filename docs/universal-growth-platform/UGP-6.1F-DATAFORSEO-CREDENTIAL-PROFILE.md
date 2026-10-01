# UGP-6.1F — DataForSEO Credential Profile Contract

## Status

**REPOSITORY-ONLY CREDENTIAL BINDING CONTRACT — NO SECRET OR RUNTIME CONFIGURATION**

## Purpose

UGP-6.1F defines the narrow credential-profile contract required to make the already authorized DataForSEO one-shot certification executable without exposing secret material in repository code, receipts, logs, or chat.

This step does not create credentials, modify Railway variables, deploy anything, or contact DataForSEO.

## Allowlisted profile

Only one profile is accepted:

`dataforseo-primary`

It maps to exactly two external secret slots:

- `DATAFORSEO_PRIMARY_LOGIN`
- `DATAFORSEO_PRIMARY_PASSWORD`

The contract contains only the slot names. It contains no values.

## Resolution boundary

Credential resolution is performed only through an injected secret lookup supplied by a future explicitly authorized execution environment.

The resolver:

- rejects any profile other than `dataforseo-primary`;
- performs zero secret reads for an unknown profile;
- requires both login and password;
- rejects whitespace drift in the login rather than silently normalizing it;
- does not normalize, log, persist, hash, or serialize the password;
- returns credentials only to its direct caller.

## Safety properties

The credential profile itself grants no provider write authority and no public-site write authority.

UGP-6.1F adds no:

- `process.env` access;
- global network call;
- runtime/API route;
- database access;
- persistence;
- scheduler/worker;
- autonomous execution;
- deployment;
- Railway configuration mutation;
- provider call;
- public-site operation.

## Railway binding required later

The current Railway production services were inspected read-only before this contract was created. Neither exposed DataForSEO credential variables by name.

A future separately authorized configuration step may bind the two exact secret slots to the `seo-engine-shadow` service or another explicitly approved execution surface.

That later action must not print the secret values and must not broaden the approved DataForSEO one-shot scope.

## Relation to the certification lineage

UGP-6.1F is infrastructure preparation only. It does not change the UGP-6.1D certification basis commit and does not itself execute UGP-6.1E.

A subsequent live run must still:

- use the certified one-shot scope;
- execute exactly three approved sequential POST calls;
- use one task per call;
- use one attempt per call;
- use no retry;
- remain under the USD 1.00 provider-reported total cost ceiling;
- capture only bounded responses for offline attestation;
- perform zero persistence, scheduling, publication, provider writes, or public-site writes.

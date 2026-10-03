# UGP-8.2C — Internal-link mutation preview

## Status
IMPLEMENTATION CANDIDATE — CONNECTOR-NEUTRAL PREVIEW ONLY / NO EXECUTION

## Purpose
UGP-8.2C converts accepted UGP-8.2 recommendations into connector-neutral mutation intents and preview requests without granting execution authority.

Each recommendation proposes one internal-link insertion on the recommendation's source resource.

## Direction semantics
For both recommendation directions, the page being edited is always the recommendation source:
- new content → existing page: edit the new content and point to the existing page;
- existing page → new content: edit the existing page and point to the new content.

The target resource is never accidentally used as the mutation target.

## Mutation artifact
Each preview carries schema `ugp.internal-link.insertion.v1` with:
- operation `insert_internal_link`;
- direction;
- exact source and target locator fingerprints;
- canonical source/target URLs;
- anchor text;
- placement context;
- recommendation fingerprint;
- supporting evidence fingerprints.

The artifact describes the proposed change. It does not contain provider-specific HTML/MDX rewriting logic.

## State binding
The mutation intent binds:
- capability `write.internal_links`;
- the exact source resource;
- the source state fingerprint captured by UGP-8.2A/8.2B as the expected state;
- an explicit proposed state fingerprint supplied by the caller.

Expected and proposed state fingerprints must differ.

## Connector requirements
The supplied descriptor must:
- belong to the same site as the recommendation source;
- use the same provider identity as the recommendation source;
- advertise `write.internal_links` for the source resource kind;
- advertise `preview.change` for the source resource kind.

The universal connector contract enforces those capability constraints while building the mutation intent and preview request.

## Safety boundary
UGP-8.2C:
- builds no `UniversalExecuteMutationRequest`;
- creates no authorization reference;
- performs no connector/provider/network operation;
- persists nothing;
- performs no CMS/Git mutation;
- performs no public-site write;
- changes no DB/schema, Railway, deployment, scheduler, worker, or autonomy state.

## Next step
A later UGP-8.2 provider mapping/certification increment can translate the connector-neutral insertion artifact into exact provider-specific content patches while continuing to require preview before any separately authorized execution.

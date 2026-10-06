# UGP-10.16 — Provider-Free Supplied Public Contact-Point Evidence Validation

Version: `ugp-10-16-supplied-contact-point-evidence-validation-v1`

## Purpose

UGP-10.16 validates caller-supplied public-business contact-point evidence against an integrity-valid UGP-10.15 contact-verification specification.

This stage performs structural and lineage validation only.

It does not discover contact points, browse public sources, call search or verification providers, perform DNS/MX/SMTP checks, probe mailboxes, persist contact data, bind a provider, authorize sending, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.16 accepts only an integrity-valid UGP-10.15 contract whose state is exactly:

`contact_verification_spec_ready`

The request must repeat the exact:

- UGP-10.15 contact-verification-spec fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Supplied public-business contact points

UGP-10.16 may validate only contact-point types already permitted by the exact UGP-10.15 specification:

- `email_address`;
- `web_contact_form`.

The caller supplies the value.

The implementation itself does not fetch or discover the value.

Each observation must contain:

- contact-point type;
- contact-point value;
- allowed evidence-source class;
- public evidence URL;
- canonical observation timestamp;
- contact-point fingerprint;
- explicit public-business-contact attestation.

## Source-domain relationship

Email addresses must use the UGP-10.15 source domain or one of its subdomains.

Web-contact-form URLs and evidence URLs must:

- use HTTPS;
- contain no username or password;
- contain no fragment;
- resolve syntactically to the source domain or one of its subdomains.

No network request is made to verify those locations.

## Contact-point fingerprint

The supplied fingerprint must equal the deterministic SHA-256 fingerprint derived from:

- contact-point type;
- normalized contact-point value;
- normalized source domain.

A mismatched fingerprint fails closed.

This binds the supplied evidence record to the exact normalized contact point.

## Evidence-source classes

Every observation must use one UGP-10.15-allowed evidence source:

- `source_domain_contact_page`;
- `source_domain_staff_or_author_page`;
- `official_organization_profile`.

UGP-10.16 does not fetch these sources.

## Bounded count

The candidate set remains bounded by the exact UGP-10.15 policy:

- maximum supplied contact points: 3.

More than three observations fail closed.

Duplicate contact-point fingerprints fail closed.

## Outcomes

The request must declare exactly one outcome:

- `contact_point_set`;
- `no_public_contact_point`.

`contact_point_set` requires at least one supplied observation.

`no_public_contact_point` requires an empty observation set.

## Resulting state

A valid UGP-10.16 result produces only:

`contact_point_evidence_validated`

This state means the supplied public-business contact-point evidence passed deterministic structural, lineage, type, domain, timestamp, source-class, fingerprint, and duplicate validation.

It does not mean that the contact point is deliverable or operationally verified.

## Safety semantics

UGP-10.16 explicitly records:

- deterministic: true;
- exact UGP-10.15 specification required: true;
- exact selected role candidate required: true;
- supplied public contact-point evidence validation only: true;
- external contact discovery authorized/performed: false;
- private or brokered personal data allowed: false;
- deliverability verification authorized/performed: false;
- verification-provider calls authorized: false;
- mailbox probing authorized/performed: false;
- mailbox access authorized: false;
- provider binding authorized: false;
- policy/consent review authorized: false;
- send-job construction authorized: false;
- send authorization granted: false;
- outreach sending authorized/performed: false;
- follow-up scheduling authorized: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Important distinction

UGP-10.16 may carry a supplied public-business email address or public web-contact-form URL.

That is not equivalent to verification.

UGP-10.16 does not establish:

- mailbox existence;
- MX validity;
- SMTP acceptance;
- form availability;
- deliverability;
- consent or policy compliance;
- mailbox ownership;
- provider readiness;
- send permission.

## Persistence

UGP-10.16 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.16 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- DNS or email providers;
- verification providers;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later increment may prepare a deterministic human policy/consent review specification over an exact validated public contact point.

Actual deliverability verification, provider calls, mailbox probing/binding, send authorization, transmission, and follow-up scheduling remain separately gated capabilities.

UGP-10.16 grants none of those capabilities.

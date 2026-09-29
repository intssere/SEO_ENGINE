# UGP-4.6 Webflow live read certification evidence

Issue: #651

## Certification result

UGP-4.6 Webflow read-only provider certification is **CERTIFIED** for the bounded read path described here.

This record persists evidence that was already acquired from the approved Webflow test site and subsequently normalized by the repository's offline certification boundary. This document does not authorize or perform any additional provider operation.

## Certified binding

- Webflow Site ID: `6ab94b0baca74bd07f84a09e`
- Public site origin: `https://seo-engine-ugp-test.webflow.io`
- Provider API origin: `https://api.webflow.com`
- Provider certification version: `ugp-4-6-webflow-read-provider-v1`
- Captured-evidence attestation version: `ugp-4-6l-captured-evidence-attestation-v1`
- Offline execution harness version: `ugp-4-6l-r2-offline-execution-harness-v1`

The certified provider boundary is GET-only and limited to the exact Site ID and the two routes below.

## Successful live acquisition evidence

### Pages

- Method: `GET`
- Effective URL: `https://api.webflow.com/v2/sites/6ab94b0baca74bd07f84a09e/pages`
- HTTP status: `200`
- Content type: `application/json; charset=utf-8`
- Acquisition bytes: `576`
- JSON validation: passed
- Offline normalized payload bytes: `576`
- Request fingerprint: `562d23d056b2482b3ad26988a16a1871513abcd6b694b9517a4b4a9fce4f1033`
- State fingerprint: `3e552367bcd6a348469c85d1d0ad35e6b9a4ca34e01e29ced6ee8534ced71874`
- Receipt fingerprint: `2c88058785ceeaa16b85d02aaaee6c1c94dc50bff57e3b6b8690ab67425be888`

### Collections

- Method: `GET`
- Effective URL: `https://api.webflow.com/v2/sites/6ab94b0baca74bd07f84a09e/collections`
- HTTP status: `200`
- Content type: `application/json; charset=utf-8`
- Acquisition bytes: `214`
- JSON validation: passed
- Offline normalized payload bytes: `214`
- Request fingerprint: `74286689f00835c125d315e2f80343a7dd3fcb62dab9d87dc1759c9660941be1`
- State fingerprint: `4483c56c682e5bd29c9a8a07e469a0058addeab5af16379e02967073ffbaf6dc`
- Receipt fingerprint: `fd5a35a7c90195f6da9ee5570175cba0d2fa53953a1a2d70ec84959c0e58d4d9`

## Fail-closed diagnostic evidence

An earlier bounded Collections request returned HTTP `403 Forbidden`. It is retained only as diagnostic evidence that insufficient authorization failed closed. It is not used as a successful certification receipt. After the credential was corrected outside the repository, exactly one bounded Collections GET produced the successful `200` evidence recorded above.

No credential, token value, or Authorization header is persisted in this record.

## Offline receipt attestation

The captured Pages and Collections JSON were processed through the merged offline Webflow attestation and execution harness. The resulting assertions were:

- `offlineOnly: true`
- `networkCalls: false`
- `getOnly: true`
- `credentials: false`
- `providerWrites: false`
- `publicSiteWrites: false`
- `persistence: false`

Both successful receipts bound the exact Site ID, exact API origin, exact effective URL, HTTP `200`, bounded response size, parsed JSON payload, and deterministic request/state/receipt fingerprints.

## Certification boundary

This certification establishes the UGP-4.6 read-only Webflow provider path for the common connector contracts. It does not establish or authorize:

- Webflow writes or publication;
- arbitrary provider routes or methods;
- credential persistence;
- database or schema changes;
- scheduler, worker, or autonomous execution;
- runtime configuration changes;
- deployment or publication;
- UGP-4.7 Git-backed custom-site certification;
- UGP-4 connector-plane exit certification.

The Windows direct CLI entrypoint and UTF-8 BOM handling observations discovered during offline execution are portability hardening items and are intentionally excluded from this evidence-only closeout.

## Conclusion

The bounded Webflow Pages and Collections read path has successful live GET evidence and deterministic offline receipt attestation with no provider writes, public-site writes, credential persistence, or network activity during attestation. UGP-4.6's additional non-Shopify CMS read-only certification requirement is therefore satisfied by this evidence record.

No additional Webflow provider call is required for this certification.

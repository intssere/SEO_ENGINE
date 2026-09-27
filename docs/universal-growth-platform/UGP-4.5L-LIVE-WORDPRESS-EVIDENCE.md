# UGP-4.5L — Live WordPress evidence runner

Issue #580 defines the authorized target as `https://kalkeenwellness.com` and only two read operations: GET `/wp-json/wp/v2/pages` and GET `/wp-json/wp/v2/posts`.

This runner is deliberately not a general network client. It binds the approved origin and routes in code, requires a caller-supplied transport, requests manual redirect handling and omitted credentials, applies a 10-second/1 MB bound, requires HTTP 200 JSON, and feeds successful observations into the merged UGP-4.5 receipt normalizer.

CI uses only injected synthetic transports. CI performs no live provider request. The eventual live execution remains a one-shot certification action under Issue #580 and must not be represented as provider write support, publication authority, scheduler/worker activation, persistence, or deployment.

A redirect, origin drift, authentication challenge, non-200 status, non-JSON response, or response-bound violation fails closed. No POST, PUT, PATCH, DELETE, credentials, OAuth expansion, database mutation, provider/public-site mutation, deployment, or publication is introduced by this change.

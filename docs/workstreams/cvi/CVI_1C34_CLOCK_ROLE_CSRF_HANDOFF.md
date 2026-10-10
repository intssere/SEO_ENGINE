# CVI-1C.34 — Session Clock and Role/CSRF Integrity

Predecessor: CVI-1C.33 draft PR #1055, final certified HEAD `48121e2c182dc7fc695cf63d91c19aeabced9bff`, full CI run https://github.com/intssere/SEO_ENGINE/actions/runs/38074830959 (SUCCESS).

## Bounded implementation
The existing disposable PostgreSQL authenticated HTTP certification now explicitly verifies that rotating an admin session token does not change its stored role or CSRF hash. The rotated token must accept the same valid CSRF token on an authenticated unsafe-method test endpoint, reject an invalid CSRF token, and retain the server-stored admin role. Independently expired database sessions must continue to reject normal HTTP authentication.

## Gaps not claimed as complete
This change does not yet simulate significant skew between the application clock and database clock; different clock usage in `loadAuthSession` and `rotateAuthSessionToken` still merits deeper adversarial evaluation. Other concurrency and cross-role privilege issues remain outside this bounded test. No provider provenance or CMS publishing authority is inferred.

## Restrictions
Proof-only isolated localhost PostgreSQL; no production schema/data, Google provider calls, publishing, public CVI route, merge or deployment. CI certification pending.

## Certified implementation receipt
- HEAD `90329ecaa8ff3e105aab1a5b4a7106a662392eee`
- Full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38075490427 — SUCCESS; job `114281471310`
- No merge or deployment. A documentation-only update changes HEAD and requires separate exact-head certification.

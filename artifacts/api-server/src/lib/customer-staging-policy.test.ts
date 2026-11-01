import test from "node:test";
import assert from "node:assert/strict";
import { parseCustomerStagingPolicy } from "./customer-staging-policy.js";

test("staging trust policy requires explicit bounded reviewed configuration", () => {
  assert.deepEqual(parseCustomerStagingPolicy({
    trustedAuthorities: ["approved-issuer"], maxAgeMs: 86400000,
  }), { trustedAuthorities: ["approved-issuer"], maxAgeMs: 86400000 });
  for (const value of [
    {}, { trustedAuthorities: [], maxAgeMs: 86400000 },
    { trustedAuthorities: ["issuer"], maxAgeMs: 0 },
    { trustedAuthorities: ["issuer"], maxAgeMs: 8 * 86400000 },
    { trustedAuthorities: ["issuer", "issuer"], maxAgeMs: 86400000 },
    { trustedAuthorities: [" issuer"], maxAgeMs: 86400000 },
    { trustedAuthorities: ["issuer", 5], maxAgeMs: 86400000 },
  ]) assert.equal(parseCustomerStagingPolicy(value), null);
});
test("accepted staging policy cannot be mutated downstream", () => {
  const policy = parseCustomerStagingPolicy({ trustedAuthorities: ["approved"], maxAgeMs: 60000 });
  assert.ok(policy);
  assert.ok(Object.isFrozen(policy));
  assert.ok(Object.isFrozen(policy.trustedAuthorities));
});

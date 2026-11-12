import { parseCustomerStagingPolicy } from "./customer-staging-policy.js";
import { createCertifiedCustomerEvidenceReader } from "./customer-certified-evidence-reader.js";
import { createScopedCustomerCapabilityReader } from "./customer-capability-loader.js";
import { createCustomerCapabilityHandler } from "../routes/customer-capabilities.js";
import type { CustomerGrantReader } from "./customer-site-scope-loader.js";

/**
 * Preparation-only composition; no environment access, DB pool, or router.
 * The invocation site must explicitly supply certified server-side readers.
 * Return null when trust policy cannot be validated.
 */
export function createCustomerStagingHandlerCandidate(input: {
  policy: { trustedAuthorities?: unknown; maxAgeMs?: unknown };
  readGrants: CustomerGrantReader;
  readers: Pick<Parameters<typeof createCertifiedCustomerEvidenceReader>[0],
    "readIdentity" | "readAttestation" | "readProof" | "readSources">;
  now: () => Date;
}) {
  const policy = parseCustomerStagingPolicy(input.policy);
  if (!policy) return null;
  const readEvidence = createCertifiedCustomerEvidenceReader({
    ...input.readers, trustedAuthorities: policy.trustedAuthorities,
    maxAgeMs: policy.maxAgeMs, now: input.now,
  });
  return createCustomerCapabilityHandler(
    input.readGrants, createScopedCustomerCapabilityReader(readEvidence),
  );
}

export const W09_C2T_SCHEMA_VERSION = "p8-8-w09c2t-v1" as const;

export type RequirementVerdict = "PASS" | "UNANSWERED" | "CONTRADICTED";
export type SupportMechanismClassification =
  | "ACCEPTABLE_MECHANISM"
  | "CONDITIONAL_MECHANISM"
  | "INSUFFICIENT_RESPONSE";

export const W09_C2T_REQUIREMENTS = [
  "authoritativeProvenance",
  "exactDeploymentSelector",
  "exactDeploymentDatabaseAssociation",
  "credentialNonObservability",
  "closedC2NMapping",
  "bindingRevisionSemantics",
  "failClosedMissingAmbiguous",
  "deploymentChangeInvalidation",
  "noDatabaseSqlSession",
  "noProviderPublicSiteMutation",
  "producerResolvedProviderIdentity",
  "auditableProducerVersionProvenance",
] as const;

export type RequirementName = typeof W09_C2T_REQUIREMENTS[number];

export interface SupportMechanismAssessment {
  schemaVersion: typeof W09_C2T_SCHEMA_VERSION;
  mechanismName: string;
  documentationReference: string;
  requirements: Record<RequirementName, RequirementVerdict>;
  identityMapping: RequirementVerdict;
  lineageContinuity: RequirementVerdict;
}

export interface SupportMechanismEvaluation {
  classification: SupportMechanismClassification;
  gaps: string[];
  nextOfflineStep:
    | "CERTIFY_PRODUCER_ADAPTER"
    | "REQUEST_BOUNDED_SUPPORT_FOLLOWUP"
    | "NO_LIVE_ADVANCEMENT";
}

const ALLOWED_TOP_LEVEL = new Set([
  "schemaVersion", "mechanismName", "documentationReference", "requirements",
  "identityMapping", "lineageContinuity",
]);
const ALLOWED_REQUIREMENTS = new Set<string>(W09_C2T_REQUIREMENTS);
const VERDICTS = new Set<RequirementVerdict>(["PASS", "UNANSWERED", "CONTRADICTED"]);
const CREDENTIAL_KEY = /(?:database[_-]?url|connection[_-]?string|username|password|token|secret|credentials|environment|env(?:ironment)?[_-]?vars?)/i;
const CREDENTIAL_VALUE = /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|(?:password|token|secret)=|bearer\s+[a-z0-9._~+\/-]+)/i;

function containsCredentialShapedInput(value: unknown, key?: string): boolean {
  if (key && CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some(item => containsCredentialShapedInput(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .some(([childKey, child]) => containsCredentialShapedInput(child, childKey));
  }
  return false;
}

function insufficient(gap: string): SupportMechanismEvaluation {
  return { classification: "INSUFFICIENT_RESPONSE", gaps: [gap], nextOfflineStep: "NO_LIVE_ADVANCEMENT" };
}

export function evaluateSupportMechanism(input: unknown): SupportMechanismEvaluation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return insufficient("INVALID_SCHEMA");
  if (containsCredentialShapedInput(input)) return insufficient("CREDENTIAL_SHAPED_INPUT");

  const record = input as Record<string, unknown>;
  if (Object.keys(record).some(key => !ALLOWED_TOP_LEVEL.has(key))) return insufficient("UNKNOWN_FIELD");
  if (record.schemaVersion !== W09_C2T_SCHEMA_VERSION) return insufficient("INVALID_SCHEMA");
  if (typeof record.mechanismName !== "string" || !record.mechanismName.trim()) return insufficient("NO_CONCRETE_MECHANISM");
  if (typeof record.documentationReference !== "string" || !record.documentationReference.trim()) return insufficient("NO_AUTHORITATIVE_REFERENCE");
  if (!record.requirements || typeof record.requirements !== "object" || Array.isArray(record.requirements)) return insufficient("INVALID_REQUIREMENTS");

  const requirements = record.requirements as Record<string, unknown>;
  if (Object.keys(requirements).some(key => !ALLOWED_REQUIREMENTS.has(key))) return insufficient("UNKNOWN_REQUIREMENT");
  if (W09_C2T_REQUIREMENTS.some(key => !VERDICTS.has(requirements[key] as RequirementVerdict))) return insufficient("INVALID_REQUIREMENTS");
  if (!VERDICTS.has(record.identityMapping as RequirementVerdict) || !VERDICTS.has(record.lineageContinuity as RequirementVerdict)) {
    return insufficient("INVALID_SCHEMA");
  }

  const contradicted = W09_C2T_REQUIREMENTS.filter(key => requirements[key] === "CONTRADICTED");
  if (record.identityMapping === "CONTRADICTED") contradicted.push("closedC2NMapping");
  if (record.lineageContinuity === "CONTRADICTED") return insufficient("CONTRADICTED:lineageContinuity");
  if (contradicted.length) return insufficient("CONTRADICTED:" + contradicted.sort().join(","));

  const unanswered = W09_C2T_REQUIREMENTS
    .filter(key => requirements[key] === "UNANSWERED")
    .map(String);
  if (record.identityMapping === "UNANSWERED") unanswered.push("identityMapping");
  if (record.lineageContinuity === "UNANSWERED") unanswered.push("lineageContinuity");

  if (unanswered.length) {
    return {
      classification: "CONDITIONAL_MECHANISM",
      gaps: unanswered.sort(),
      nextOfflineStep: "REQUEST_BOUNDED_SUPPORT_FOLLOWUP",
    };
  }

  return {
    classification: "ACCEPTABLE_MECHANISM",
    gaps: [],
    nextOfflineStep: "CERTIFY_PRODUCER_ADAPTER",
  };
}

import { createHash } from "node:crypto";
import type {
  P88PolicyCandidate,
  P88PolicyGrant,
} from "./p8-8-policy-grant-evaluation.js";
import type {
  P88W02GovernedProposalMaterialization,
  P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";
import type { P88W06ProviderObservation } from "./p8-8-policy-preflight.js";

export const P8_8_W09B_EVIDENCE_VERSION =
  "p8-8-w09b-synthetic-evidence-v1" as const;
export const P8_8_W09B_QUERY_SET_VERSION =
  "p8-8-w09b-query-set-v1" as const;
export const P8_8_W09B_TRANSLATOR_VERSION =
  "p8-8-w09b-offline-translator-v1" as const;
export const P8_8_W09B_MAX_FINAL_CANDIDATES = 25 as const;
export const P8_8_W09B_MAX_SOURCE_OPPORTUNITIES = 100 as const;

export type P88W09BQueryId =
  | "w09b.transaction_identity.v1"
  | "w09b.required_schema.v1"
  | "w09b.site_identity.v1"
  | "w09b.control_state.v1"
  | "w09b.candidate_opportunities.v1"
  | "w09b.page_snapshots.v1"
  | "w09b.legacy_evidence.v1"
  | "w09b.normalized_observations.v1"
  | "w09b.normalized_evidence.v1"
  | "w09b.policy_reservations.v1"
  | "w09b.policy_claims.v1"
  | "w09b.policy_dispatches.v1"
  | "w09b.policy_dispatch_events.v1"
  | "w09b.human_actions.v1"
  | "w09b.human_approvals.v1"
  | "w09b.human_deployments.v1"
  | "w09b.human_rollbacks.v1"
  | "w09b.human_verifications.v1";

export type P88W09BCandidateIncompleteReason =
  | "missing_product_gid"
  | "missing_upstream_lineage"
  | "missing_required_evidence"
  | "provider_before_not_authoritative"
  | "provider_before_stale"
  | "control_state_missing"
  | "mutation_history_incomplete"
  | "quota_state_incomplete"
  | "cooldown_state_incomplete"
  | "manual_intervention_state_incomplete"
  | "rollback_state_incomplete"
  | "ambiguous_target_identity"
  | "query_cap_exceeded"
  | "integrity_failure";

export type P88W09BCandidateCompleteness =
  | "complete_for_w09a"
  | P88W09BCandidateIncompleteReason;

export type P88W09BQueryDescriptor = Readonly<{
  queryId: P88W09BQueryId;
  queryVersion: "v1";
  purpose: string;
  sql: string;
  sqlHash: string;
  parameterKeys: readonly string[];
  allowedTables: readonly string[];
  allowedColumns: readonly string[];
  maxInvocations: number;
  maxRowsPerInvocation: number;
  maxTotalRows: number;
  ordering: string;
  mandatory: boolean;
}>;

export type P88W09BAcquisitionRequest = Readonly<{
  version: typeof P8_8_W09B_EVIDENCE_VERSION;
  environmentClass: "synthetic_ephemeral" | "production_reviewed";
  expectedApplicationSha: string;
  expectedApplicationTree: string;
  expectedQuerySetFingerprint: string;
  expectedDatabaseName: string;
  expectedRoleIdentity: string;
  domain: "diamondshelf.us";
  canonicalOrigin: "https://diamondshelf.us";
  platform: "shopify";
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
  }>;
  acquisitionReferenceTime: string;
  maximumFinalCandidates: 25;
  maximumOpportunityScan: 100;
  providerNetworkReadAllowed: false;
  persistenceAllowed: false;
  w10ActivationAllowed: false;
}>;

export type P88W09BQueryResultEnvelope = Readonly<{
  queryId: P88W09BQueryId;
  queryVersion: "v1";
  descriptorFingerprint: string;
  invocationIndex: number;
  parameterFingerprint: string;
  rowCount: number;
  rowResultFingerprint: string;
  overflowDetected: boolean;
  rows: readonly Readonly<Record<string, unknown>>[];
}>;

export type P88W09BTransactionEvidence = Readonly<{
  databaseName: string;
  roleIdentity: string;
  referenceTime: string;
  serverVersion: string;
  transactionReadOnly: true;
  transactionIsolation: "repeatable_read";
  startFingerprint: string;
  completionFingerprint: string;
}>;

export type P88W09BSiteEvidence = Readonly<{
  siteId: string;
  domain: "diamondshelf.us";
  canonicalOrigin: "https://diamondshelf.us";
  platform: "shopify";
  active: true;
  sourceResultFingerprint: string;
}>;

export type P88W09BProductGidWitness = Readonly<{
  resourceGid: string;
  sourceRecordKind: string;
  sourceRecordId: string;
  sourceFingerprint: string;
  sourceFieldPath: string;
  candidateUrl: string;
}>;

export type P88W09BProviderBeforeWitness = Readonly<{
  observation: P88W06ProviderObservation;
  container: Readonly<{
    observationId: string;
    recordFingerprint: string;
    provenanceFingerprint: string;
    observedAt: string;
    freshForMs: number;
    staleAfter: string;
  }>;
}>;

export type P88W09BReconstructionEvidence = Readonly<{
  w02Input: P88W02MaterializationInput;
  w02Materialization: P88W02GovernedProposalMaterialization;
  evidenceIds: readonly string[];
  missingEvidence: readonly string[];
  quality: Readonly<{
    status: string;
    approvalEligible: boolean;
    score: number;
    blockingReasons: readonly string[];
    warnings: readonly string[];
  }>;
  risk: Readonly<{
    classification: P88PolicyCandidate["risk"]["classification"];
  }>;
}>;

export type P88W09BDerivedCurrentState = Readonly<{
  providerObservedBeforeFingerprint: string;
  priorDeploymentCount: number;
  otherActiveSiteMutationCount: number;
  sameTargetCooldownSatisfied: boolean;
  mutationQuotaRemaining: number;
  unresolvedManualIntervention: boolean;
  unresolvedUncertainProviderWrite: boolean;
  unresolvedRollbackFailure: boolean;
  mutationControlMode: P88PolicyCandidate["currentState"]["mutationControlMode"];
  mutationControlFingerprint: string;
}>;

export type P88W09BAcquisitionCandidate = Readonly<{
  candidateId: string;
  candidateFingerprint: string;
  opportunity: Readonly<Record<string, unknown>>;
  page: Readonly<Record<string, unknown>>;
  pageSnapshots: readonly Readonly<Record<string, unknown>>[];
  legacyEvidence: readonly Readonly<Record<string, unknown>>[];
  normalizedObservations: readonly Readonly<Record<string, unknown>>[];
  normalizedEvidence: readonly Readonly<Record<string, unknown>>[];
  productGidWitness: P88W09BProductGidWitness | null;
  providerBeforeWitness: P88W09BProviderBeforeWitness | null;
  controlState: Readonly<Record<string, unknown>> | null;
  reservations: readonly Readonly<Record<string, unknown>>[];
  claims: readonly Readonly<Record<string, unknown>>[];
  dispatches: readonly Readonly<Record<string, unknown>>[];
  dispatchEvents: readonly Readonly<Record<string, unknown>>[];
  humanActions: readonly Readonly<Record<string, unknown>>[];
  humanApprovals: readonly Readonly<Record<string, unknown>>[];
  humanDeployments: readonly Readonly<Record<string, unknown>>[];
  humanRollbacks: readonly Readonly<Record<string, unknown>>[];
  humanVerifications: readonly Readonly<Record<string, unknown>>[];
  reconstruction: P88W09BReconstructionEvidence | null;
  derivedCurrentState: P88W09BDerivedCurrentState | null;
  completeness: P88W09BCandidateCompleteness;
  incompleteReasons: readonly P88W09BCandidateIncompleteReason[];
}>;

export type P88W09BAcquisitionSummary = Readonly<{
  opportunitiesScanned: number;
  selectedCandidateCount: number;
  completeCount: number;
  incompleteCount: number;
  incompleteCountsByReason: Readonly<Record<string, number>>;
  queryRowCounts: Readonly<Record<string, number>>;
  overflowCount: number;
  providerAuthoritativeBeforeCount: number;
  productGidPresentCount: number;
  policyHistoryCompleteCount: number;
  humanComparisonSourceCount: number;
}>;

export type P88W09BAcquisitionPackage = Readonly<{
  version: typeof P8_8_W09B_EVIDENCE_VERSION;
  packageId: string;
  packageFingerprint: string;
  request: P88W09BAcquisitionRequest;
  querySet: Readonly<{
    version: typeof P8_8_W09B_QUERY_SET_VERSION;
    querySetFingerprint: string;
    descriptors: readonly P88W09BQueryDescriptor[];
  }>;
  transaction: P88W09BTransactionEvidence;
  schemaState:
    | "full_w07_schema"
    | "missing_w04"
    | "missing_w05"
    | "missing_w07"
    | "core_or_observation_missing"
    | "column_contract_mismatch";
  site: P88W09BSiteEvidence | null;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
  }>;
  queryResults: readonly P88W09BQueryResultEnvelope[];
  candidates: readonly P88W09BAcquisitionCandidate[];
  summary: P88W09BAcquisitionSummary;
  semantics: ReturnType<typeof p88W09BEvidenceSemantics>;
  safety: ReturnType<typeof p88W09BEvidenceCapability>;
}>;

export type P88W09BAcquisitionPackageInput = Omit<
  P88W09BAcquisitionPackage,
  "packageId" | "packageFingerprint" | "summary" | "semantics" | "safety"
>;

const HEX_40 = /^[0-9a-f]{40}$/;
const HEX_64 = /^[0-9a-f]{64}$/;
const PRODUCT_GID = /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

export function p88W09BStableJson(value: unknown): string {
  return JSON.stringify(stable(value)) ?? "undefined";
}

export function p88W09BStableHash(value: unknown): string {
  return createHash("sha256").update(p88W09BStableJson(value)).digest("hex");
}

function descriptor(input: Omit<P88W09BQueryDescriptor, "sqlHash">): P88W09BQueryDescriptor {
  const value = Object.freeze({
    ...input,
    parameterKeys: Object.freeze([...input.parameterKeys]),
    allowedTables: Object.freeze([...input.allowedTables]),
    allowedColumns: Object.freeze([...input.allowedColumns]),
    sqlHash: p88W09BStableHash({ purpose: "p8.8_w09b_sql", sql: input.sql }),
  });
  return value;
}

const Q00 = descriptor({
  queryId: "w09b.transaction_identity.v1",
  queryVersion: "v1",
  purpose: "prove exact database role transaction mode timestamp and server version",
  sql: "SELECT current_database() AS database_name,current_user AS role_identity,current_setting('transaction_read_only') AS transaction_read_only,current_setting('transaction_isolation') AS transaction_isolation,transaction_timestamp() AS reference_time,version() AS server_version",
  parameterKeys: [],
  allowedTables: [],
  allowedColumns: [],
  maxInvocations: 1,
  maxRowsPerInvocation: 1,
  maxTotalRows: 1,
  ordering: "single row",
  mandatory: true,
});

const Q01 = descriptor({
  queryId: "w09b.required_schema.v1",
  queryVersion: "v1",
  purpose: "verify required table and column contract without mutating schema",
  sql: "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name ASC,ordinal_position ASC LIMIT 257",
  parameterKeys: ["requiredTables"],
  allowedTables: ["information_schema.columns"],
  allowedColumns: ["table_name", "column_name", "table_schema", "ordinal_position"],
  maxInvocations: 1,
  maxRowsPerInvocation: 257,
  maxTotalRows: 257,
  ordering: "table_name ASC, ordinal_position ASC",
  mandatory: true,
});

const Q02 = descriptor({
  queryId: "w09b.site_identity.v1",
  queryVersion: "v1",
  purpose: "resolve exactly one active Shopify Diamond Shelf site",
  sql: "SELECT id::text AS id,domain,canonical_origin,platform,is_active,updated_at FROM sites WHERE lower(domain)=$1 AND canonical_origin=$2 AND platform=$3 AND is_active=true ORDER BY id ASC LIMIT 2",
  parameterKeys: ["domain", "canonicalOrigin", "platform"],
  allowedTables: ["sites"],
  allowedColumns: ["id", "domain", "canonical_origin", "platform", "is_active", "updated_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 2,
  maxTotalRows: 2,
  ordering: "id ASC",
  mandatory: true,
});

const Q03 = descriptor({
  queryId: "w09b.control_state.v1",
  queryVersion: "v1",
  purpose: "read current durable W05 control state",
  sql: "SELECT control_version,site_id::text AS site_id,revision,previous_control_fingerprint,mode,effective_at,control_fingerprint,updated_at FROM policy_mutation_control_state WHERE site_id=$1::uuid LIMIT 2",
  parameterKeys: ["siteId"],
  allowedTables: ["policy_mutation_control_state"],
  allowedColumns: ["control_version","site_id","revision","previous_control_fingerprint","mode","effective_at","control_fingerprint","updated_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 2,
  maxTotalRows: 2,
  ordering: "primary key lookup",
  mandatory: true,
});

const Q04 = descriptor({
  queryId: "w09b.candidate_opportunities.v1",
  queryVersion: "v1",
  purpose: "read bounded real opportunity and Product page source identities",
  sql: "SELECT o.id::text AS opportunity_id,o.site_id::text AS site_id,o.page_id::text AS page_id,o.query_id::text AS query_id,o.opportunity_type,o.status,o.score,o.impact_estimate,o.effort_estimate,o.rationale,o.evidence_ids::text[] AS evidence_ids,o.created_at,o.updated_at,p.url,p.normalized_url,p.path,p.page_type,p.indexable,p.last_seen_at FROM opportunities o JOIN pages p ON p.id=o.page_id WHERE o.site_id=$1::uuid AND p.site_id=$1::uuid AND p.path LIKE '/products/%' ORDER BY o.updated_at DESC,o.id DESC LIMIT 101",
  parameterKeys: ["siteId"],
  allowedTables: ["opportunities", "pages"],
  allowedColumns: ["id","site_id","page_id","query_id","opportunity_type","status","score","impact_estimate","effort_estimate","rationale","evidence_ids","created_at","updated_at","url","normalized_url","path","page_type","indexable","last_seen_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "opportunity.updated_at DESC, opportunity.id DESC",
  mandatory: true,
});

const Q05 = descriptor({
  queryId: "w09b.page_snapshots.v1",
  queryVersion: "v1",
  purpose: "read descriptive page snapshots for selected candidate pages",
  sql: "SELECT id::text AS id,page_id::text AS page_id,observed_at,status_code,meta_description,canonical_url,content_hash,raw_signals FROM page_snapshots WHERE page_id=ANY($1::uuid[]) ORDER BY page_id ASC,observed_at DESC,id DESC LIMIT 101",
  parameterKeys: ["pageIds"],
  allowedTables: ["page_snapshots"],
  allowedColumns: ["id","page_id","observed_at","status_code","meta_description","canonical_url","content_hash","raw_signals"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "page_id ASC, observed_at DESC, id DESC",
  mandatory: false,
});

const Q06 = descriptor({
  queryId: "w09b.legacy_evidence.v1",
  queryVersion: "v1",
  purpose: "resolve exact opportunity evidence IDs",
  sql: "SELECT id::text AS id,site_id::text AS site_id,page_id::text AS page_id,source,kind,observed_at,confidence,payload,provenance,created_at FROM evidence WHERE id=ANY($1::uuid[]) ORDER BY id ASC LIMIT 401",
  parameterKeys: ["evidenceIds"],
  allowedTables: ["evidence"],
  allowedColumns: ["id","site_id","page_id","source","kind","observed_at","confidence","payload","provenance","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 401,
  maxTotalRows: 401,
  ordering: "id ASC",
  mandatory: false,
});

const Q07 = descriptor({
  queryId: "w09b.normalized_observations.v1",
  queryVersion: "v1",
  purpose: "read bounded normalized observation lineage for selected Product URLs",
  sql: "SELECT observation_id,schema_version,semantic_key,subject_kind,site_id,canonical_origin,url_id,canonical_url,observation_kind,material_value,value_fingerprint,evidence_set_fingerprint,source_kind,source_fingerprint,collector_id,provenance_fingerprint,confidence,observed_at,fresh_for_ms,stale_after,retention_class,record_fingerprint FROM seo_observation WHERE site_id=$1 AND canonical_url=ANY($2::text[]) ORDER BY canonical_url ASC,observed_at DESC,observation_id DESC LIMIT 201",
  parameterKeys: ["siteId", "canonicalUrls"],
  allowedTables: ["seo_observation"],
  allowedColumns: ["observation_id","schema_version","semantic_key","subject_kind","site_id","canonical_origin","url_id","canonical_url","observation_kind","material_value","value_fingerprint","evidence_set_fingerprint","source_kind","source_fingerprint","collector_id","provenance_fingerprint","confidence","observed_at","fresh_for_ms","stale_after","retention_class","record_fingerprint"],
  maxInvocations: 1,
  maxRowsPerInvocation: 201,
  maxTotalRows: 201,
  ordering: "canonical_url ASC, observed_at DESC, observation_id DESC",
  mandatory: false,
});

const Q08 = descriptor({
  queryId: "w09b.normalized_evidence.v1",
  queryVersion: "v1",
  purpose: "read normalized evidence references for selected observations",
  sql: "SELECT oe.observation_id,oe.reference_fingerprint,e.evidence_id,e.evidence_fingerprint,e.source_kind,e.source_fingerprint,e.dimension,e.quality,e.availability FROM seo_observation_evidence oe JOIN seo_evidence e ON e.reference_fingerprint=oe.reference_fingerprint WHERE oe.observation_id=ANY($1::char(64)[]) ORDER BY oe.observation_id ASC,oe.reference_fingerprint ASC LIMIT 3201",
  parameterKeys: ["observationIds"],
  allowedTables: ["seo_observation_evidence", "seo_evidence"],
  allowedColumns: ["observation_id","reference_fingerprint","evidence_id","evidence_fingerprint","source_kind","source_fingerprint","dimension","quality","availability"],
  maxInvocations: 1,
  maxRowsPerInvocation: 3201,
  maxTotalRows: 3201,
  ordering: "observation_id ASC, reference_fingerprint ASC",
  mandatory: false,
});

const Q09 = descriptor({
  queryId: "w09b.policy_reservations.v1",
  queryVersion: "v1",
  purpose: "read bounded W04 mutation reservation history",
  sql: "SELECT reservation_id,reservation_version,reservation_fingerprint,site_id::text AS site_id,policy_id,policy_version,policy_fingerprint,evaluation_id,evaluation_fingerprint,materialization_id,materialization_fingerprint,proposal_id,proposal_fingerprint,recommendation_fingerprint,recommendation_idempotency_key,provider,domain,resource_kind,resource_gid,target_url,action_type,field,required_provider_scope,before_fingerprint,after_fingerprint,policy_action_id,status,authorized_at,expires_at,claimed_at,terminal_at,terminal_reason,created_at,updated_at FROM policy_mutation_reservations WHERE site_id=$1::uuid ORDER BY created_at DESC,reservation_id DESC LIMIT 101",
  parameterKeys: ["siteId"],
  allowedTables: ["policy_mutation_reservations"],
  allowedColumns: ["reservation_id","reservation_version","reservation_fingerprint","site_id","policy_id","policy_version","policy_fingerprint","evaluation_id","evaluation_fingerprint","materialization_id","materialization_fingerprint","proposal_id","proposal_fingerprint","recommendation_fingerprint","recommendation_idempotency_key","provider","domain","resource_kind","resource_gid","target_url","action_type","field","required_provider_scope","before_fingerprint","after_fingerprint","policy_action_id","status","authorized_at","expires_at","claimed_at","terminal_at","terminal_reason","created_at","updated_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "created_at DESC, reservation_id DESC",
  mandatory: false,
});

const Q10 = descriptor({
  queryId: "w09b.policy_claims.v1",
  queryVersion: "v1",
  purpose: "read bounded W05 claim lineage",
  sql: "SELECT claim_id,claim_version,claim_fingerprint,reservation_id,reservation_fingerprint,w03_authorization_id,w03_authorization_fingerprint,policy_action_id,site_id::text AS site_id,control_revision,control_fingerprint,resource_gid,target_url,field,before_fingerprint,after_fingerprint,claimed_at,created_at FROM policy_mutation_claims WHERE site_id=$1::uuid ORDER BY created_at DESC,claim_id DESC LIMIT 101",
  parameterKeys: ["siteId"],
  allowedTables: ["policy_mutation_claims"],
  allowedColumns: ["claim_id","claim_version","claim_fingerprint","reservation_id","reservation_fingerprint","w03_authorization_id","w03_authorization_fingerprint","policy_action_id","site_id","control_revision","control_fingerprint","resource_gid","target_url","field","before_fingerprint","after_fingerprint","claimed_at","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "created_at DESC, claim_id DESC",
  mandatory: false,
});

const Q11 = descriptor({
  queryId: "w09b.policy_dispatches.v1",
  queryVersion: "v1",
  purpose: "read bounded W07 dispatch history for current-state derivation",
  sql: "SELECT dispatch_id,dispatch_version,dispatch_fingerprint,execution_id,execution_provenance,site_id::text AS site_id,policy_id,policy_version,policy_fingerprint,evaluation_id,evaluation_fingerprint,materialization_id,materialization_fingerprint,proposal_id,proposal_fingerprint,policy_action_id,reservation_id,reservation_fingerprint,claim_id,claim_fingerprint,w06_preflight_id,w06_preflight_fingerprint,control_revision,control_fingerprint,provider,domain,resource_kind,resource_gid,target_url,action_type,field,required_provider_scope,before_fingerprint,after_fingerprint,state,row_revision,forward_attempt_count,rollback_attempt_count,public_write_occurrence,rollback_occurrence,verification_fingerprint,reserved_at,dispatch_started_at,rollback_started_at,terminal_at,terminal_reason,created_at,updated_at FROM policy_mutation_dispatches WHERE site_id=$1::uuid ORDER BY created_at DESC,dispatch_id DESC LIMIT 101",
  parameterKeys: ["siteId"],
  allowedTables: ["policy_mutation_dispatches"],
  allowedColumns: ["dispatch_id","dispatch_version","dispatch_fingerprint","execution_id","execution_provenance","site_id","policy_id","policy_version","policy_fingerprint","evaluation_id","evaluation_fingerprint","materialization_id","materialization_fingerprint","proposal_id","proposal_fingerprint","policy_action_id","reservation_id","reservation_fingerprint","claim_id","claim_fingerprint","w06_preflight_id","w06_preflight_fingerprint","control_revision","control_fingerprint","provider","domain","resource_kind","resource_gid","target_url","action_type","field","required_provider_scope","before_fingerprint","after_fingerprint","state","row_revision","forward_attempt_count","rollback_attempt_count","public_write_occurrence","rollback_occurrence","verification_fingerprint","reserved_at","dispatch_started_at","rollback_started_at","terminal_at","terminal_reason","created_at","updated_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "created_at DESC, dispatch_id DESC",
  mandatory: false,
});

const Q12 = descriptor({
  queryId: "w09b.policy_dispatch_events.v1",
  queryVersion: "v1",
  purpose: "read exact W07 dispatch transition history for bounded dispatches",
  sql: "SELECT event_id,event_version,event_fingerprint,dispatch_id,site_id::text AS site_id,from_revision,from_state,to_revision,to_state,transition_reason,provider_request_fingerprint,public_write_occurrence,rollback_occurrence,effective_at,created_at FROM policy_mutation_dispatch_events WHERE dispatch_id=ANY($1::text[]) ORDER BY dispatch_id ASC,to_revision ASC,event_fingerprint ASC LIMIT 1001",
  parameterKeys: ["dispatchIds"],
  allowedTables: ["policy_mutation_dispatch_events"],
  allowedColumns: ["event_id","event_version","event_fingerprint","dispatch_id","site_id","from_revision","from_state","to_revision","to_state","transition_reason","provider_request_fingerprint","public_write_occurrence","rollback_occurrence","effective_at","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 1001,
  maxTotalRows: 1001,
  ordering: "dispatch_id ASC, to_revision ASC, event_fingerprint ASC",
  mandatory: false,
});

const Q13 = descriptor({
  queryId: "w09b.human_actions.v1",
  queryVersion: "v1",
  purpose: "read optional exact human-governed action/plan history for candidate pages",
  sql: "SELECT ap.id::text AS action_plan_id,ap.site_id::text AS site_id,ap.opportunity_id::text AS opportunity_id,ap.status AS plan_status,ap.risk_level,ap.created_at AS plan_created_at,ap.updated_at AS plan_updated_at,a.id::text AS action_id,a.page_id::text AS page_id,a.action_type,a.status AS action_status,a.target,a.proposed_change,a.expected_state,a.created_at AS action_created_at,a.updated_at AS action_updated_at FROM action_plans ap JOIN actions a ON a.action_plan_id=ap.id WHERE ap.site_id=$1::uuid AND a.page_id=ANY($2::uuid[]) ORDER BY ap.created_at DESC,a.created_at DESC,a.id DESC LIMIT 101",
  parameterKeys: ["siteId", "pageIds"],
  allowedTables: ["action_plans", "actions"],
  allowedColumns: ["id","site_id","opportunity_id","status","risk_level","created_at","updated_at","action_plan_id","page_id","action_type","target","proposed_change","expected_state"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "plan.created_at DESC, action.created_at DESC, action.id DESC",
  mandatory: false,
});

const Q14 = descriptor({
  queryId: "w09b.human_approvals.v1",
  queryVersion: "v1",
  purpose: "read optional approvals for bounded action plans",
  sql: "SELECT id::text AS id,action_plan_id::text AS action_plan_id,decision,actor_id,reason,decided_at FROM approvals WHERE action_plan_id=ANY($1::uuid[]) ORDER BY action_plan_id ASC,decided_at ASC,id ASC LIMIT 101",
  parameterKeys: ["actionPlanIds"],
  allowedTables: ["approvals"],
  allowedColumns: ["id","action_plan_id","decision","actor_id","reason","decided_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "action_plan_id ASC, decided_at ASC, id ASC",
  mandatory: false,
});

const Q15 = descriptor({
  queryId: "w09b.human_deployments.v1",
  queryVersion: "v1",
  purpose: "read optional deployment history for bounded action plans",
  sql: "SELECT id::text AS id,action_plan_id::text AS action_plan_id,provider,status,external_ref,deployed_at,metadata,created_at FROM deployments WHERE action_plan_id=ANY($1::uuid[]) ORDER BY action_plan_id ASC,created_at ASC,id ASC LIMIT 101",
  parameterKeys: ["actionPlanIds"],
  allowedTables: ["deployments"],
  allowedColumns: ["id","action_plan_id","provider","status","external_ref","deployed_at","metadata","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "action_plan_id ASC, created_at ASC, id ASC",
  mandatory: false,
});

const Q16 = descriptor({
  queryId: "w09b.human_rollbacks.v1",
  queryVersion: "v1",
  purpose: "read optional rollback history for bounded deployments",
  sql: "SELECT id::text AS id,deployment_id::text AS deployment_id,status,reason,restore_state,rolled_back_at,created_at FROM rollbacks WHERE deployment_id=ANY($1::uuid[]) ORDER BY deployment_id ASC,created_at ASC,id ASC LIMIT 101",
  parameterKeys: ["deploymentIds"],
  allowedTables: ["rollbacks"],
  allowedColumns: ["id","deployment_id","status","reason","restore_state","rolled_back_at","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "deployment_id ASC, created_at ASC, id ASC",
  mandatory: false,
});

const Q17 = descriptor({
  queryId: "w09b.human_verifications.v1",
  queryVersion: "v1",
  purpose: "read optional verification history for bounded deployments/pages",
  sql: "SELECT id::text AS id,deployment_id::text AS deployment_id,page_id::text AS page_id,status,expected_state,actual_state,verified_at,created_at FROM verifications WHERE deployment_id=ANY($1::uuid[]) OR page_id=ANY($2::uuid[]) ORDER BY deployment_id ASC,page_id ASC,created_at ASC,id ASC LIMIT 101",
  parameterKeys: ["deploymentIds", "pageIds"],
  allowedTables: ["verifications"],
  allowedColumns: ["id","deployment_id","page_id","status","expected_state","actual_state","verified_at","created_at"],
  maxInvocations: 1,
  maxRowsPerInvocation: 101,
  maxTotalRows: 101,
  ordering: "deployment_id ASC, page_id ASC, created_at ASC, id ASC",
  mandatory: false,
});

export const P8_8_W09B_QUERY_DESCRIPTORS = Object.freeze([
  Q00,Q01,Q02,Q03,Q04,Q05,Q06,Q07,Q08,Q09,Q10,Q11,Q12,Q13,Q14,Q15,Q16,Q17,
] satisfies readonly P88W09BQueryDescriptor[]);

export const P8_8_W09B_REQUIRED_COLUMNS = Object.freeze({
  sites: ["id","domain","canonical_origin","platform","is_active","updated_at"],
  pages: ["id","site_id","url","normalized_url","path","page_type","indexable","last_seen_at"],
  page_snapshots: ["id","page_id","observed_at","status_code","meta_description","canonical_url","content_hash","raw_signals"],
  evidence: ["id","site_id","page_id","source","kind","observed_at","confidence","payload","provenance","created_at"],
  opportunities: ["id","site_id","page_id","query_id","opportunity_type","status","score","impact_estimate","effort_estimate","rationale","evidence_ids","created_at","updated_at"],
  seo_observation: ["observation_id","schema_version","semantic_key","subject_kind","site_id","canonical_origin","url_id","canonical_url","observation_kind","material_value","value_fingerprint","evidence_set_fingerprint","source_kind","source_fingerprint","collector_id","provenance_fingerprint","confidence","observed_at","fresh_for_ms","stale_after","retention_class","record_fingerprint"],
  seo_evidence: ["reference_fingerprint","evidence_id","evidence_fingerprint","source_kind","source_fingerprint","dimension","quality","availability"],
  seo_observation_evidence: ["observation_id","reference_fingerprint"],
  policy_mutation_reservations: ["reservation_id","reservation_fingerprint","site_id","resource_gid","target_url","field","status","authorized_at","claimed_at","terminal_at","terminal_reason"],
  policy_mutation_control_state: ["site_id","control_version","revision","previous_control_fingerprint","mode","effective_at","control_fingerprint","updated_at"],
  policy_mutation_claims: ["claim_id","claim_fingerprint","reservation_id","site_id","control_revision","control_fingerprint","resource_gid","target_url","field","claimed_at"],
  policy_mutation_dispatches: ["dispatch_id","dispatch_fingerprint","site_id","resource_gid","target_url","field","state","forward_attempt_count","rollback_attempt_count","public_write_occurrence","rollback_occurrence","dispatch_started_at","terminal_at","terminal_reason"],
  policy_mutation_dispatch_events: ["event_id","event_fingerprint","dispatch_id","site_id","to_revision","to_state","transition_reason","public_write_occurrence","rollback_occurrence","effective_at"],
  action_plans: ["id","site_id","opportunity_id","status","risk_level","created_at","updated_at"],
  actions: ["id","action_plan_id","page_id","action_type","status","target","proposed_change","expected_state","created_at","updated_at"],
  approvals: ["id","action_plan_id","decision","actor_id","reason","decided_at"],
  deployments: ["id","action_plan_id","provider","status","external_ref","deployed_at","metadata","created_at"],
  rollbacks: ["id","deployment_id","status","reason","restore_state","rolled_back_at","created_at"],
  verifications: ["id","deployment_id","page_id","status","expected_state","actual_state","verified_at","created_at"],
} as const);

export function p88W09BQuerySetFingerprint(
  descriptors: readonly P88W09BQueryDescriptor[] = P8_8_W09B_QUERY_DESCRIPTORS,
): string {
  return p88W09BStableHash({
    version: P8_8_W09B_QUERY_SET_VERSION,
    purpose: "p8.8_w09b_query_set",
    descriptors,
  });
}

export const P8_8_W09B_QUERY_SET_FINGERPRINT =
  p88W09BQuerySetFingerprint();

export function p88W09BQueryDescriptorFingerprint(
  descriptorValue: P88W09BQueryDescriptor,
): string {
  return p88W09BStableHash({
    version: P8_8_W09B_QUERY_SET_VERSION,
    purpose: "p8.8_w09b_query_descriptor",
    descriptor: descriptorValue,
  });
}

export function p88W09BEvidenceSemantics() {
  return Object.freeze({
    syntheticEngineeringOnly: true,
    realProductionRunAuthorized: false,
    providerReadAuthorized: false,
    persistenceAuthorized: false,
    w09aRemainsDatabaseFree: true,
    suppliedRealSnapshotOnly: true,
    productionReadSnapshotAllowed: false,
    productGidMayBeInferred: false,
    providerAuthorityMayBeInferredFromLabels: false,
    providerAuthorityRequiresExactW06Envelope: true,
    querySetFrozen: true,
    arbitrarySqlAllowed: false,
    w10ActivationAuthorized: false,
  });
}

export function p88W09BEvidenceCapability() {
  return Object.freeze({
    deterministicEvidenceOnly: true,
    productionDatabaseAccessPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteReadPerformed: false,
    publicSiteWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    migrationPerformed: false,
    w03ToW07AuthorityCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    routeBound: false,
    startupBound: false,
    schedulerActivated: false,
    workerActivated: false,
    credentialScopeChanged: false,
    publicWriteGateChanged: false,
    policyExecutionGateChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
    w10ActivationAuthorized: false,
  });
}

const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|MERGE|COPY|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMENT|VACUUM|ANALYZE|REFRESH|CALL|DO|LOCK)\b|\bFOR\s+(UPDATE|SHARE)\b|pg_advisory|pg_sleep/i;

export function p88W09BQueryDescriptorIssues(
  descriptors: readonly P88W09BQueryDescriptor[] = P8_8_W09B_QUERY_DESCRIPTORS,
): string[] {
  const issues: string[] = [];
  if (descriptors.length !== 18) issues.push("p88_w09b_query_descriptor_count_invalid");
  const ids = new Set<string>();
  for (const item of descriptors) {
    if (ids.has(item.queryId)) issues.push("p88_w09b_query_id_duplicate");
    ids.add(item.queryId);
    if (!/^SELECT\b/i.test(item.sql.trim())) issues.push("p88_w09b_query_not_select");
    if (FORBIDDEN_SQL.test(item.sql)) issues.push("p88_w09b_query_forbidden_sql");
    if (item.sqlHash !== p88W09BStableHash({ purpose: "p8.8_w09b_sql", sql: item.sql })) {
      issues.push("p88_w09b_query_sql_hash_mismatch");
    }
    if (
      !Number.isInteger(item.maxInvocations) || item.maxInvocations < 1
      || !Number.isInteger(item.maxRowsPerInvocation) || item.maxRowsPerInvocation < 1
      || !Number.isInteger(item.maxTotalRows) || item.maxTotalRows < 1
    ) issues.push("p88_w09b_query_cap_invalid");
  }
  return [...new Set(issues)].sort();
}

export function assertP88W09BQueryDescriptors(
  descriptors: readonly P88W09BQueryDescriptor[] = P8_8_W09B_QUERY_DESCRIPTORS,
): void {
  const issues = p88W09BQueryDescriptorIssues(descriptors);
  if (issues.length) throw new Error("p88_w09b_query_descriptor_integrity_failure:" + issues.join(","));
}

export function buildP88W09BQueryResult(input: {
  descriptor: P88W09BQueryDescriptor;
  invocationIndex: number;
  parameters: unknown;
  rows: readonly Readonly<Record<string, unknown>>[];
}): P88W09BQueryResultEnvelope {
  if (input.invocationIndex < 0 || input.invocationIndex >= input.descriptor.maxInvocations) {
    throw new Error("p88_w09b_query_invocation_limit_exceeded");
  }
  const rows = Object.freeze(input.rows.map((row) => Object.freeze({ ...row })));
  const overflowDetected = rows.length > input.descriptor.maxRowsPerInvocation;
  return Object.freeze({
    queryId: input.descriptor.queryId,
    queryVersion: "v1",
    descriptorFingerprint: p88W09BQueryDescriptorFingerprint(input.descriptor),
    invocationIndex: input.invocationIndex,
    parameterFingerprint: p88W09BStableHash({
      purpose: "p8.8_w09b_query_parameters",
      queryId: input.descriptor.queryId,
      parameters: input.parameters,
    }),
    rowCount: rows.length,
    rowResultFingerprint: p88W09BStableHash({
      purpose: "p8.8_w09b_query_result",
      queryId: input.descriptor.queryId,
      rows,
    }),
    overflowDetected,
    rows,
  });
}

function candidateFingerprintPayload(
  candidate: Omit<P88W09BAcquisitionCandidate, "candidateId" | "candidateFingerprint">,
): unknown {
  return candidate;
}

export function buildP88W09BAcquisitionCandidate(
  input: Omit<P88W09BAcquisitionCandidate, "candidateId" | "candidateFingerprint">,
): P88W09BAcquisitionCandidate {
  const reasons = [...new Set(input.incompleteReasons)].sort() as P88W09BCandidateIncompleteReason[];
  const completeness: P88W09BCandidateCompleteness =
    reasons.length === 0 ? "complete_for_w09a" : reasons[0]!;
  const base = {
    ...input,
    incompleteReasons: Object.freeze(reasons),
    completeness,
  };
  const candidateFingerprint = p88W09BStableHash({
    version: P8_8_W09B_EVIDENCE_VERSION,
    purpose: "p8.8_w09b_acquisition_candidate",
    candidate: candidateFingerprintPayload(base),
  });
  return Object.freeze({
    ...base,
    candidateFingerprint,
    candidateId: "p88w09b-candidate-" + candidateFingerprint.slice(0, 24),
  });
}

function summarize(
  queryResults: readonly P88W09BQueryResultEnvelope[],
  candidates: readonly P88W09BAcquisitionCandidate[],
): P88W09BAcquisitionSummary {
  const incompleteCountsByReason: Record<string, number> = {};
  for (const candidate of candidates) {
    for (const reason of candidate.incompleteReasons) {
      incompleteCountsByReason[reason] = (incompleteCountsByReason[reason] ?? 0) + 1;
    }
  }
  const queryRowCounts = Object.fromEntries(
    queryResults
      .map((result) => [result.queryId, result.rowCount] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const opportunityResult = queryResults.find(
    (result) => result.queryId === "w09b.candidate_opportunities.v1",
  );
  return Object.freeze({
    opportunitiesScanned: Math.min(
      P8_8_W09B_MAX_SOURCE_OPPORTUNITIES,
      opportunityResult?.rowCount ?? 0,
    ),
    selectedCandidateCount: candidates.length,
    completeCount: candidates.filter((candidate) =>
      candidate.completeness === "complete_for_w09a"
    ).length,
    incompleteCount: candidates.filter((candidate) =>
      candidate.completeness !== "complete_for_w09a"
    ).length,
    incompleteCountsByReason: Object.freeze(
      Object.fromEntries(
        Object.entries(incompleteCountsByReason).sort(([a], [b]) => a.localeCompare(b)),
      ),
    ),
    queryRowCounts: Object.freeze(queryRowCounts),
    overflowCount: queryResults.filter((result) => result.overflowDetected).length,
    providerAuthoritativeBeforeCount: candidates.filter(
      (candidate) => candidate.providerBeforeWitness !== null,
    ).length,
    productGidPresentCount: candidates.filter(
      (candidate) => candidate.productGidWitness !== null,
    ).length,
    policyHistoryCompleteCount: candidates.filter((candidate) =>
      !candidate.incompleteReasons.includes("mutation_history_incomplete")
      && !candidate.incompleteReasons.includes("quota_state_incomplete")
      && !candidate.incompleteReasons.includes("cooldown_state_incomplete")
    ).length,
    humanComparisonSourceCount: candidates.filter((candidate) =>
      candidate.humanActions.length > 0
      || candidate.humanDeployments.length > 0
      || candidate.humanVerifications.length > 0
    ).length,
  });
}

function packageFingerprintPayload(
  input: Omit<P88W09BAcquisitionPackage, "packageId" | "packageFingerprint">,
): unknown {
  return input;
}

export function buildP88W09BAcquisitionPackage(
  input: P88W09BAcquisitionPackageInput,
): P88W09BAcquisitionPackage {
  assertP88W09BQueryDescriptors(input.querySet.descriptors);
  if (input.querySet.querySetFingerprint !== p88W09BQuerySetFingerprint(input.querySet.descriptors)) {
    throw new Error("p88_w09b_query_set_fingerprint_mismatch");
  }
  if (input.request.expectedQuerySetFingerprint !== input.querySet.querySetFingerprint) {
    throw new Error("p88_w09b_request_query_set_fingerprint_mismatch");
  }
  const summary = summarize(input.queryResults, input.candidates);
  const withoutIdentity = {
    ...input,
    summary,
    semantics: p88W09BEvidenceSemantics(),
    safety: p88W09BEvidenceCapability(),
  };
  const packageFingerprint = p88W09BStableHash({
    version: P8_8_W09B_EVIDENCE_VERSION,
    purpose: "p8.8_w09b_acquisition_package",
    package: packageFingerprintPayload(withoutIdentity),
  });
  return Object.freeze({
    ...withoutIdentity,
    packageFingerprint,
    packageId: "p88w09b-package-" + packageFingerprint.slice(0, 24),
  });
}

export function p88W09BAcquisitionPackageIntegrityIssues(
  pkg: P88W09BAcquisitionPackage,
): string[] {
  const issues: string[] = [];
  if (pkg.version !== P8_8_W09B_EVIDENCE_VERSION) issues.push("p88_w09b_package_version_mismatch");
  if (!HEX_64.test(pkg.packageFingerprint)) issues.push("p88_w09b_package_fingerprint_invalid");
  if (pkg.packageId !== "p88w09b-package-" + pkg.packageFingerprint.slice(0, 24)) {
    issues.push("p88_w09b_package_id_mismatch");
  }
  if (!HEX_40.test(pkg.request.expectedApplicationSha)) {
    issues.push("p88_w09b_application_sha_invalid");
  }
  if (!HEX_40.test(pkg.request.expectedApplicationTree)) {
    issues.push("p88_w09b_application_tree_invalid");
  }
  if (pkg.querySet.descriptors.length !== 18) issues.push("p88_w09b_query_descriptor_count_invalid");
  issues.push(...p88W09BQueryDescriptorIssues(pkg.querySet.descriptors));
  if (pkg.querySet.querySetFingerprint !== p88W09BQuerySetFingerprint(pkg.querySet.descriptors)) {
    issues.push("p88_w09b_query_set_fingerprint_mismatch");
  }
  const descriptorById = new Map(pkg.querySet.descriptors.map((item) => [item.queryId, item]));
  const seenMandatory = new Set<P88W09BQueryId>();
  for (const result of pkg.queryResults) {
    const descriptorValue = descriptorById.get(result.queryId);
    if (!descriptorValue) {
      issues.push("p88_w09b_query_not_frozen");
      continue;
    }
    if (descriptorValue.mandatory) seenMandatory.add(result.queryId);
    if (result.descriptorFingerprint !== p88W09BQueryDescriptorFingerprint(descriptorValue)) {
      issues.push("p88_w09b_query_descriptor_fingerprint_mismatch");
    }
    if (result.rowCount !== result.rows.length) issues.push("p88_w09b_query_row_count_mismatch");
    if (
      result.rowResultFingerprint !== p88W09BStableHash({
        purpose: "p8.8_w09b_query_result",
        queryId: result.queryId,
        rows: result.rows,
      })
    ) issues.push("p88_w09b_query_result_fingerprint_mismatch");
    if (result.overflowDetected !== (result.rowCount > descriptorValue.maxRowsPerInvocation)) {
      issues.push("p88_w09b_query_overflow_marker_mismatch");
    }
  }
  for (const descriptorValue of pkg.querySet.descriptors) {
    if (descriptorValue.mandatory && !seenMandatory.has(descriptorValue.queryId)) {
      issues.push("p88_w09b_mandatory_query_missing");
    }
  }
  const candidateIds = new Set<string>();
  for (const candidate of pkg.candidates) {
    if (candidateIds.has(candidate.candidateId)) issues.push("p88_w09b_candidate_id_duplicate");
    candidateIds.add(candidate.candidateId);
    if (candidate.candidateId !== "p88w09b-candidate-" + candidate.candidateFingerprint.slice(0, 24)) {
      issues.push("p88_w09b_candidate_id_mismatch");
    }
    const { candidateId: _id, candidateFingerprint: _fp, ...candidateBase } = candidate;
    const expected = p88W09BStableHash({
      version: P8_8_W09B_EVIDENCE_VERSION,
      purpose: "p8.8_w09b_acquisition_candidate",
      candidate: candidateFingerprintPayload(candidateBase),
    });
    if (expected !== candidate.candidateFingerprint) issues.push("p88_w09b_candidate_fingerprint_mismatch");
    if (candidate.productGidWitness && !PRODUCT_GID.test(candidate.productGidWitness.resourceGid)) {
      issues.push("p88_w09b_product_gid_witness_invalid");
    }
    if (
      candidate.completeness === "complete_for_w09a"
      && candidate.incompleteReasons.length !== 0
    ) issues.push("p88_w09b_complete_candidate_has_incomplete_reason");
    if (
      candidate.completeness !== "complete_for_w09a"
      && candidate.incompleteReasons.length === 0
    ) issues.push("p88_w09b_incomplete_candidate_missing_reason");
  }
  const expectedSummary = summarize(pkg.queryResults, pkg.candidates);
  if (p88W09BStableJson(expectedSummary) !== p88W09BStableJson(pkg.summary)) {
    issues.push("p88_w09b_package_summary_mismatch");
  }
  if (p88W09BStableJson(pkg.semantics) !== p88W09BStableJson(p88W09BEvidenceSemantics())) {
    issues.push("p88_w09b_semantics_marker_mismatch");
  }
  if (p88W09BStableJson(pkg.safety) !== p88W09BStableJson(p88W09BEvidenceCapability())) {
    issues.push("p88_w09b_safety_marker_mismatch");
  }
  const { packageId: _id, packageFingerprint: _fp, ...withoutIdentity } = pkg;
  const expectedPackage = p88W09BStableHash({
    version: P8_8_W09B_EVIDENCE_VERSION,
    purpose: "p8.8_w09b_acquisition_package",
    package: packageFingerprintPayload(withoutIdentity),
  });
  if (expectedPackage !== pkg.packageFingerprint) {
    issues.push("p88_w09b_package_fingerprint_mismatch");
  }
  return [...new Set(issues)].sort();
}

export function assertP88W09BAcquisitionPackageIntegrity(
  pkg: P88W09BAcquisitionPackage,
): void {
  const issues = p88W09BAcquisitionPackageIntegrityIssues(pkg);
  if (issues.length) {
    throw new Error("p88_w09b_acquisition_package_integrity_failure:" + issues.join(","));
  }
}

export function p88W09BRequestForGrant(input: {
  applicationSha: string;
  applicationTree: string;
  databaseName: string;
  roleIdentity: string;
  grant: P88PolicyGrant;
  referenceTime: string;
  environmentClass?: P88W09BAcquisitionRequest["environmentClass"];
}): P88W09BAcquisitionRequest {
  return Object.freeze({
    version: P8_8_W09B_EVIDENCE_VERSION,
    environmentClass: input.environmentClass ?? "synthetic_ephemeral",
    expectedApplicationSha: input.applicationSha,
    expectedApplicationTree: input.applicationTree,
    expectedQuerySetFingerprint: P8_8_W09B_QUERY_SET_FINGERPRINT,
    expectedDatabaseName: input.databaseName,
    expectedRoleIdentity: input.roleIdentity,
    domain: "diamondshelf.us",
    canonicalOrigin: "https://diamondshelf.us",
    platform: "shopify",
    policy: Object.freeze({
      policyId: input.grant.policyId,
      policyVersion: input.grant.policyVersion,
      policyFingerprint: input.grant.policyFingerprint,
    }),
    acquisitionReferenceTime: input.referenceTime,
    maximumFinalCandidates: 25,
    maximumOpportunityScan: 100,
    providerNetworkReadAllowed: false,
    persistenceAllowed: false,
    w10ActivationAllowed: false,
  });
}

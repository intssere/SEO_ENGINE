import postgres from "postgres";
import {
  P8_8_W09B_MAX_FINAL_CANDIDATES,
  P8_8_W09B_MAX_SOURCE_OPPORTUNITIES,
  P8_8_W09B_QUERY_DESCRIPTORS,
  P8_8_W09B_QUERY_SET_FINGERPRINT,
  P8_8_W09B_QUERY_SET_VERSION,
  P8_8_W09B_REQUIRED_COLUMNS,
  buildP88W09BAcquisitionCandidate,
  buildP88W09BAcquisitionPackage,
  buildP88W09BQueryResult,
  p88W09BQueryDescriptorFingerprint,
  p88W09BStableHash,
  type P88W09BAcquisitionCandidate,
  type P88W09BAcquisitionPackage,
  type P88W09BAcquisitionRequest,
  type P88W09BCandidateIncompleteReason,
  type P88W09BProductGidWitness,
  type P88W09BProviderBeforeWitness,
  type P88W09BQueryDescriptor,
  type P88W09BQueryId,
  type P88W09BQueryResultEnvelope,
  type P88W09BReconstructionEvidence,
} from "./p8-8-w09b-evidence-contract.js";
import {
  assertP88W06ProviderObservationIntegrity,
  type P88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";
import type { P88PolicyCandidate } from "./p8-8-policy-grant-evaluation.js";

type Sql = ReturnType<typeof postgres>;
type Row = Readonly<Record<string, unknown>>;

const BLOCKING_DISPATCH_STATES = new Set([
  "reserved_prewrite",
  "dispatch_started",
  "forward_verification_pending",
  "rollback_required",
  "rollback_started",
  "rollback_verification_pending",
  "manual_intervention_required",
]);

const SAFE_TERMINAL_DISPATCH_STATES = new Set([
  "forward_rejected_no_write",
  "forward_verified_live",
  "rollback_verified_closed",
  "cancelled_before_dispatch",
]);

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/;
const HEX_64 = /^[0-9a-f]{64}$/;

function asIso(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(asIso);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        asIso(nested),
      ]),
    );
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

function normalizeRows(rows: readonly Record<string, unknown>[]): readonly Row[] {
  return Object.freeze(rows.map((row) =>
    Object.freeze(asIso(row) as Record<string, unknown>)
  ));
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function canonicalIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return null;
  const canonical = new Date(millis).toISOString();
  return canonical === value ? value : canonical;
}

function descriptor(queryId: P88W09BQueryId): P88W09BQueryDescriptor {
  const found = P8_8_W09B_QUERY_DESCRIPTORS.find((item) => item.queryId === queryId);
  if (!found) throw new Error("p88_w09b_query_not_frozen");
  return found;
}

function isLocalhostDatabaseUrl(databaseUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:")
    && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    && (
      parsed.pathname.replace(/^\//, "") === "seo_engine_test"
      || parsed.pathname.replace(/^\//, "").startsWith("seo_engine_w09b_")
    )
  );
}

export type P88W09BReadonlyAcquisitionOptions = Readonly<{
  databaseUrl: string;
  request: P88W09BAcquisitionRequest;
  requireLocalhost?: boolean;
  sqlFactory?: (databaseUrl: string) => Sql;
}>;

function requiredColumnKeys(): string[] {
  return Object.entries(P8_8_W09B_REQUIRED_COLUMNS)
    .flatMap(([table, columns]) => columns.map((column) => table + "." + column))
    .sort();
}

function schemaState(rows: readonly Row[]):
  | "full_w07_schema"
  | "missing_w04"
  | "missing_w05"
  | "missing_w07"
  | "core_or_observation_missing"
  | "column_contract_mismatch" {
  const columns = new Map<string, Set<string>>();
  for (const row of rows) {
    const table = stringValue(row.table_name);
    const column = stringValue(row.column_name);
    if (!table || !column) continue;
    if (!columns.has(table)) columns.set(table, new Set());
    columns.get(table)!.add(column);
  }
  const missingColumns: string[] = [];
  for (const [table, required] of Object.entries(P8_8_W09B_REQUIRED_COLUMNS)) {
    const seen = columns.get(table);
    if (!seen) continue;
    for (const column of required) {
      if (!seen.has(column)) missingColumns.push(table + "." + column);
    }
  }
  if (missingColumns.length) return "column_contract_mismatch";

  const core = [
    "sites","pages","page_snapshots","evidence","opportunities",
    "seo_observation","seo_evidence","seo_observation_evidence",
    "action_plans","actions","approvals","deployments","rollbacks","verifications",
  ];
  if (core.some((table) => !columns.has(table))) return "core_or_observation_missing";
  if (!columns.has("policy_mutation_reservations")) return "missing_w04";
  if (
    !columns.has("policy_mutation_control_state")
    || !columns.has("policy_mutation_claims")
  ) return "missing_w05";
  if (
    !columns.has("policy_mutation_dispatches")
    || !columns.has("policy_mutation_dispatch_events")
  ) return "missing_w07";
  return "full_w07_schema";
}

function exactProductGidWitness(input: {
  evidenceRows: readonly Row[];
  pageUrl: string;
}): { witness: P88W09BProductGidWitness | null; ambiguous: boolean } {
  const witnesses: P88W09BProductGidWitness[] = [];
  for (const row of input.evidenceRows) {
    const payload = objectValue(row.payload);
    const provenance = objectValue(row.provenance);
    const resourceGid = stringValue(payload?.resourceGid);
    const sourceFingerprint = stringValue(provenance?.sourceFingerprint);
    const id = stringValue(row.id);
    if (
      !resourceGid || !PRODUCT_GID.test(resourceGid)
      || !sourceFingerprint || !HEX_64.test(sourceFingerprint)
      || !id
    ) continue;
    witnesses.push(Object.freeze({
      resourceGid,
      sourceRecordKind: stringValue(row.kind) ?? "legacy_evidence",
      sourceRecordId: id,
      sourceFingerprint,
      sourceFieldPath: "payload.resourceGid",
      candidateUrl: input.pageUrl,
    }));
  }
  const byGid = new Map(witnesses.map((item) => [item.resourceGid, item]));
  if (byGid.size > 1) return { witness: null, ambiguous: true };
  return { witness: [...byGid.values()][0] ?? null, ambiguous: false };
}

function reconstructionEvidence(rows: readonly Row[]): P88W09BReconstructionEvidence | null {
  for (const row of rows) {
    const payload = objectValue(row.payload);
    const reconstruction = objectValue(payload?.reconstruction);
    if (!reconstruction) continue;
    const w02Input = reconstruction.w02Input;
    const w02Materialization = reconstruction.w02Materialization;
    const quality = objectValue(reconstruction.quality);
    const risk = objectValue(reconstruction.risk);
    const evidenceIds = arrayValue(reconstruction.evidenceIds).filter(
      (value): value is string => typeof value === "string",
    );
    const missingEvidence = arrayValue(reconstruction.missingEvidence).filter(
      (value): value is string => typeof value === "string",
    );
    if (!w02Input || !w02Materialization || !quality || !risk) continue;
    if (
      typeof quality.status !== "string"
      || typeof quality.approvalEligible !== "boolean"
      || typeof quality.score !== "number"
      || !Array.isArray(quality.blockingReasons)
      || !Array.isArray(quality.warnings)
      || typeof risk.classification !== "string"
    ) continue;
    return Object.freeze({
      w02Input: w02Input as P88W09BReconstructionEvidence["w02Input"],
      w02Materialization:
        w02Materialization as P88W09BReconstructionEvidence["w02Materialization"],
      evidenceIds: Object.freeze([...evidenceIds]),
      missingEvidence: Object.freeze([...missingEvidence]),
      quality: Object.freeze({
        status: quality.status,
        approvalEligible: quality.approvalEligible,
        score: quality.score,
        blockingReasons: Object.freeze(
          quality.blockingReasons.filter((value): value is string =>
            typeof value === "string"
          ),
        ),
        warnings: Object.freeze(
          quality.warnings.filter((value): value is string =>
            typeof value === "string"
          ),
        ),
      }),
      risk: Object.freeze({
        classification: risk.classification as P88PolicyCandidate["risk"]["classification"],
      }),
    });
  }
  return null;
}

function providerWitness(input: {
  observations: readonly Row[];
  siteId: string;
  resourceGid: string | null;
  referenceTime: string;
}): {
  witness: P88W09BProviderBeforeWitness | null;
  stale: boolean;
  invalidEnvelope: boolean;
} {
  let stale = false;
  let invalidEnvelope = false;
  for (const row of input.observations) {
    const material = objectValue(row.material_value);
    const raw = material?.providerObservation;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const observation = raw as P88W06ProviderObservation;
    try {
      assertP88W06ProviderObservationIntegrity(observation);
    } catch {
      invalidEnvelope = true;
      continue;
    }
    if (
      observation.status !== "observed"
      || observation.siteId !== input.siteId
      || observation.provider !== "shopify"
      || observation.resourceKind !== "product"
      || !input.resourceGid
      || observation.resourceGid !== input.resourceGid
      || observation.field !== "meta_description"
      || observation.observedBeforeFingerprint === null
      || observation.requestProvenanceFingerprint === null
      || observation.providerDispatchAttempted !== false
      || observation.providerMutationCalled !== false
      || observation.providerWritePerformed !== false
    ) continue;
    const observedAt = canonicalIso(row.observed_at);
    const staleAfter = canonicalIso(row.stale_after);
    const freshForMs = numberValue(row.fresh_for_ms);
    const observationId = stringValue(row.observation_id);
    const recordFingerprint = stringValue(row.record_fingerprint);
    const provenanceFingerprint = stringValue(row.provenance_fingerprint);
    if (
      !observedAt || !staleAfter || freshForMs === null
      || !observationId
      || !recordFingerprint || !HEX_64.test(recordFingerprint)
      || !provenanceFingerprint || !HEX_64.test(provenanceFingerprint)
    ) {
      invalidEnvelope = true;
      continue;
    }
    const expectedStaleAfter = new Date(Date.parse(observedAt) + freshForMs).toISOString();
    if (expectedStaleAfter !== staleAfter) {
      invalidEnvelope = true;
      continue;
    }
    if (
      Date.parse(observedAt) > Date.parse(input.referenceTime)
      || Date.parse(staleAfter) <= Date.parse(input.referenceTime)
    ) {
      stale = true;
      continue;
    }
    return {
      witness: Object.freeze({
        observation,
        container: Object.freeze({
          observationId,
          recordFingerprint,
          provenanceFingerprint,
          observedAt,
          freshForMs,
          staleAfter,
        }),
      }),
      stale: false,
      invalidEnvelope,
    };
  }
  return { witness: null, stale, invalidEnvelope };
}

function relevantByPage<T extends Row>(
  rows: readonly T[],
  pageId: string,
): T[] {
  return rows.filter((row) => stringValue(row.page_id) === pageId);
}

function currentState(input: {
  siteId: string;
  resourceGid: string | null;
  field: string;
  referenceTime: string;
  providerFingerprint: string | null;
  controlRows: readonly Row[];
  reservations: readonly Row[];
  dispatches: readonly Row[];
  humanActions: readonly Row[];
  humanDeployments: readonly Row[];
  pageId: string;
  historyOverflow: boolean;
}): {
  value: P88W09BAcquisitionCandidate["derivedCurrentState"];
  reasons: P88W09BCandidateIncompleteReason[];
} {
  const reasons: P88W09BCandidateIncompleteReason[] = [];
  if (input.controlRows.length !== 1) {
    reasons.push("control_state_missing");
    return { value: null, reasons };
  }
  if (input.historyOverflow) {
    reasons.push(
      "mutation_history_incomplete",
      "quota_state_incomplete",
      "cooldown_state_incomplete",
    );
    return { value: null, reasons };
  }
  const control = input.controlRows[0]!;
  const mode = stringValue(control.mode);
  const controlFingerprint = stringValue(control.control_fingerprint);
  if (
    !mode || !["running","paused","draining","drained","killed"].includes(mode)
    || !controlFingerprint || !HEX_64.test(controlFingerprint)
  ) {
    reasons.push("control_state_missing");
    return { value: null, reasons };
  }
  if (!input.providerFingerprint || !HEX_64.test(input.providerFingerprint)) {
    reasons.push("provider_before_not_authoritative");
    return { value: null, reasons };
  }

  const referenceMs = Date.parse(input.referenceTime);
  const matchingDispatches = input.dispatches.filter((row) =>
    stringValue(row.resource_gid) === input.resourceGid
    && stringValue(row.field) === input.field
  );
  const forwardDispatches = input.dispatches.filter(
    (row) => numberValue(row.forward_attempt_count) === 1,
  );
  const quotaUsed = forwardDispatches.filter((row) => {
    const started = canonicalIso(row.dispatch_started_at);
    return started !== null && Date.parse(started) >= referenceMs - 24 * 60 * 60 * 1000;
  }).length;
  const cooldownUsed = matchingDispatches.some((row) => {
    if (numberValue(row.forward_attempt_count) !== 1) return false;
    const started = canonicalIso(row.dispatch_started_at);
    return started !== null && Date.parse(started) >= referenceMs - 336 * 60 * 60 * 1000;
  });
  const blocking = input.dispatches.filter((row) =>
    BLOCKING_DISPATCH_STATES.has(stringValue(row.state) ?? "")
  ).length;
  const unresolvedManual = input.reservations.some(
    (row) => stringValue(row.status) === "manual_intervention",
  ) || input.dispatches.some(
    (row) => stringValue(row.state) === "manual_intervention_required",
  );
  const unresolvedUncertain = input.dispatches.some((row) => {
    const occurrence = stringValue(row.public_write_occurrence);
    const state = stringValue(row.state);
    return (occurrence === "possible" || occurrence === "confirmed")
      && !SAFE_TERMINAL_DISPATCH_STATES.has(state ?? "");
  });
  const unresolvedRollback = input.dispatches.some((row) => {
    const rollback = stringValue(row.rollback_occurrence);
    const state = stringValue(row.state);
    return (rollback === "possible" || rollback === "confirmed")
      && state !== "rollback_verified_closed";
  });

  const humanActionByPlan = new Map<string, Row[]>();
  for (const action of input.humanActions) {
    if (stringValue(action.page_id) !== input.pageId) continue;
    const planId = stringValue(action.action_plan_id);
    if (!planId) continue;
    if (!humanActionByPlan.has(planId)) humanActionByPlan.set(planId, []);
    humanActionByPlan.get(planId)!.push(action);
  }
  let exactHumanDeploymentCount = 0;
  for (const deployment of input.humanDeployments) {
    const planId = stringValue(deployment.action_plan_id);
    if (!planId) continue;
    const actions = humanActionByPlan.get(planId) ?? [];
    const exactAction = actions.some((action) => {
      const target = objectValue(action.target);
      return (
        stringValue(target?.resourceGid) === input.resourceGid
        && stringValue(target?.field) === input.field
      );
    });
    if (exactAction && stringValue(deployment.provider) === "shopify") {
      exactHumanDeploymentCount += 1;
    }
  }

  return {
    value: Object.freeze({
      providerObservedBeforeFingerprint: input.providerFingerprint,
      priorDeploymentCount:
        matchingDispatches.filter((row) => numberValue(row.forward_attempt_count) === 1).length
        + exactHumanDeploymentCount,
      otherActiveSiteMutationCount: blocking,
      sameTargetCooldownSatisfied: !cooldownUsed,
      mutationQuotaRemaining: Math.max(0, 1 - quotaUsed),
      unresolvedManualIntervention: unresolvedManual,
      unresolvedUncertainProviderWrite: unresolvedUncertain,
      unresolvedRollbackFailure: unresolvedRollback,
      mutationControlMode: mode as P88PolicyCandidate["currentState"]["mutationControlMode"],
      mutationControlFingerprint: controlFingerprint,
    }),
    reasons,
  };
}

function groupBy<T extends Row>(rows: readonly T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const value = stringValue(row[key]);
    if (!value) continue;
    if (!map.has(value)) map.set(value, []);
    map.get(value)!.push(row);
  }
  return map;
}

export function p88W09BReadonlyAcquisitionCapability() {
  return Object.freeze({
    explicitDatabaseUrlOnly: true,
    ambientDatabaseUrlUsed: false,
    databaseReadPerformed: true,
    databaseWritePerformed: false,
    schemaReadPerformed: true,
    schemaMutationPerformed: false,
    transactionReadOnlyRequired: true,
    repeatableReadRequired: true,
    rowLockPerformed: false,
    advisoryLockPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteReadPerformed: false,
    publicSiteWritePerformed: false,
    persistencePerformed: false,
    w03ToW07AuthorityCreated: false,
    schedulerActivated: false,
    workerActivated: false,
    deploymentPerformed: false,
    publicationPerformed: false,
    w10ActivationAuthorized: false,
  });
}

export async function acquireP88W09BEvidence(
  options: P88W09BReadonlyAcquisitionOptions,
): Promise<P88W09BAcquisitionPackage> {
  const databaseUrl = options.databaseUrl?.trim() ?? "";
  if (!databaseUrl) throw new Error("p88_w09b_database_url_required");
  if (options.requireLocalhost && !isLocalhostDatabaseUrl(databaseUrl)) {
    throw new Error("p88_w09b_ephemeral_database_url_not_localhost");
  }
  if (options.request.expectedQuerySetFingerprint !== P8_8_W09B_QUERY_SET_FINGERPRINT) {
    throw new Error("p88_w09b_query_set_fingerprint_mismatch");
  }
  const sqlFactory = options.sqlFactory ?? ((url: string) =>
    postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 2,
    }));
  const sql = sqlFactory(databaseUrl);
  const reserved = await sql.reserve();
  const results: P88W09BQueryResultEnvelope[] = [];
  let committed = false;
  const runQuery = async (
    queryId: P88W09BQueryId,
    parameters: Parameters<typeof reserved.unsafe>[1],
    parameterIdentity: unknown,
  ): Promise<readonly Row[]> => {
    const d = descriptor(queryId);
    const raw = await reserved.unsafe<Record<string, unknown>[]>(d.sql, parameters);
    const rows = normalizeRows(raw);
    const envelope = buildP88W09BQueryResult({
      descriptor: d,
      invocationIndex: 0,
      parameters: parameterIdentity,
      rows,
    });
    results.push(envelope);
    return rows;
  };

  try {
    await reserved.unsafe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await reserved.unsafe("SET LOCAL statement_timeout='5000ms'");
    await reserved.unsafe("SET LOCAL lock_timeout='1000ms'");
    await reserved.unsafe("SET LOCAL idle_in_transaction_session_timeout='30000ms'");

    const identityRows = await runQuery(
      "w09b.transaction_identity.v1",
      [],
      {},
    );
    if (identityRows.length !== 1) throw new Error("p88_w09b_transaction_identity_invalid");
    const identity = identityRows[0]!;
    const databaseName = stringValue(identity.database_name);
    const roleIdentity = stringValue(identity.role_identity);
    const readOnly = stringValue(identity.transaction_read_only);
    const isolation = stringValue(identity.transaction_isolation);
    const referenceTime = canonicalIso(identity.reference_time);
    const serverVersion = stringValue(identity.server_version);
    if (readOnly !== "on") throw new Error("p88_w09b_transaction_not_read_only");
    if ((isolation ?? "").toLowerCase().replace(/\s+/g, "_") !== "repeatable_read") {
      throw new Error("p88_w09b_transaction_isolation_invalid");
    }
    if (!databaseName || databaseName !== options.request.expectedDatabaseName) {
      throw new Error("p88_w09b_database_identity_mismatch");
    }
    if (!roleIdentity || roleIdentity !== options.request.expectedRoleIdentity) {
      throw new Error("p88_w09b_role_identity_mismatch");
    }
    if (!referenceTime || !serverVersion) {
      throw new Error("p88_w09b_transaction_identity_invalid");
    }

    const schemaRows = await runQuery(
      "w09b.required_schema.v1",
      [requiredColumnKeys()],
      { requiredColumns: requiredColumnKeys() },
    );
    const detectedSchema = schemaState(schemaRows);
    if (detectedSchema !== "full_w07_schema") {
      throw new Error("p88_w09b_schema_" + detectedSchema);
    }

    const siteRows = await runQuery(
      "w09b.site_identity.v1",
      [
        options.request.domain,
        options.request.canonicalOrigin,
        options.request.platform,
      ],
      {
        domain: options.request.domain,
        canonicalOrigin: options.request.canonicalOrigin,
        platform: options.request.platform,
      },
    );
    if (siteRows.length !== 1) throw new Error("p88_w09b_site_cardinality_invalid");
    const siteRow = siteRows[0]!;
    const siteId = stringValue(siteRow.id);
    if (!siteId) throw new Error("p88_w09b_site_identity_invalid");

    const controlRows = await runQuery(
      "w09b.control_state.v1",
      [siteId],
      { siteId },
    );

    const opportunityRows = await runQuery(
      "w09b.candidate_opportunities.v1",
      [siteId],
      { siteId },
    );
    if (opportunityRows.length > P8_8_W09B_MAX_SOURCE_OPPORTUNITIES) {
      throw new Error("p88_w09b_query_overflow_abort");
    }
    const selected = opportunityRows.slice(0, P8_8_W09B_MAX_FINAL_CANDIDATES);
    const pageIds = [...new Set(
      selected.map((row) => stringValue(row.page_id)).filter((value): value is string => !!value),
    )];
    const urls = [...new Set(
      selected.map((row) => stringValue(row.normalized_url) ?? stringValue(row.url))
        .filter((value): value is string => !!value),
    )];

    const snapshotRows = await runQuery(
      "w09b.page_snapshots.v1",
      [pageIds],
      { pageIds },
    );

    const candidateEvidenceIds = new Map<string, string[]>();
    const allEvidenceIds: string[] = [];
    for (const row of selected) {
      const opportunityId = stringValue(row.opportunity_id);
      if (!opportunityId) continue;
      const ids = arrayValue(row.evidence_ids).filter(
        (value): value is string => typeof value === "string",
      );
      candidateEvidenceIds.set(opportunityId, ids);
      if (ids.length <= 16) allEvidenceIds.push(...ids);
    }
    const uniqueEvidenceIds = [...new Set(allEvidenceIds)].sort();
    if (uniqueEvidenceIds.length > 400) throw new Error("p88_w09b_query_overflow_abort");
    const legacyEvidenceRows = await runQuery(
      "w09b.legacy_evidence.v1",
      [uniqueEvidenceIds],
      { evidenceIds: uniqueEvidenceIds },
    );
    if (legacyEvidenceRows.length > 400) throw new Error("p88_w09b_query_overflow_abort");

    const observationRows = await runQuery(
      "w09b.normalized_observations.v1",
      [siteId, urls],
      { siteId, canonicalUrls: urls },
    );
    const observationIds = observationRows
      .map((row) => stringValue(row.observation_id))
      .filter((value): value is string => !!value);
    const normalizedEvidenceRows = await runQuery(
      "w09b.normalized_evidence.v1",
      [observationIds],
      { observationIds },
    );

    const reservationRows = await runQuery(
      "w09b.policy_reservations.v1",
      [siteId],
      { siteId },
    );
    const claimRows = await runQuery(
      "w09b.policy_claims.v1",
      [siteId],
      { siteId },
    );
    const dispatchRows = await runQuery(
      "w09b.policy_dispatches.v1",
      [siteId],
      { siteId },
    );
    const dispatchIds = dispatchRows
      .map((row) => stringValue(row.dispatch_id))
      .filter((value): value is string => !!value);
    const dispatchEventRows = await runQuery(
      "w09b.policy_dispatch_events.v1",
      [dispatchIds],
      { dispatchIds },
    );

    const humanActionRows = await runQuery(
      "w09b.human_actions.v1",
      [siteId, pageIds],
      { siteId, pageIds },
    );
    const actionPlanIds = [...new Set(
      humanActionRows
        .map((row) => stringValue(row.action_plan_id))
        .filter((value): value is string => !!value),
    )];
    const approvalRows = await runQuery(
      "w09b.human_approvals.v1",
      [actionPlanIds],
      { actionPlanIds },
    );
    const deploymentRows = await runQuery(
      "w09b.human_deployments.v1",
      [actionPlanIds],
      { actionPlanIds },
    );
    const deploymentIds = [...new Set(
      deploymentRows
        .map((row) => stringValue(row.id))
        .filter((value): value is string => !!value),
    )];
    const rollbackRows = await runQuery(
      "w09b.human_rollbacks.v1",
      [deploymentIds],
      { deploymentIds },
    );
    const verificationRows = await runQuery(
      "w09b.human_verifications.v1",
      [deploymentIds, pageIds],
      { deploymentIds, pageIds },
    );

    const snapshotsByPage = groupBy(snapshotRows, "page_id");
    const observationsByUrl = groupBy(observationRows, "canonical_url");
    const evidenceById = new Map(
      legacyEvidenceRows
        .map((row) => [stringValue(row.id), row] as const)
        .filter((entry): entry is [string, Row] => !!entry[0]),
    );
    const normalizedEvidenceByObservation = groupBy(normalizedEvidenceRows, "observation_id");
    const dispatchEventsByDispatch = groupBy(dispatchEventRows, "dispatch_id");

    const candidates: P88W09BAcquisitionCandidate[] = [];
    for (const source of selected) {
      const reasons: P88W09BCandidateIncompleteReason[] = [];
      const opportunityId = stringValue(source.opportunity_id);
      const pageId = stringValue(source.page_id);
      const pageUrl = stringValue(source.normalized_url) ?? stringValue(source.url);
      if (!opportunityId || !pageId || !pageUrl) {
        reasons.push("integrity_failure");
        continue;
      }
      const ids = candidateEvidenceIds.get(opportunityId) ?? [];
      if (ids.length > 16) reasons.push("query_cap_exceeded");
      const legacy = ids.slice(0, 16)
        .map((id) => evidenceById.get(id))
        .filter((row): row is Row => !!row);

      const snapshots = (snapshotsByPage.get(pageId) ?? []);
      if (snapshots.length > 4) reasons.push("query_cap_exceeded");
      const observations = observationsByUrl.get(pageUrl) ?? [];
      if (observations.length > 8) reasons.push("query_cap_exceeded");
      const boundedObservations = observations.slice(0, 8);
      const normalizedEvidence: Row[] = [];
      for (const observation of boundedObservations) {
        const id = stringValue(observation.observation_id);
        if (!id) continue;
        const refs = normalizedEvidenceByObservation.get(id) ?? [];
        if (refs.length > 16) reasons.push("query_cap_exceeded");
        normalizedEvidence.push(...refs.slice(0, 16));
      }

      const gid = exactProductGidWitness({ evidenceRows: legacy, pageUrl });
      if (gid.ambiguous) reasons.push("ambiguous_target_identity");
      else if (!gid.witness) reasons.push("missing_product_gid");

      const provider = providerWitness({
        observations: boundedObservations,
        siteId,
        resourceGid: gid.witness?.resourceGid ?? null,
        referenceTime: options.request.acquisitionReferenceTime,
      });
      if (!provider.witness) {
        if (provider.stale) reasons.push("provider_before_stale");
        else if (provider.invalidEnvelope) reasons.push("integrity_failure");
        else reasons.push("provider_before_not_authoritative");
      }

      const reconstruction = reconstructionEvidence(legacy);
      if (!reconstruction) reasons.push("missing_upstream_lineage");

      const historyOverflow =
        reservationRows.length > 100
        || claimRows.length > 100
        || dispatchRows.length > 100
        || dispatchEventRows.length > 1000;
      if (historyOverflow) reasons.push("mutation_history_incomplete");

      const state = currentState({
        siteId,
        resourceGid: gid.witness?.resourceGid ?? null,
        field: "meta_description",
        referenceTime: options.request.acquisitionReferenceTime,
        providerFingerprint:
          provider.witness?.observation.observedBeforeFingerprint ?? null,
        controlRows,
        reservations: reservationRows,
        dispatches: dispatchRows,
        humanActions: humanActionRows,
        humanDeployments: deploymentRows,
        pageId,
        historyOverflow,
      });
      reasons.push(...state.reasons);

      if (
        reconstruction
        && gid.witness
        && reconstruction.w02Materialization.w01Facts.resourceGid
          !== gid.witness.resourceGid
      ) reasons.push("ambiguous_target_identity");
      if (
        reconstruction
        && reconstruction.w02Materialization.w01Facts.targetUrl !== pageUrl
      ) reasons.push("ambiguous_target_identity");

      const candidate = buildP88W09BAcquisitionCandidate({
        opportunity: source,
        page: Object.freeze({
          id: pageId,
          site_id: siteId,
          url: stringValue(source.url),
          normalized_url: pageUrl,
          path: stringValue(source.path),
          page_type: stringValue(source.page_type),
          indexable: boolValue(source.indexable),
          last_seen_at: source.last_seen_at,
        }),
        pageSnapshots: Object.freeze(snapshots.slice(0, 4)),
        legacyEvidence: Object.freeze(legacy),
        normalizedObservations: Object.freeze(boundedObservations),
        normalizedEvidence: Object.freeze(normalizedEvidence),
        productGidWitness: gid.witness,
        providerBeforeWitness: provider.witness,
        controlState: controlRows[0] ?? null,
        reservations: Object.freeze([...reservationRows]),
        claims: Object.freeze([...claimRows]),
        dispatches: Object.freeze([...dispatchRows]),
        dispatchEvents: Object.freeze(
          dispatchIds.flatMap((id) => dispatchEventsByDispatch.get(id) ?? []),
        ),
        humanActions: Object.freeze(relevantByPage(humanActionRows, pageId)),
        humanApprovals: Object.freeze([...approvalRows]),
        humanDeployments: Object.freeze([...deploymentRows]),
        humanRollbacks: Object.freeze([...rollbackRows]),
        humanVerifications: Object.freeze(relevantByPage(verificationRows, pageId)),
        reconstruction,
        derivedCurrentState: state.value,
        completeness: "complete_for_w09a",
        incompleteReasons: Object.freeze([...new Set(reasons)].sort()),
      });
      candidates.push(candidate);
    }

    const transactionStartFingerprint = p88W09BStableHash({
      purpose: "p8.8_w09b_transaction_start",
      databaseName,
      roleIdentity,
      referenceTime,
      serverVersion,
      querySetFingerprint: P8_8_W09B_QUERY_SET_FINGERPRINT,
    });
    const transactionCompletionFingerprint = p88W09BStableHash({
      purpose: "p8.8_w09b_transaction_completion",
      transactionStartFingerprint,
      queryResultFingerprints: results.map((result) => result.rowResultFingerprint),
      candidateFingerprints: candidates.map((candidate) => candidate.candidateFingerprint),
    });

    const siteResult = results.find((result) =>
      result.queryId === "w09b.site_identity.v1"
    )!;
    const packageValue = buildP88W09BAcquisitionPackage({
      version: "p8-8-w09b-synthetic-evidence-v1",
      request: options.request,
      querySet: Object.freeze({
        version: P8_8_W09B_QUERY_SET_VERSION,
        querySetFingerprint: P8_8_W09B_QUERY_SET_FINGERPRINT,
        descriptors: P8_8_W09B_QUERY_DESCRIPTORS,
      }),
      transaction: Object.freeze({
        databaseName,
        roleIdentity,
        referenceTime,
        serverVersion,
        transactionReadOnly: true,
        transactionIsolation: "repeatable_read",
        startFingerprint: transactionStartFingerprint,
        completionFingerprint: transactionCompletionFingerprint,
      }),
      schemaState: detectedSchema,
      site: Object.freeze({
        siteId,
        domain: "diamondshelf.us",
        canonicalOrigin: "https://diamondshelf.us",
        platform: "shopify",
        active: true,
        sourceResultFingerprint: siteResult.rowResultFingerprint,
      }),
      policy: options.request.policy,
      queryResults: Object.freeze([...results]),
      candidates: Object.freeze(candidates),
    });

    await reserved.unsafe("COMMIT");
    committed = true;
    return packageValue;
  } catch (error) {
    if (!committed) {
      await reserved.unsafe("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    reserved.release();
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export function p88W09BDescriptorFingerprintMap(): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(
    P8_8_W09B_QUERY_DESCRIPTORS.map((item) => [
      item.queryId,
      p88W09BQueryDescriptorFingerprint(item),
    ]),
  ));
}

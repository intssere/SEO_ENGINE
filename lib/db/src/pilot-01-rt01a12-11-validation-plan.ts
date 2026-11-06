/**
 * PILOT-01 RT01-A12.11 — disconnected, network-free PostgreSQL validation PLAN.
 * No SQL, schema execution, DB driver, credentials, routes, workers or exports.
 * A complete plan is not evidence of any passed PostgreSQL security test.
 */
export type ValidationCase =
  | "canonical_0001_0011_replay" | "migration_ledger_checksum" | "schema_drift"
  | "additive_index_fk_lock_rollback" | "non_superuser_roles"
  | "rls_read_cross_tenant" | "rls_write_cross_tenant" | "rls_bypass_denial"
  | "security_definer_search_path" | "membership_revoke_wins"
  | "issuer_revoke_wins" | "admission_commits_first"
  | "stale_membership_revision" | "stale_issuer_revision"
  | "session_revoked_expired" | "viewer_denied"
  | "pool_tenant_context_reset" | "untrusted_guc_denial"
  | "idempotency_collision" | "commit_unknown_read_only_reconcile"
  | "legacy_queue_no_fallback" | "outbox_blocked";
export const REQUIRED_CASES:readonly ValidationCase[]=[
  "canonical_0001_0011_replay","migration_ledger_checksum","schema_drift",
  "additive_index_fk_lock_rollback","non_superuser_roles",
  "rls_read_cross_tenant","rls_write_cross_tenant","rls_bypass_denial",
  "security_definer_search_path","membership_revoke_wins",
  "issuer_revoke_wins","admission_commits_first",
  "stale_membership_revision","stale_issuer_revision",
  "session_revoked_expired","viewer_denied","pool_tenant_context_reset",
  "untrusted_guc_denial","idempotency_collision",
  "commit_unknown_read_only_reconcile","legacy_queue_no_fallback","outbox_blocked"
];
export type TestIdentity="schema_owner"|"migration_operator"|"api"|"admission"|"worker"|"auditor";
export type ProposedSandbox=Readonly<{
  freshEmptyDatabase:boolean;databaseVersion:17;localhostOnly:boolean;
  syntheticFixturesOnly:boolean;armedForFutureUse:boolean;
  existingDatabaseAccess:boolean;operationalMigrations:boolean;
  runtimeConnections:boolean;providerEffects:boolean;publicSiteWrites:boolean;
  applicationSuperuser:boolean;appBypassRls:boolean;
  positiveOwnerAuthorization:boolean;
}>;
export type AcceptancePlan=Readonly<{
  cases:readonly ValidationCase[];
  identities:readonly TestIdentity[];
  twoIndependentSessions:boolean;
  nonSuperuserRlsAssertions:boolean;
  deterministicRaceBarriers:boolean;
  readOnlyUnknownCommitReconciliation:boolean;
  expiryUsesDatabaseClock:boolean;
  teardownAndIsolationReviewed:boolean;
  noRuntimeWiring:boolean;
}>;
export type ScenarioOutcome="deny"|"commit"|"commit_unknown"|"read_only_reconcile";
export type RaceScenario=Readonly<{
  kind:"membership_revoke_wins"|"issuer_revoke_wins"|"admission_commits_first"|"commit_transport_lost";
  firstCommitted:"revoke"|"admission"|"unknown";
  revisionFresh:boolean;tenantMatches:boolean;readOnlyReconcile:boolean;
  automaticRetry:boolean;externalEffects:boolean;
}>;
const expectedIdentities:readonly TestIdentity[]=[
  "schema_owner","migration_operator","api","admission","worker","auditor"
];
const keys=(x:readonly string[]):boolean=>new Set(x).size===x.length;
/** Paper assessment only: an "eligible-plan" has NO permission to run. */
export function validateSandboxDesign(x:ProposedSandbox):"blocked"|"eligible-plan"{
  if(!x)return "blocked";
  return x.freshEmptyDatabase===true&&x.databaseVersion===17&&
    x.localhostOnly===true&&x.syntheticFixturesOnly===true&&
    x.armedForFutureUse===false&&x.existingDatabaseAccess===false&&
    x.operationalMigrations===false&&x.runtimeConnections===false&&
    x.providerEffects===false&&x.publicSiteWrites===false&&
    x.applicationSuperuser===false&&x.appBypassRls===false&&
    x.positiveOwnerAuthorization===false?"eligible-plan":"blocked";
}
/** This only assesses proposed test coverage, not test execution or outcomes. */
export function validateAcceptancePlan(x:AcceptancePlan):"blocked"|"complete-plan"{
  if(!x||!Array.isArray(x.cases)||!Array.isArray(x.identities)||
    !keys(x.cases)||!keys(x.identities))return "blocked";
  if(!REQUIRED_CASES.every(c=>x.cases.includes(c))||
    !expectedIdentities.every(i=>x.identities.includes(i)))return "blocked";
  return x.twoIndependentSessions===true&&x.nonSuperuserRlsAssertions===true&&
    x.deterministicRaceBarriers===true&&
    x.readOnlyUnknownCommitReconciliation===true&&
    x.expiryUsesDatabaseClock===true&&
    x.teardownAndIsolationReviewed===true&&x.noRuntimeWiring===true
    ?"complete-plan":"blocked";
}
/** Synthetic race oracle; not a model of PostgreSQL locking or isolation. */
export function expectedRaceOutcome(x:RaceScenario):ScenarioOutcome|"blocked"{
  if(!x||x.tenantMatches!==true||x.automaticRetry!==false||
    x.externalEffects!==false)return "blocked";
  if(x.kind==="commit_transport_lost")
    return x.firstCommitted==="unknown"&&x.readOnlyReconcile===true
      ?"commit_unknown":"blocked";
  if(x.kind==="membership_revoke_wins"||x.kind==="issuer_revoke_wins")
    return x.firstCommitted==="revoke"?"deny":"blocked";
  if(x.kind==="admission_commits_first")
    return x.firstCommitted==="admission"&&x.revisionFresh===true
      ?"commit":"blocked";
  return "blocked";
}

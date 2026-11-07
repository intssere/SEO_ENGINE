/**
 * RT01-A12.13 DISCONNECTED integration-readiness contract.
 * Does not authenticate, write SQL, enqueue, call providers, or wire runtime.
 * Truthy design evidence is mock-backed only and must not be accepted from callers.
 */
export type ReadOperation="analyze"|"recommend";
export type SecurityGate=
  "enforced_authentication"|"canonical_session"|"active_membership"|
  "independent_site_tenant"|"server_issuer_custody"|"revision_fence"|
  "scoped_admission"|"canonical_migration_authority"|"non_bypass_rls"|
  "no_legacy_queue"|"fenced_worker"|"provider_dispatch_disabled";
export const REQUIRED_GATES:readonly SecurityGate[]=[
  "enforced_authentication","canonical_session","active_membership",
  "independent_site_tenant","server_issuer_custody","revision_fence",
  "scoped_admission","canonical_migration_authority","non_bypass_rls",
  "no_legacy_queue","fenced_worker","provider_dispatch_disabled"
];
export type Evidence=Readonly<{
  source:"trusted_server_port"|"caller"|"unavailable";
  sessionId:string;subject:string;organizationId:string;siteId:string;
  issuerId:string;operation:ReadOperation;
  sessionExpiresAt:number;membershipExpiresAt:number;issuerExpiresAt:number;
  membershipRevision:number;issuerRevision:number;
  membershipRevoked:boolean;issuerRevoked:boolean;sessionRevoked:boolean;
  activeSite:boolean;tenantMatches:boolean;issuerScopeMatches:boolean;
}>;
export type RequestedIntent=Readonly<{
  sessionId:string;subject:string;organizationId:string;siteId:string;
  issuerId:string;operation:ReadOperation;membershipRevision:number;
  issuerRevision:number;
}>;
export type IntegrationPlan=Readonly<{
  gates:Readonly<Record<SecurityGate,boolean>>;
  enabledRuntimeIntegration:boolean;
  databaseConnections:boolean;
  migrationsApplied:boolean;
  publicSiteWrites:boolean;
  providerReads:boolean;
  backgroundWorkerActive:boolean;
}>;
export type Outcome="blocked"|"design_consistent";
const ident=(s:unknown):s is string=>typeof s==="string"&&
  s.length>0&&s.length<=256&&s===s.trim();
const positive=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
/** Paper-only matching; mock server ports are NOT real principal authentication. */
export function assessTrustedBoundary(
  input:RequestedIntent,e:Evidence|null,now:number):Outcome{
  if(!input||!e||e.source!=="trusted_server_port"||
    !Number.isFinite(now)||
    ![input.sessionId,input.subject,input.organizationId,input.siteId,input.issuerId,
      e.sessionId,e.subject,e.organizationId,e.siteId,e.issuerId].every(ident)||
    !(input.operation==="analyze"||input.operation==="recommend")||
    !positive(input.membershipRevision)||!positive(input.issuerRevision)||
    !positive(e.membershipRevision)||!positive(e.issuerRevision)||
    e.sessionRevoked||e.membershipRevoked||e.issuerRevoked||
    !e.activeSite||!e.tenantMatches||!e.issuerScopeMatches||
    !Number.isFinite(e.sessionExpiresAt)||e.sessionExpiresAt<=now||
    !Number.isFinite(e.membershipExpiresAt)||e.membershipExpiresAt<=now||
    !Number.isFinite(e.issuerExpiresAt)||e.issuerExpiresAt<=now)
    return "blocked";
  return input.sessionId===e.sessionId&&input.subject===e.subject&&
    input.organizationId===e.organizationId&&input.siteId===e.siteId&&
    input.issuerId===e.issuerId&&input.operation===e.operation&&
    input.membershipRevision===e.membershipRevision&&
    input.issuerRevision===e.issuerRevision?"design_consistent":"blocked";
}
/** Design consistency can never authorize an actual route/worker/effect. */
export function assessTransitionPlan(plan:IntegrationPlan):Outcome{
  if(!plan||!plan.gates)return "blocked";
  if(Object.keys(plan.gates).length!==REQUIRED_GATES.length||
    !REQUIRED_GATES.every(key=>plan.gates[key]===true))return "blocked";
  return plan.enabledRuntimeIntegration===false&&plan.databaseConnections===false&&
    plan.migrationsApplied===false&&plan.publicSiteWrites===false&&
    plan.providerReads===false&&plan.backgroundWorkerActive===false
    ?"design_consistent":"blocked";
}
export type MigrationLineage=Readonly<{
  sourceLineage:"main_0001_0011";
  competingHistoricalLineageReviewed:boolean;
  independentInstalledLedgerAvailable:boolean;
  sourceChecksumsPinned:boolean;
  existingSchemaDriftKnown:boolean;
  targetOwnerAttested:boolean;
  resourceSpecificAuthorization:boolean;
  operationalMigrationPermitted:boolean;
}>;
/** No live resource is accessed; 'needs-attestation' is the only possible safe readiness. */
export function assessMigrationTransition(x:MigrationLineage):"blocked"|"needs-attestation"{
  if(!x||x.sourceLineage!=="main_0001_0011"||
    !x.competingHistoricalLineageReviewed||!x.sourceChecksumsPinned||
    x.operationalMigrationPermitted||x.resourceSpecificAuthorization)return "blocked";
  return (!x.independentInstalledLedgerAvailable||!x.existingSchemaDriftKnown||
    !x.targetOwnerAttested)?"needs-attestation":"blocked";
}

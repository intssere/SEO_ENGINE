/**
 * RT01-A12.10: source-only canonical security integration BLUEPRINT.
 * This module does not authenticate anyone, implement SQL or connect to any DB.
 * Synthetic assertions are necessary design checks, never runtime authority.
 */
import type {ReadOperation} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";
export type TenantRole="viewer"|"operator"|"admin";
export type MembershipRecord=Readonly<{
  organizationId:string;subject:string;role:TenantRole;active:boolean;
  revokedAt:number|null;expiresAt:number;revision:number;
}>;
export type IssuerRecord=Readonly<{
  issuerId:string;organizationId:string;siteId:string;actorSubject:string;
  operation:ReadOperation;active:boolean;revokedAt:number|null;expiresAt:number;
  revision:number;provenanceSha256:string;serverCustodyConfirmed:boolean;
}>;
export type SessionRecord=Readonly<{
  id:string;subject:string;active:boolean;revokedAt:number|null;expiresAt:number;
}>;
export type SiteRecord=Readonly<{id:string;organizationId:string;active:boolean}>;
export type RequestedScope=Readonly<{
  sessionId:string;organizationId:string;siteId:string;subject:string;issuerId:string;
  operation:ReadOperation;membershipRevision:number;issuerRevision:number;
}>;
export type EvidenceSet=Readonly<{
  session:SessionRecord|null;site:SiteRecord|null;
  membership:MembershipRecord|null;issuer:IssuerRecord|null;
  databaseNow:number;transactionalRecheck:boolean;revocationSerialized:boolean;
}>;
export type DesignDecision="design-consistent"|"blocked";
const id=(x:unknown):x is string=>typeof x==="string"&&x.length>0&&x.length<=256&&x.trim()===x;
const revision=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>0;
const digest=(x:unknown):x is string=>typeof x==="string"&&/^[0-9a-f]{64}$/.test(x);
/** Only checks synthetic evidence after a pretend transaction. Never use for admission. */
export function assessCustodyDesign(scope:RequestedScope,e:EvidenceSet):DesignDecision{
  if(!scope||!e||!Number.isFinite(e.databaseNow)||
    !e.transactionalRecheck||!e.revocationSerialized||
    ![scope.sessionId,scope.organizationId,scope.siteId,scope.subject,scope.issuerId].every(id)||
    !(scope.operation==="analyze"||scope.operation==="recommend")||
    !revision(scope.membershipRevision)||!revision(scope.issuerRevision))return "blocked";
  const {session:s,site:t,membership:m,issuer:i}=e,n=e.databaseNow;
  if(!s||!t||!m||!i)return "blocked";
  if(s.id!==scope.sessionId||s.subject!==scope.subject||s.active!==true||
    s.revokedAt!==null||!Number.isFinite(s.expiresAt)||s.expiresAt<=n)return "blocked";
  if(t.id!==scope.siteId||t.organizationId!==scope.organizationId||t.active!==true)return "blocked";
  if(m.organizationId!==t.organizationId||m.subject!==s.subject||
    !["operator","admin"].includes(m.role)||m.active!==true||
    m.revokedAt!==null||!Number.isFinite(m.expiresAt)||m.expiresAt<=n||
    !revision(m.revision)||m.revision!==scope.membershipRevision)return "blocked";
  if(i.issuerId!==scope.issuerId||i.organizationId!==t.organizationId||
    i.siteId!==t.id||i.actorSubject!==s.subject||i.operation!==scope.operation||
    i.active!==true||i.revokedAt!==null||!Number.isFinite(i.expiresAt)||
    i.expiresAt<=n||!revision(i.revision)||i.revision!==scope.issuerRevision||
    !digest(i.provenanceSha256)||i.serverCustodyConfirmed!==true)return "blocked";
  return "design-consistent";
}
export type RlsReadiness=Readonly<{
  allPilotTablesEnableAndForceRls:boolean;policiesPerRoleReviewed:boolean;
  usingAndWithCheckReviewed:boolean;noBypassRlsOrSuperuser:boolean;
  noUnsafeSecurityDefiner:boolean;noPublicGrants:boolean;
  trustedTransactionTenantContext:boolean;poolContextReset:boolean;
  nonOwnerLeastPrivilegeTestPlanned:boolean;
}>;
export function assessRlsBlueprint(x:RlsReadiness):DesignDecision{
  return x&&Object.values(x).length===9&&Object.values(x).every(v=>v===true)
    ?"design-consistent":"blocked";
}
export type MigrationPlan=Readonly<{
  existingLedgerInspected:boolean;checksumsCompared:boolean;schemaDriftAssessed:boolean;
  uniqueSiteIndexImpactReviewed:boolean;compositeForeignKeysPlanned:boolean;
  membershipAndIssuerCustodyPlanned:boolean;rolePoliciesSeparatelyReviewed:boolean;
  rollbackAndLockRiskReviewed:boolean;noOperationalMigrationCreated:boolean;
}>;
export function assessMigrationBlueprint(x:MigrationPlan):DesignDecision{
  return x&&Object.values(x).length===9&&Object.values(x).every(v=>v===true)
    ?"design-consistent":"blocked";
}
export type FutureAcceptanceCase=
  |"cross_tenant"|"cross_site"|"revoked_session"|"revoked_membership"
  |"revoked_issuer"|"stale_membership_revision"|"stale_issuer_revision"
  |"viewer_role"|"forged_provenance"|"rls_non_owner"|"rls_context_leak"
  |"revocation_race"|"idempotency_collision"|"commit_unknown"
  |"migration_drift"|"legacy_queue_bypass"|"blocked_outbox";
export const REQUIRED_FUTURE_ACCEPTANCE:readonly FutureAcceptanceCase[]=[
  "cross_tenant","cross_site","revoked_session","revoked_membership",
  "revoked_issuer","stale_membership_revision","stale_issuer_revision",
  "viewer_role","forged_provenance","rls_non_owner","rls_context_leak",
  "revocation_race","idempotency_collision","commit_unknown",
  "migration_drift","legacy_queue_bypass","blocked_outbox"
];
/** Presence of a planned test is not execution evidence. */
export function assessAcceptancePlan(cases:readonly FutureAcceptanceCase[]):DesignDecision{
  return Array.isArray(cases)&&REQUIRED_FUTURE_ACCEPTANCE.every(x=>cases.includes(x))
    ?"design-consistent":"blocked";
}

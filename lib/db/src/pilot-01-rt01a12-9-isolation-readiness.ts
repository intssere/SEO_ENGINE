/**
 * RT01-A12.9 — pure offline readiness model, NOT SQL, RLS enforcement,
 * authentication, a database adapter, or a runtime authorization entrypoint.
 * Synthetic roles/evidence are deliberately NOT accepted as production proof.
 */
export type DbRole = "owner"|"migration"|"api"|"admission"|"worker"|"auditor";
export type Relation = "grants"|"jobs"|"admissions"|"job_events"|"outbox";
export type SqlAction = "select"|"insert"|"update"|"delete"|"execute";
export type RoleSpec = Readonly<{
  role:DbRole;login:boolean;bypassRls:boolean;superuser:boolean;
  ownsPilotSchema:boolean;securityDefiner:boolean;
  allowed:ReadonlyArray<Readonly<{relation:Relation;action:SqlAction}>>;
}>;
export type RlsModel=Readonly<{
  enabled:Readonly<Record<Relation,boolean>>;
  forced:Readonly<Record<Relation,boolean>>;
  policiesComplete:boolean;trustedTenantContext:boolean;trustedActorContext:boolean;
  tenantBoundToSession:boolean;contextResetBetweenRequests:boolean;
}>;
export type RoleVerdict="blocked"|"candidate-review";
const tables:Relation[]=["grants","jobs","admissions","job_events","outbox"];
const validAction=(x:SqlAction)=>["select","insert","update","delete","execute"].includes(x);
export function assessRole(role:RoleSpec,rls:RlsModel):RoleVerdict{
  if(!role||!rls||!tables.every(t=>rls.enabled[t]===true&&rls.forced[t]===true))
    return "blocked";
  if(role.superuser||role.bypassRls||role.securityDefiner)return "blocked";
  if(role.ownsPilotSchema&&role.login)return "blocked";
  if(!rls.policiesComplete||!rls.trustedTenantContext||
     !rls.trustedActorContext||!rls.tenantBoundToSession||
     !rls.contextResetBetweenRequests)return "blocked";
  if(!Array.isArray(role.allowed)||role.allowed.some(g=>
    !g||!tables.includes(g.relation)||!validAction(g.action)||
    (role.role==="auditor"&&g.action!=="select")||
    (role.role==="api"&&g.action!=="select")||
    (role.role==="worker"&&(g.relation==="grants"||g.relation==="admissions"))||
    g.action==="execute"))return "blocked";
  // A candidate is only a design candidate; never a deployable grant/policy.
  return "candidate-review";
}
export type LockKey="session"|"site"|"membership"|"issuer"|"grant"|"idempotency";
export const LOCK_ORDER:readonly LockKey[]=
  ["session","site","membership","issuer","grant","idempotency"];
export type SyntheticTransaction=Readonly<{
  scope:Readonly<{organizationId:string;siteId:string;subject:string;issuerId:string}>;
  fence:Readonly<{membershipRevision:number;issuerRevision:number}>;
  observed:Readonly<{
    organizationId:string;siteId:string;subject:string;issuerId:string;
    sessionActive:boolean;siteActive:boolean;membershipActive:boolean;issuerActive:boolean;
    membershipRevision:number;issuerRevision:number;
  }>;
  locks:readonly LockKey[];
  databaseTimeTrusted:boolean;authorizationRecheckedAtCommit:boolean;
  revocationSerialized:boolean;transactionAtomic:boolean;
}>;
/** A synthetic *required conditions* gate; it cannot prove DB isolation. */
export function assessTransaction(x:SyntheticTransaction):"blocked"|"design-consistent"{
  if(!x||!x.scope||!x.observed||!x.fence||!Array.isArray(x.locks))return "blocked";
  if(x.locks.length!==LOCK_ORDER.length||
    x.locks.some((v,i)=>v!==LOCK_ORDER[i]))return "blocked";
  if(!x.databaseTimeTrusted||!x.authorizationRecheckedAtCommit||
    !x.revocationSerialized||!x.transactionAtomic)return "blocked";
  const s=x.scope,e=x.observed,f=x.fence;
  if(!s.organizationId||!s.siteId||!s.subject||!s.issuerId||
    s.organizationId!==e.organizationId||s.siteId!==e.siteId||
    s.subject!==e.subject||s.issuerId!==e.issuerId||
    !e.sessionActive||!e.siteActive||!e.membershipActive||!e.issuerActive||
    !Number.isSafeInteger(f.membershipRevision)||f.membershipRevision<=0||
    !Number.isSafeInteger(f.issuerRevision)||f.issuerRevision<=0||
    e.membershipRevision!==f.membershipRevision||
    e.issuerRevision!==f.issuerRevision)return "blocked";
  return "design-consistent";
}
export function migrationReadiness(m:Readonly<{
  ledgerVerified:boolean;checksumsVerified:boolean;driftReviewed:boolean;
  privilegesReviewed:boolean;indexesReviewed:boolean;rollbackReviewed:boolean;
  canonicalReplayVerified:boolean;
}>):"blocked"|"design-review"{
  return m&&Object.values(m).every(v=>v===true)?"design-review":"blocked";
}

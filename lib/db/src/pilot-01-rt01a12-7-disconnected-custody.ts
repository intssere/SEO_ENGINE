/**
 * PILOT-01 RT01-A12.7 — disconnected membership/issuer custody design.
 * Type-level authorization markers are NOT cryptographic proof.
 * Injected ports MUST eventually be server-owned, consistent, authoritative.
 * This module has no runtime entrypoint, SQL, environment, network or providers.
 */
import type {ReadOperation,ServerVerifiedPrincipal}
  from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

export type Role="viewer"|"operator"|"admin";
export type SessionEvidence=Readonly<{
  sessionId:string; subject:string; role:Role; active:boolean;
  revokedAt:string|null; expiresAt:string;
}>;
export type SiteEvidence=Readonly<{
  organizationId:string; siteId:string; active:boolean;
}>;
export type MembershipEvidence=Readonly<{
  organizationId:string; subject:string; role:Role; active:boolean;
  revokedAt:string|null; expiresAt:string; revision:number;
}>;
export type IssuerEvidence=Readonly<{
  issuerId:string; organizationId:string; siteId:string; actorSubject:string;
  operation:ReadOperation; active:boolean; revokedAt:string|null; expiresAt:string;
  provenanceSha256:string; revision:number;
}>;
export interface TrustedCustodyPorts {
  /** Server-side enforced session, never request JSON or caller-provided principal. */
  session:{current():Promise<SessionEvidence|null>};
  site:{get(siteId:string):Promise<SiteEvidence|null>};
  membership:{get(subject:string,organizationId:string):Promise<MembershipEvidence|null>};
  issuer:{get(issuerId:string):Promise<IssuerEvidence|null>};
  /** Deterministic injected clock for mocks; deployment must use trusted DB time. */
  now():number;
}
export type CustodyIntent=Readonly<{
  siteId:string;issuerId:string;operation:ReadOperation;
}>;
export type CustodyResult=
  |Readonly<{status:"verified";principal:ServerVerifiedPrincipal;
    membershipRevision:number;issuerRevision:number}>
  |Readonly<{status:"denied"|"unavailable"}>;
const clean=(v:unknown):v is string=>
  typeof v==="string"&&v.length>0&&v.length<=256&&v.trim()===v;
const sha=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{64}$/.test(v);
const validRevision=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
function validUntil(expiresAt:string,revokedAt:string|null,active:boolean,now:number):boolean{
  const expiry=typeof expiresAt==="string"?Date.parse(expiresAt):NaN;
  return active===true&&revokedAt===null&&Number.isFinite(expiry)&&expiry>now;
}
/**
 * The intent supplies only lookup keys; the session and all ownership facts
 * are resolved independently. Never allow organization/subject/role/issuer
 * provenance to be asserted by a request payload.
 *
 * The returned principal is useful only within disconnected tests. An actual
 * auth adapter must re-evaluate authority within the admission transaction to
 * eliminate time-of-check/time-of-use revocation races.
 */
export async function resolveDisconnectedCustody(
  intent:CustodyIntent,ports:TrustedCustodyPorts,
):Promise<CustodyResult>{
  if(!intent||!clean(intent.siteId)||!clean(intent.issuerId)||
    (intent.operation!=="analyze"&&intent.operation!=="recommend"))
    return {status:"denied"};
  try{
    const now=ports.now();
    if(!Number.isFinite(now))return {status:"unavailable"};
    const session=await ports.session.current();
    if(!session||!clean(session.sessionId)||!clean(session.subject)||
      !["operator","admin"].includes(session.role)||
      !validUntil(session.expiresAt,session.revokedAt,session.active,now))
      return {status:"denied"};
    const site=await ports.site.get(intent.siteId);
    if(!site||site.active!==true||site.siteId!==intent.siteId||
      !clean(site.organizationId))return {status:"denied"};
    const membership=await ports.membership.get(session.subject,site.organizationId);
    if(!membership||membership.subject!==session.subject||
      membership.organizationId!==site.organizationId||
      !["operator","admin"].includes(membership.role)||
      !validUntil(membership.expiresAt,membership.revokedAt,membership.active,now)||
      !validRevision(membership.revision))return {status:"denied"};
    const issuer=await ports.issuer.get(intent.issuerId);
    if(!issuer||issuer.issuerId!==intent.issuerId||
      issuer.organizationId!==site.organizationId||
      issuer.siteId!==site.siteId||
      issuer.actorSubject!==session.subject||
      issuer.operation!==intent.operation||
      !sha(issuer.provenanceSha256)||
      !validUntil(issuer.expiresAt,issuer.revokedAt,issuer.active,now)||
      !validRevision(issuer.revision))return {status:"denied"};
    // Global admin cannot promote an organization operator to admin.
    const principal:ServerVerifiedPrincipal=Object.freeze({
      source:"server_verified_principal",authenticated:true,
      sessionActive:true,membershipVerified:true,issuerVerified:true,
      organizationId:site.organizationId,siteId:site.siteId,
      actorSubject:session.subject,sessionId:session.sessionId,
      issuerId:issuer.issuerId,
      issuerProvenanceSha256:issuer.provenanceSha256,
      operation:issuer.operation,
    });
    return Object.freeze({status:"verified",principal,
      membershipRevision:membership.revision,issuerRevision:issuer.revision});
  }catch{return {status:"unavailable"};}
}

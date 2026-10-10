import type { AuthPrincipal } from "./auth-foundation.js";
import type { CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";
import {
 reconcileCviGscScopedReadback,
 type CviScopedReadbackStore,
 type CviGscScopedReadbackResult,
} from "./cvi-gsc-scoped-ledger-readback.js";

export const CVI_GSC_SERVER_PRINCIPAL_READBACK_VERSION =
 "cvi-1c19-server-principal-readback-v1" as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type ServerSiteConnection=Readonly<{
 tenantId:string;siteId:string;connectionId:string;
}>;
/**
 * A dependency port that must be implemented ONLY inside trusted server
 * request authentication. It may not use route/body/header identity claims.
 * Returning AuthPrincipal merely means the caller has promised to authenticate;
 * this offline adapter CANNOT prove implementation trustworthiness.
 */
export interface CviServerAuthenticatedReadbackDependencies {
 getAuthenticatedPrincipal():Promise<AuthPrincipal|null>;
 getServerBoundSiteConnection():Promise<ServerSiteConnection|null>;
 store:CviScopedReadbackStore;
 now():string;
}
export type CviPrincipalReadbackOutcome=Readonly<{
 status:"DENY"|"UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY";
 reasons:readonly string[];
 historicalRecordMatched:boolean;
 principalAuthenticatedIndependently:false;
 providerOriginAuthenticated:false;
 executionAuthorized:false;
 publicationAuthorized:false;
}>;

function deny(reason:string):CviPrincipalReadbackOutcome {
 return {
  status:"DENY",reasons:[reason],historicalRecordMatched:false,
  principalAuthenticatedIndependently:false,providerOriginAuthenticated:false,
  executionAuthorized:false,publicationAuthorized:false,
 };
}
function instant(value:string):number|null {
 if(typeof value!=="string"||!ISO.test(value))return null;
 const date=Date.parse(value);
 return Number.isFinite(date)&&new Date(date).toISOString()===value?date:null;
}
/** Exposes only acquisition identifier and immutable review packet;
 * tenant/site/connection/session/subject CANNOT be supplied in this call.
 * No persistent claims of authorization are created by readback.
 */
export function createCviServerPrincipalReadback(deps:CviServerAuthenticatedReadbackDependencies) {
 return async function read(input:Readonly<{
  acquisitionId:string;
  lineage:CviGscAcquisitionLineage;
 }>):Promise<CviPrincipalReadbackOutcome> {
  if(!input||typeof input.acquisitionId!=="string"||!ID.test(input.acquisitionId))
   return deny("acquisition_id_invalid");
  let principal:AuthPrincipal|null;
  let bound:ServerSiteConnection|null;
  let time:string;
  try {
   principal=await deps.getAuthenticatedPrincipal();
   if(!principal)return deny("principal_missing");
   bound=await deps.getServerBoundSiteConnection();
   time=deps.now();
  } catch {return deny("trusted_context_unavailable");}
  const evaluated=instant(time);
  if(!principal||!bound||evaluated===null||
     !UUID.test(principal.sessionId)||
     typeof principal.subject!=="string"||!ID.test(principal.subject)||
     !UUID.test(bound.tenantId)||!UUID.test(bound.siteId)||
     !UUID.test(bound.connectionId)||
     instant(principal.expiresAt)===null||
     (instant(principal.expiresAt)??0)<=evaluated)
   return deny("principal_or_site_binding_invalid");
  let result:CviGscScopedReadbackResult;
  try {
   result=await reconcileCviGscScopedReadback({
    lineage:input.lineage,
    authenticated:{
     acquisitionId:input.acquisitionId,
     tenantId:bound.tenantId,siteId:bound.siteId,
     connectionId:bound.connectionId,
     authSubject:principal.subject,
     authSessionId:principal.sessionId,
    },
    store:deps.store,
   });
  } catch {return deny("scoped_readback_failed");}
  return {
   status:result.status==="SCOPED_HISTORICAL_REVIEW_ONLY"
    ?"UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY":"DENY",
   reasons:result.reasons,
   historicalRecordMatched:result.scopedHistoricalRowMatched,
   principalAuthenticatedIndependently:false,
   providerOriginAuthenticated:false,
   executionAuthorized:false,publicationAuthorized:false,
  };
 };
}

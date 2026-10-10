import type { Request } from "express";
import type postgres from "postgres";
import type { AuthConfig } from "./auth-foundation.js";
import type { CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";
import { reviewCviExpressAuthenticatedPrincipal } from "./cvi-gsc-express-auth-gate.js";
import { createCviGscServerScopeResolver } from "./cvi-gsc-server-scope-resolver.js";
import { createCviScopedPostgresReadbackStore } from "./cvi-gsc-scoped-readback-postgres-adapter.js";
import { reconcileCviGscScopedReadback } from "./cvi-gsc-scoped-ledger-readback.js";

export const CVI_GSC_PRIVATE_COMPOSITION_VERSION =
 "cvi-1c23-private-express-db-composition-v1" as const;
export type CviPrivateReadbackOutcome=Readonly<{
 version:typeof CVI_GSC_PRIVATE_COMPOSITION_VERSION;
 status:"DENY"|"UNTRUSTED_HISTORICAL_REVIEW_ONLY";
 reasons:readonly string[];
 providerOriginVerified:false;
 tenantAuthorizationForFutureOperations:false;
 publicationAuthorized:false;
 executionAuthorized:false;
}>;

function response(status:CviPrivateReadbackOutcome["status"],reason:string):CviPrivateReadbackOutcome {
 return {version:CVI_GSC_PRIVATE_COMPOSITION_VERSION,status,
  reasons:reason?[reason]:[],providerOriginVerified:false,
  tenantAuthorizationForFutureOperations:false,
  publicationAuthorized:false,executionAuthorized:false};
}
/** Server-private read-only composition. req.auth MUST be populated by
 * protected attachAuthSession after valid cookie+database verification.
 * This does not mount a route, connect to a database, or open provider HTTP.
 * The supplied Sql must be a trusted server-owned connection.
 * Never accept subject, tenant, site, connection, session, or Sql from HTTP.
 */
export function createCviPrivateExpressDbComposition(dependencies:Readonly<{
 sql:postgres.Sql;
 authConfig:Pick<AuthConfig,"enabled"|"configured">;
 now:()=>string;
}>) {
 const resolve=createCviGscServerScopeResolver(dependencies.sql);
 const store=createCviScopedPostgresReadbackStore(dependencies.sql);
 return async (input:Readonly<{
  req:Pick<Request,"auth">;
  acquisitionId:string;
  lineage:CviGscAcquisitionLineage;
 }>):Promise<CviPrivateReadbackOutcome>=>{
  let now:string;
  try{now=dependencies.now();}
  catch{return response("DENY","server_clock_unavailable");}
  const gate=reviewCviExpressAuthenticatedPrincipal({
   req:input.req,config:dependencies.authConfig,evaluatedAt:now,
  });
  if(gate.status!=="AUTH_CONTEXT_PRESENT_REVIEW_ONLY")
   return response("DENY",gate.reason);
  if(typeof input.acquisitionId!=="string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(input.acquisitionId))
   return response("DENY","acquisition_id_invalid");
  try {
   const scope=await resolve({
    acquisitionId:input.acquisitionId,principal:gate.principal,now,
   });
   if(!scope)return response("DENY","server_scope_not_eligible");
   const result=await reconcileCviGscScopedReadback({
    lineage:input.lineage,
    authenticated:{
     acquisitionId:input.acquisitionId,
     tenantId:scope.tenantId,siteId:scope.siteId,
     connectionId:scope.connectionId,
     authSubject:gate.principal.subject,
     authSessionId:gate.principal.sessionId,
    },
    store,
   });
   return result.status==="SCOPED_HISTORICAL_REVIEW_ONLY"
    ?response("UNTRUSTED_HISTORICAL_REVIEW_ONLY","")
    :response("DENY","scoped_readback_not_eligible");
  }catch{
   return response("DENY","private_readback_failed");
  }
 };
}

import {
  assertAuthorityOpportunityDiscoveryIntegrity,
  type AuthorityOpportunityDiscovery,
} from "./authority-opportunity-discovery.js";

export const UGP_AUTHORITY_OPPORTUNITY_API_VERSION =
  "ugp-9-3b-authority-opportunity-api-v1" as const;

export type AuthorityOpportunityApiResponse = Readonly<{
  version: typeof UGP_AUTHORITY_OPPORTUNITY_API_VERSION;
  state: "available" | "unavailable";
  reason: string | null;
  discovery: AuthorityOpportunityDiscovery | null;
  semantics: Readonly<{
    authenticatedReadOnly: true;
    syntheticFallback: false;
    persistenceRequired: false;
    liveProviderExecutionAuthorized: false;
    scoringAuthorized: false;
    prospectQualificationAuthorized: false;
    outreachAuthorized: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityOpportunityProjectionSource =
  ()=>Promise<AuthorityOpportunityDiscovery|null>;

const SEMANTICS=Object.freeze({
  authenticatedReadOnly:true as const,
  syntheticFallback:false as const,
  persistenceRequired:false as const,
  liveProviderExecutionAuthorized:false as const,
  scoringAuthorized:false as const,
  prospectQualificationAuthorized:false as const,
  outreachAuthorized:false as const,
  publicSiteWrites:false as const,
});

let source:AuthorityOpportunityProjectionSource|null=null;

export function setAuthorityOpportunityProjectionSourceForRuntime(
  next:AuthorityOpportunityProjectionSource|null,
):void{
  source=next;
}

export async function loadAuthorityOpportunityData():Promise<AuthorityOpportunityApiResponse>{
  if(!source){
    return Object.freeze({
      version:UGP_AUTHORITY_OPPORTUNITY_API_VERSION,
      state:"unavailable",
      reason:"No durable authority opportunity discovery source is configured.",
      discovery:null,
      semantics:SEMANTICS,
    });
  }
  try{
    const discovery=await source();
    if(!discovery){
      return Object.freeze({
        version:UGP_AUTHORITY_OPPORTUNITY_API_VERSION,
        state:"unavailable",
        reason:"Authority opportunity evidence is not available.",
        discovery:null,
        semantics:SEMANTICS,
      });
    }
    assertAuthorityOpportunityDiscoveryIntegrity(discovery);
    return Object.freeze({
      version:UGP_AUTHORITY_OPPORTUNITY_API_VERSION,
      state:"available",
      reason:null,
      discovery,
      semantics:SEMANTICS,
    });
  }catch{
    return Object.freeze({
      version:UGP_AUTHORITY_OPPORTUNITY_API_VERSION,
      state:"unavailable",
      reason:"Authority opportunity evidence could not be validated.",
      discovery:null,
      semantics:SEMANTICS,
    });
  }
}

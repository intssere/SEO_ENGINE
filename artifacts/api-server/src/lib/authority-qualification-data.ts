import type { BacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import type {
  AuthorityOpportunityDiscovery,
} from "./authority-opportunity-discovery.js";
import {
  assertAuthorityProspectQualificationIntegrity,
  qualifyAuthorityProspects,
  type AuthorityProspectQualificationResult,
  type AuthorityProspectQualificationSignal,
} from "./authority-prospect-qualification.js";

export const UGP_AUTHORITY_QUALIFICATION_API_VERSION =
  "ugp-9-4b-prospect-qualification-api-v1" as const;

export type AuthorityQualificationSourceSnapshot = Readonly<{
  discovery: AuthorityOpportunityDiscovery;
  current: BacklinkEvidenceDataset;
  signals?: readonly AuthorityProspectQualificationSignal[];
}>;

export type AuthorityQualificationApiResponse = Readonly<{
  version: typeof UGP_AUTHORITY_QUALIFICATION_API_VERSION;
  state: "available" | "unavailable";
  reason: string | null;
  qualification: AuthorityProspectQualificationResult | null;
  semantics: Readonly<{
    authenticatedReadOnly: true;
    syntheticFallback: false;
    persistenceRequired: false;
    liveProviderExecutionAuthorized: false;
    contactDiscoveryAuthorized: false;
    outreachAuthorized: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityQualificationSource =
  ()=>Promise<AuthorityQualificationSourceSnapshot|null>;

const SEMANTICS=Object.freeze({
  authenticatedReadOnly:true as const,
  syntheticFallback:false as const,
  persistenceRequired:false as const,
  liveProviderExecutionAuthorized:false as const,
  contactDiscoveryAuthorized:false as const,
  outreachAuthorized:false as const,
  publicSiteWrites:false as const,
});

let source:AuthorityQualificationSource|null=null;

export function setAuthorityQualificationSourceForRuntime(
  next:AuthorityQualificationSource|null,
):void{
  source=next;
}

function unavailable(reason:string):AuthorityQualificationApiResponse{
  return Object.freeze({
    version:UGP_AUTHORITY_QUALIFICATION_API_VERSION,
    state:"unavailable",
    reason,
    qualification:null,
    semantics:SEMANTICS,
  });
}

export async function loadAuthorityQualificationData(
  selected:AuthorityQualificationSource|null=source,
):Promise<AuthorityQualificationApiResponse>{
  if(!selected){
    return unavailable(
      "No durable authority qualification evidence source is configured.",
    );
  }
  try{
    const snapshot=await selected();
    if(!snapshot){
      return unavailable("Authority qualification evidence is not available.");
    }
    const qualification=qualifyAuthorityProspects(snapshot);
    assertAuthorityProspectQualificationIntegrity(qualification,snapshot);
    return Object.freeze({
      version:UGP_AUTHORITY_QUALIFICATION_API_VERSION,
      state:"available",
      reason:null,
      qualification,
      semantics:SEMANTICS,
    });
  }catch{
    return unavailable(
      "Authority qualification evidence could not be validated.",
    );
  }
}

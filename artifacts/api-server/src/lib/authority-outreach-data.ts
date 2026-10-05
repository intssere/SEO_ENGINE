import {
  loadAuthorityQualificationData,
  type AuthorityQualificationApiResponse,
} from "./authority-qualification-data.js";
import {
  assertAuthorityOutreachWorkspaceIntegrity,
  buildAuthorityOutreachWorkspace,
  type AuthorityOutreachReviewInput,
  type AuthorityOutreachWorkspace,
} from "./authority-outreach-workspace.js";
import { loadDurableAuthorityOutreachReviews } from "./authority-outreach-review-store.js";
import type { AuthorityProspectQualificationResult } from "./authority-prospect-qualification.js";

export const UGP_AUTHORITY_OUTREACH_API_VERSION =
  "ugp-10-3-outreach-workspace-api-v1" as const;

export type AuthorityOutreachApiResponse = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_API_VERSION;
  state: "available" | "unavailable";
  reason: string | null;
  workspace: AuthorityOutreachWorkspace | null;
  semantics: Readonly<{
    authenticatedReadOnly: true;
    syntheticFallback: false;
    humanReviewRequired: true;
    reviewMutationAuthorized: boolean;
    reviewPersistenceConfigured: boolean;
    contactDiscoveryAuthorized: false;
    outreachDraftingAuthorized: false;
    outreachSendingAuthorized: false;
    liveProviderExecutionAuthorized: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityOutreachReviewSource =
  (qualification:AuthorityProspectQualificationResult)=>
    Promise<readonly AuthorityOutreachReviewInput[]|null>;

export type AuthorityQualificationLoader =
  ()=>Promise<AuthorityQualificationApiResponse>;

let reviewSource:AuthorityOutreachReviewSource|null=
  loadDurableAuthorityOutreachReviews;

export function setAuthorityOutreachReviewSourceForRuntime(
  next:AuthorityOutreachReviewSource|null,
):void{
  reviewSource=next;
}

function semantics(configured:boolean){
  return Object.freeze({
    authenticatedReadOnly:true as const,
    syntheticFallback:false as const,
    humanReviewRequired:true as const,
    reviewMutationAuthorized:configured,
    reviewPersistenceConfigured:configured,
    contactDiscoveryAuthorized:false as const,
    outreachDraftingAuthorized:false as const,
    outreachSendingAuthorized:false as const,
    liveProviderExecutionAuthorized:false as const,
    publicSiteWrites:false as const,
  });
}

function unavailable(
  reason:string,
  configured:boolean,
):AuthorityOutreachApiResponse{
  return Object.freeze({
    version:UGP_AUTHORITY_OUTREACH_API_VERSION,
    state:"unavailable",
    reason,
    workspace:null,
    semantics:semantics(configured),
  });
}

export async function loadAuthorityOutreachData(
  qualificationLoader:AuthorityQualificationLoader=loadAuthorityQualificationData,
  selectedReviews:AuthorityOutreachReviewSource|null=reviewSource,
):Promise<AuthorityOutreachApiResponse>{
  const configured=selectedReviews!==null;
  try{
    const qualification=await qualificationLoader();
    if(qualification.state!=="available"||!qualification.qualification){
      return unavailable(
        qualification.reason??"Authority qualification is not available for outreach review.",
        configured,
      );
    }
    const reviews=selectedReviews
      ?await selectedReviews(qualification.qualification)
      :null;
    const input={
      qualification:qualification.qualification,
      reviews:reviews??[],
    };
    const workspace=buildAuthorityOutreachWorkspace(input);
    assertAuthorityOutreachWorkspaceIntegrity(workspace,input);
    return Object.freeze({
      version:UGP_AUTHORITY_OUTREACH_API_VERSION,
      state:"available" as const,
      reason:null,
      workspace,
      semantics:semantics(configured),
    });
  }catch{
    return unavailable(
      "Authority outreach review evidence could not be validated.",
      configured,
    );
  }
}

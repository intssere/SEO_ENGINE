import {
 GSC_READONLY_PROFILE,GSC_READONLY_EXTERNAL_ACCOUNT_ID,
 GSC_READONLY_SCOPE,hasExactGscReadonlyScope,
} from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
 CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,
 type CviGscRawCustodyResult,
} from "./cvi-gsc-raw-response-custody.js";

export const CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION =
 "cvi-1c12-gsc-credential-profile-fence-v1" as const;

export type CviGscCredentialProfileReview = Readonly<{
 version:typeof CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION;
 status:"DENY"|"PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION";
 reasons:readonly string[];
 oauthProfileMatched:boolean;
 rawResponseBound:boolean;
 delegatedCredentialIndependentlyVerified:false;
 tlsOriginIndependentlyVerified:false;
 tenantPermissionIndependentlyVerified:false;
 executionAuthorized:false;
 publicationAuthorized:false;
}>;

/** Checks *declared* sanitized GSC OAuth/profile metadata against the
 * exact Task 72 profile and a raw response preflight.
 * This is NOT token decoding, OAuth verification or live provider access.
 */
export function reviewCviGscCredentialProfile(input:Readonly<{
 provider:string;
 profile:string;
 externalAccountId:string;
 grantedScopes:readonly string[];
 credentialSource:string;
 selectedProperty:string;
 requestedProperty:string;
 connectionSiteId:string;
 expectedSiteId:string;
 connectionStatus:string;
 credentialRevoked:boolean;
 credentialExpiresAt:string;
 evaluatedAt:string;
 rawResponse:CviGscRawCustodyResult;
}>):CviGscCredentialProfileReview {
 const reasons:string[]=[];
 if(input.provider!=="google" ||
    input.profile!==GSC_READONLY_PROFILE ||
    input.externalAccountId!==GSC_READONLY_EXTERNAL_ACCOUNT_ID)
   reasons.push("not_dedicated_gsc_oauth_profile");
 if(!Array.isArray(input.grantedScopes) ||
    !input.grantedScopes.every(x=>typeof x==="string") ||
    !hasExactGscReadonlyScope([...input.grantedScopes]) ||
    input.grantedScopes.length!==1 ||
    input.grantedScopes[0]!==GSC_READONLY_SCOPE)
   reasons.push("scope_not_exact_gsc_readonly");
 if(input.credentialSource!=="provider_oauth" ||
    input.connectionStatus!=="connected" || input.credentialRevoked!==false)
   reasons.push("delegated_connection_not_eligible");
 if(input.connectionSiteId!==input.expectedSiteId ||
    !input.expectedSiteId || input.selectedProperty!==input.requestedProperty ||
    !input.requestedProperty)
   reasons.push("property_or_site_binding_mismatch");
 const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
 function timestamp(x:string) {
   if(typeof x!=="string" || !iso.test(x)) return null;
   const ms=Date.parse(x);
   return Number.isFinite(ms) && new Date(ms).toISOString()===x ? ms:null;
 }
 const now=timestamp(input.evaluatedAt), expiry=timestamp(input.credentialExpiresAt);
 if(now===null || expiry===null || expiry<=now)
   reasons.push("credential_expired_or_clock_invalid");
 const raw=input.rawResponse;
 if(raw?.version!==CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION ||
    raw?.status!=="PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY" ||
    !Array.isArray(raw.reasons) || raw.reasons.length!==0 ||
    !/^[a-f0-9]{64}$/.test(raw.rawBodySha256??"") ||
    !/^[a-f0-9]{64}$/.test(raw.attestationFingerprint??"") ||
    raw.tlsPeerIndependentlyAuthenticated!==false ||
    raw.oauthCredentialCustodyVerified!==false ||
    raw.providerResponseIndependentlyVerified!==false ||
    raw.tenantAccessIndependentlyVerified!==false ||
    raw.executionAuthorized!==false || raw.publicationAuthorized!==false)
   reasons.push("raw_response_custody_not_review_ready");
 const unique=[...new Set(reasons)].sort();
 return {
  version:CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION,
  status:unique.length?"DENY":"PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION",
  reasons:unique,oauthProfileMatched:!unique.includes("not_dedicated_gsc_oauth_profile") &&
    !unique.includes("scope_not_exact_gsc_readonly"),
  rawResponseBound:!unique.includes("raw_response_custody_not_review_ready"),
  delegatedCredentialIndependentlyVerified:false,
  tlsOriginIndependentlyVerified:false,
  tenantPermissionIndependentlyVerified:false,
  executionAuthorized:false,publicationAuthorized:false,
 };
}

import { createHash } from "node:crypto";

export const UGP_CONNECTOR_PLANE_EXIT_VERSION="ugp-4-8-connector-plane-exit-v1" as const;
const SHA=/^[0-9a-f]{40}$/;

function stable(v:unknown):string{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
  const o=v as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";
}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function sha(v:string,f:string){if(v!==v.trim()||!SHA.test(v))throw new Error("ugp_4_8_invalid_"+f);return v;}

export type ConnectorPlaneExitInput=Readonly<{
  ugp41McpContractBlob:string;
  ugp42OpenApiContractBlob:string;
  ugp43GitContractBlob:string;
  ugp44SiteAgentSpecBlob:string;
  wordpressEvidenceBlob:string;
  webflowEvidenceBlob:string;
  gitEvidenceBlob:string;
  shopifyAdapterBlob:string;
  shopifyAdapterTestBlob:string;
  wordpressCertifiedReadOnly:true;
  webflowCertifiedReadOnly:true;
  gitPrPathCertified:true;
  shopifyCompatibilityOnly:true;
  shopifyPreservesExistingGates:true;
  shopifyGrantsExecutionAuthorization:false;
  shopifyGrantsProviderWrite:false;
  shopifyGrantsPublicSiteWrite:false;
  mcpArbitraryToolExecution:false;
  openApiOperationGrantsAuthorization:false;
  gitDirectDefaultBranchWrite:false;
  siteAgentRuntimeEnabled:false;
}>;

export type ConnectorPlaneExitReceipt=Readonly<{
  version:typeof UGP_CONNECTOR_PLANE_EXIT_VERSION;
  evidence:Readonly<{
    ugp41McpContractBlob:string;
    ugp42OpenApiContractBlob:string;
    ugp43GitContractBlob:string;
    ugp44SiteAgentSpecBlob:string;
    wordpressEvidenceBlob:string;
    webflowEvidenceBlob:string;
    gitEvidenceBlob:string;
    shopifyAdapterBlob:string;
    shopifyAdapterTestBlob:string;
  }>;
  exitCriteria:Readonly<{
    wordpressAndAdditionalCmsCertified:true;
    gitBackedCustomSitePrPathCertified:true;
    shopifyRegressionSafe:true;
    noConnectorAuthorizationBypass:true;
  }>;
  assertions:Readonly<{
    offlineOnly:true;
    networkCalls:false;
    credentials:false;
    providerWrites:false;
    publicSiteWrites:false;
    deployment:false;
    publication:false;
    grantsAuthorization:false;
  }>;
  receiptFingerprint:string;
}>;

export function certifyConnectorPlaneExit(input:ConnectorPlaneExitInput):ConnectorPlaneExitReceipt{
  const evidence={
    ugp41McpContractBlob:sha(input.ugp41McpContractBlob,"ugp41_blob"),
    ugp42OpenApiContractBlob:sha(input.ugp42OpenApiContractBlob,"ugp42_blob"),
    ugp43GitContractBlob:sha(input.ugp43GitContractBlob,"ugp43_blob"),
    ugp44SiteAgentSpecBlob:sha(input.ugp44SiteAgentSpecBlob,"ugp44_blob"),
    wordpressEvidenceBlob:sha(input.wordpressEvidenceBlob,"wordpress_blob"),
    webflowEvidenceBlob:sha(input.webflowEvidenceBlob,"webflow_blob"),
    gitEvidenceBlob:sha(input.gitEvidenceBlob,"git_blob"),
    shopifyAdapterBlob:sha(input.shopifyAdapterBlob,"shopify_adapter_blob"),
    shopifyAdapterTestBlob:sha(input.shopifyAdapterTestBlob,"shopify_adapter_test_blob"),
  };
  if(input.wordpressCertifiedReadOnly!==true||input.webflowCertifiedReadOnly!==true)
    throw new Error("ugp_4_8_non_shopify_cms_certification_missing");
  if(input.gitPrPathCertified!==true||input.gitDirectDefaultBranchWrite!==false)
    throw new Error("ugp_4_8_git_certification_missing_or_unsafe");
  if(
    input.shopifyCompatibilityOnly!==true
    ||input.shopifyPreservesExistingGates!==true
    ||input.shopifyGrantsExecutionAuthorization!==false
    ||input.shopifyGrantsProviderWrite!==false
    ||input.shopifyGrantsPublicSiteWrite!==false
  ) throw new Error("ugp_4_8_shopify_regression_safety_failed");
  if(
    input.mcpArbitraryToolExecution!==false
    ||input.openApiOperationGrantsAuthorization!==false
    ||input.siteAgentRuntimeEnabled!==false
  ) throw new Error("ugp_4_8_connector_authorization_bypass");
  const base={
    version:UGP_CONNECTOR_PLANE_EXIT_VERSION,
    evidence:Object.freeze(evidence),
    exitCriteria:Object.freeze({
      wordpressAndAdditionalCmsCertified:true as const,
      gitBackedCustomSitePrPathCertified:true as const,
      shopifyRegressionSafe:true as const,
      noConnectorAuthorizationBypass:true as const,
    }),
    assertions:Object.freeze({
      offlineOnly:true as const,
      networkCalls:false as const,
      credentials:false as const,
      providerWrites:false as const,
      publicSiteWrites:false as const,
      deployment:false as const,
      publication:false as const,
      grantsAuthorization:false as const,
    }),
  };
  return Object.freeze({...base,receiptFingerprint:hash({purpose:"ugp_4_8_connector_plane_exit",...base})});
}

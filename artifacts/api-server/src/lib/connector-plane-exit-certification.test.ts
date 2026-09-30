import assert from "node:assert/strict";
import test from "node:test";
import { certifyConnectorPlaneExit } from "./connector-plane-exit-certification.js";

const input={
  ugp41McpContractBlob:"d97d65e61b43fff4fb1b465133776a65537c9db6",
  ugp42OpenApiContractBlob:"54476ab51a8c9184170f86125e95c57c3890743a",
  ugp43GitContractBlob:"e7db6a52919e89d7457673ef494cfaee180df133",
  ugp44SiteAgentSpecBlob:"32b53b8f88375fc6bb66093934e5f3243c7c6355",
  wordpressEvidenceBlob:"971b58464e4f0a7ba7e8bb3bb1d7956959e49ef3",
  webflowEvidenceBlob:"3426f2586ca2a77cb1c188c13ffc36c976f0610a",
  gitEvidenceBlob:"15841d3965f3f8f54e09bd76ec1a2b6057593bd6",
  shopifyAdapterBlob:"1a79d4ed0c7d1995e21cc8a05e756031fcad6c49",
  shopifyAdapterTestBlob:"7043cb242b3af1ea965b4cbea86252bac13a81a4",
  wordpressCertifiedReadOnly:true as const,
  webflowCertifiedReadOnly:true as const,
  gitPrPathCertified:true as const,
  shopifyCompatibilityOnly:true as const,
  shopifyPreservesExistingGates:true as const,
  shopifyGrantsExecutionAuthorization:false as const,
  shopifyGrantsProviderWrite:false as const,
  shopifyGrantsPublicSiteWrite:false as const,
  mcpArbitraryToolExecution:false as const,
  openApiOperationGrantsAuthorization:false as const,
  gitDirectDefaultBranchWrite:false as const,
  siteAgentRuntimeEnabled:false as const,
};

test("UGP-4.8 certifies the connector plane from exact durable evidence",()=>{
  const a=certifyConnectorPlaneExit(input);
  const b=certifyConnectorPlaneExit(input);
  assert.deepEqual(a,b);
  assert.equal(a.exitCriteria.wordpressAndAdditionalCmsCertified,true);
  assert.equal(a.exitCriteria.gitBackedCustomSitePrPathCertified,true);
  assert.equal(a.exitCriteria.shopifyRegressionSafe,true);
  assert.equal(a.exitCriteria.noConnectorAuthorizationBypass,true);
  assert.equal(a.assertions.networkCalls,false);
  assert.equal(a.assertions.grantsAuthorization,false);
  console.log("UGP_4_8_RECEIPT_FINGERPRINT="+a.receiptFingerprint);
});

test("UGP-4.8 fails closed if a CMS certification is missing",()=>{
  assert.throws(()=>certifyConnectorPlaneExit({...input,webflowCertifiedReadOnly:false as never}),/non_shopify_cms_certification_missing/);
});

test("UGP-4.8 fails closed on Shopify authority expansion",()=>{
  assert.throws(()=>certifyConnectorPlaneExit({...input,shopifyGrantsProviderWrite:true as never}),/shopify_regression_safety_failed/);
});

test("UGP-4.8 fails closed on connector authorization bypass",()=>{
  assert.throws(()=>certifyConnectorPlaneExit({...input,mcpArbitraryToolExecution:true as never}),/connector_authorization_bypass/);
});

test("UGP-4.8 fails closed on unsafe Git default-branch writes",()=>{
  assert.throws(()=>certifyConnectorPlaneExit({...input,gitDirectDefaultBranchWrite:true as never}),/git_certification_missing_or_unsafe/);
});

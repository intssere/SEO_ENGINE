import {
  assertInternalLinkingRecommendationIntegrity,
  type InternalLinkRecommendation,
  type InternalLinkingRecommendationResult,
} from "./internal-linking-recommendation-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  buildUniversalConnectorArtifact,
  buildUniversalMutationIntent,
  buildUniversalPreviewMutationRequest,
  type UniversalConnectorDescriptor,
  type UniversalMutationIntent,
  type UniversalPreviewMutationRequest,
} from "./universal-connector-contract.js";

export const UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION =
  "ugp-8-2c-internal-link-mutation-preview-v1" as const;

export type InternalLinkMutationPreviewBinding = Readonly<{
  recommendationFingerprint: string;
  descriptor: UniversalConnectorDescriptor;
  proposedStateFingerprint: string;
}>;

export type InternalLinkMutationPreviewEntry = Readonly<{
  recommendationFingerprint: string;
  direction: InternalLinkRecommendation["direction"];
  sourceLocatorFingerprint: string;
  targetLocatorFingerprint: string;
  sourceStateFingerprint: string;
  proposedStateFingerprint: string;
  anchorText: string;
  targetUrl: string;
  context: string;
  artifactFingerprint: string;
  mutationIntent: UniversalMutationIntent;
  previewRequest: UniversalPreviewMutationRequest;
  entryFingerprint: string;
}>;

export type InternalLinkMutationPreviewResult = Readonly<{
  version: typeof UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION;
  recommendationResultFingerprint: string;
  entries: readonly InternalLinkMutationPreviewEntry[];
  semantics: Readonly<{
    deterministic: true;
    connectorNeutral: true;
    previewOnly: true;
    oneRecommendationPerMutation: true;
    sourceResourceIsMutationTarget: true;
    expectedStateBoundToObservedSource: true;
    executeRequestConstructed: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    grantsAuthorization: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  resultFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  connectorNeutral:true as const,
  previewOnly:true as const,
  oneRecommendationPerMutation:true as const,
  sourceResourceIsMutationTarget:true as const,
  expectedStateBoundToObservedSource:true as const,
  executeRequestConstructed:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  grantsAuthorization:false as const,
  executionAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_internal_link_preview_invalid_"+field);
  return value;
}
function recMap(result:InternalLinkingRecommendationResult):Map<string,InternalLinkRecommendation>{
  const map=new Map<string,InternalLinkRecommendation>();
  for(const rec of result.recommendations){
    if(map.has(rec.recommendationFingerprint)) throw new Error("ugp_internal_link_preview_duplicate_recommendation");
    map.set(rec.recommendationFingerprint,rec);
  }
  return map;
}

export function buildInternalLinkMutationPreview(input:{
  recommendations:InternalLinkingRecommendationResult;
  bindings:readonly InternalLinkMutationPreviewBinding[];
}):InternalLinkMutationPreviewResult{
  assertInternalLinkingRecommendationIntegrity(input.recommendations);
  if(!Array.isArray(input.bindings)) throw new Error("ugp_internal_link_preview_bindings_required");

  const recommendations=recMap(input.recommendations);
  const seen=new Set<string>();
  const entries:InternalLinkMutationPreviewEntry[]=[];

  for(const binding of input.bindings){
    const recommendationFingerprint=fp(binding.recommendationFingerprint,"recommendation_fingerprint");
    if(seen.has(recommendationFingerprint)) throw new Error("ugp_internal_link_preview_duplicate_binding");
    seen.add(recommendationFingerprint);

    const recommendation=recommendations.get(recommendationFingerprint);
    if(!recommendation) throw new Error("ugp_internal_link_preview_unknown_recommendation");

    const proposedStateFingerprint=fp(binding.proposedStateFingerprint,"proposed_state_fingerprint");
    if(proposedStateFingerprint===recommendation.sourceStateFingerprint) throw new Error("ugp_internal_link_preview_state_unchanged");

    if(binding.descriptor.siteId!==recommendation.source.siteId||binding.descriptor.siteIdentityFingerprint!==recommendation.source.siteIdentityFingerprint){
      throw new Error("ugp_internal_link_preview_descriptor_site_mismatch");
    }
    if(binding.descriptor.provider!==recommendation.source.provider){
      throw new Error("ugp_internal_link_preview_descriptor_provider_mismatch");
    }

    const artifact=buildUniversalConnectorArtifact({
      schemaId:"ugp.internal-link.insertion.v1",
      payload:{
        operation:"insert_internal_link",
        direction:recommendation.direction,
        source:{
          resourceLocatorFingerprint:recommendation.source.resourceLocatorFingerprint,
          canonicalUrl:recommendation.source.canonicalUrl,
        },
        target:{
          resourceLocatorFingerprint:recommendation.target.resourceLocatorFingerprint,
          canonicalUrl:recommendation.target.canonicalUrl,
        },
        anchorText:recommendation.anchorText,
        context:recommendation.context,
        recommendationFingerprint:recommendation.recommendationFingerprint,
        supportingEvidenceFingerprints:recommendation.supportingEvidenceFingerprints,
      },
    });

    const mutationIntent=buildUniversalMutationIntent({
      descriptor:binding.descriptor,
      capability:"write.internal_links",
      target:recommendation.source,
      artifact,
      expectedStateFingerprint:recommendation.sourceStateFingerprint,
      proposedStateFingerprint,
    });
    const previewRequest=buildUniversalPreviewMutationRequest({mutation:mutationIntent});

    const base={
      recommendationFingerprint,
      direction:recommendation.direction,
      sourceLocatorFingerprint:recommendation.source.resourceLocatorFingerprint,
      targetLocatorFingerprint:recommendation.target.resourceLocatorFingerprint,
      sourceStateFingerprint:recommendation.sourceStateFingerprint,
      proposedStateFingerprint,
      anchorText:recommendation.anchorText,
      targetUrl:recommendation.target.canonicalUrl!,
      context:recommendation.context,
      artifactFingerprint:artifact.artifactFingerprint,
      mutationIntent,
      previewRequest,
    };
    entries.push(Object.freeze({
      ...base,
      entryFingerprint:stableEvidenceHash({
        purpose:"ugp_internal_link_mutation_preview_entry",
        version:UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION,
        ...base,
      }),
    }));
  }

  entries.sort((a,b)=>a.recommendationFingerprint.localeCompare(b.recommendationFingerprint));
  const base={
    version:UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION,
    recommendationResultFingerprint:input.recommendations.resultFingerprint,
    entries:Object.freeze(entries),
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    resultFingerprint:stableEvidenceHash({
      purpose:"ugp_internal_link_mutation_preview_result",
      ...base,
    }),
  });
}

export function assertInternalLinkMutationPreviewIntegrity(result:InternalLinkMutationPreviewResult):void{
  if(!result||result.version!==UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION) throw new Error("ugp_internal_link_preview_version_invalid");
  fp(result.recommendationResultFingerprint,"recommendation_result_fingerprint");
  if(result.semantics.deterministic!==true||result.semantics.connectorNeutral!==true||result.semantics.previewOnly!==true||result.semantics.oneRecommendationPerMutation!==true||result.semantics.sourceResourceIsMutationTarget!==true||result.semantics.expectedStateBoundToObservedSource!==true||result.semantics.executeRequestConstructed!==false||result.semantics.performsNetworkOperation!==false||result.semantics.performsPersistence!==false||result.semantics.grantsAuthorization!==false||result.semantics.executionAuthorized!==false||result.semantics.providerWrites!==false||result.semantics.publicSiteWrites!==false){
    throw new Error("ugp_internal_link_preview_unsafe_semantics");
  }
  const seen=new Set<string>();
  for(const entry of result.entries){
    fp(entry.recommendationFingerprint,"recommendation_fingerprint");
    fp(entry.sourceStateFingerprint,"source_state_fingerprint");
    fp(entry.proposedStateFingerprint,"proposed_state_fingerprint");
    if(entry.sourceStateFingerprint===entry.proposedStateFingerprint) throw new Error("ugp_internal_link_preview_state_unchanged");
    if(seen.has(entry.recommendationFingerprint)) throw new Error("ugp_internal_link_preview_duplicate_entry");
    seen.add(entry.recommendationFingerprint);
    if(entry.mutationIntent.capability!=="write.internal_links") throw new Error("ugp_internal_link_preview_capability_invalid");
    if(entry.mutationIntent.target.resourceLocatorFingerprint!==entry.sourceLocatorFingerprint) throw new Error("ugp_internal_link_preview_mutation_target_mismatch");
    if(entry.mutationIntent.expectedStateFingerprint!==entry.sourceStateFingerprint||entry.mutationIntent.proposedStateFingerprint!==entry.proposedStateFingerprint) throw new Error("ugp_internal_link_preview_state_binding_mismatch");
    if(entry.previewRequest.mutation.intentFingerprint!==entry.mutationIntent.intentFingerprint) throw new Error("ugp_internal_link_preview_request_binding_mismatch");
    const {entryFingerprint,...base}=entry;
    const expected=stableEvidenceHash({purpose:"ugp_internal_link_mutation_preview_entry",version:UGP_INTERNAL_LINK_MUTATION_PREVIEW_VERSION,...base});
    if(entryFingerprint!==expected) throw new Error("ugp_internal_link_preview_entry_fingerprint_mismatch");
  }
  const {resultFingerprint,...base}=result;
  const expected=stableEvidenceHash({purpose:"ugp_internal_link_mutation_preview_result",...base});
  if(resultFingerprint!==expected) throw new Error("ugp_internal_link_preview_result_fingerprint_mismatch");
}

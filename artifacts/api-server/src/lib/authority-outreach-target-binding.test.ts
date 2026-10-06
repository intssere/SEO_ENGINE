import assert from "node:assert/strict";
import test from "node:test";
import { buildBacklinkEvidenceDataset } from "./backlink-evidence-contract.js";
import { discoverAuthorityOpportunities } from "./authority-opportunity-discovery.js";
import { qualifyAuthorityProspects } from "./authority-prospect-qualification.js";
import type { AuthorityOutreachReviewInput } from "./authority-outreach-workspace.js";
import {
  buildUniversalResourceIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";
import {
  assertAuthorityOutreachTargetBindingProjectionIntegrity,
  buildAuthorityOutreachTargetBindingProjection,
} from "./authority-outreach-target-binding.js";

const FP=(c:string)=>c.repeat(64);

function qualification(){
  const current=buildBacklinkEvidenceDataset({
    targetDomain:"diamondshelf.us",
    source:{
      providerKey:"dataforseo",
      providerDataset:"backlinks.backlinks.live",
      sourceFingerprint:FP("a"),
      requestFingerprint:FP("b"),
      marketFingerprint:FP("c"),
      categoryFingerprint:FP("d"),
      observedAt:"2026-10-05T00:00:00Z",
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:1000,
        crossProviderComparable:false,
      },
      responseFingerprint:FP("e"),
    },
    backlinks:[{
      sourceUrl:"https://publisher.example.org/old-guide",
      sourceDomain:"publisher.example.org",
      targetUrl:"https://diamondshelf.us/guide",
      anchorText:"Guide",
      firstSeenAt:"2026-01-01T00:00:00Z",
      lastSeenAt:"2026-08-01T00:00:00Z",
      lostAt:"2026-09-01T00:00:00Z",
      state:"lost",
      followState:"follow",
      rel:[],
      providerAuthority:620,
      providerMetrics:[{key:"is_lost",value:1,unit:"boolean"}],
    }],
  });
  const discovery=discoverAuthorityOpportunities({
    current,
    supplementalEvidence:[{
      kind:"content_promotion_prospect",
      sourceDomain:"editorial.example.net",
      sourceUrl:"https://editorial.example.net/resources",
      targetUrl:null,
      observedAt:"2026-09-15T00:00:00Z",
      evidenceFingerprint:FP("f"),
    }],
  });
  const signals=discovery.opportunities.map((opportunity,index)=>({
    opportunityFingerprint:opportunity.opportunityFingerprint,
    topicalRelevance:{value:0.95,evidenceFingerprint:FP(index===0?"1":"5")},
    targetPageFit:{value:0.9,evidenceFingerprint:FP(index===0?"2":"6")},
    contactability:{value:1,evidenceFingerprint:FP(index===0?"3":"7")},
    spamRisk:{value:0.05,evidenceFingerprint:FP(index===0?"4":"8")},
  }));
  const result=qualifyAuthorityProspects({current,discovery,signals});
  assert.equal(result.prospects.length,2);
  return result;
}

function reviews(q:ReturnType<typeof qualification>):AuthorityOutreachReviewInput[]{
  return q.prospects.map((prospect,index)=>({
    qualificationFingerprint:q.qualificationFingerprint,
    prospectFingerprint:prospect.prospectFingerprint,
    decision:"approved_for_draft" as const,
    reasonCode:"editorial_fit_confirmed" as const,
    reviewerId:"operator@example.com",
    reviewedAt:index===0
      ?"2026-10-05T14:30:00.000Z"
      :"2026-10-05T14:31:00.000Z",
  }));
}

function ownedResource(url="https://diamondshelf.us/blogs/news/best-fall-fragrances"){
  const site=buildUniversalSiteIdentity({
    siteId:"diamond-shelf",
    canonicalOrigin:"https://diamondshelf.us",
  });
  const locator=buildUniversalResourceLocator({
    site,
    provider:"shopify",
    kind:"article",
    externalId:"gid://shopify/Article/123456789",
    canonicalUrl:url,
    locale:"en-US",
  });
  return buildUniversalResourceIdentity({
    locator,
    stateFingerprint:FP("9"),
    observedAt:"2026-10-05T13:00:00.000Z",
  });
}

test("explicit verified same-site resource binding resolves only a target-binding-required prospect",()=>{
  const q=qualification();
  const r=reviews(q);
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
  });
  assert.equal(initial.summary.draftBriefReadyExistingTarget,1);
  assert.equal(initial.summary.targetBindingRequired,1);
  assert.equal(initial.summary.draftBriefReadyBoundTarget,0);

  const missing=initial.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(missing);

  const resource=ownedResource();
  const result=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
    resources:[resource],
    bindings:[{
      preparationFingerprint:initial.preparationFingerprint,
      prospectFingerprint:missing.prospectFingerprint,
      resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
      binderId:"operator@example.com",
      boundAt:"2026-10-05T14:45:00.000Z",
    }],
  });

  assert.equal(result.summary.draftBriefReadyExistingTarget,1);
  assert.equal(result.summary.draftBriefReadyBoundTarget,1);
  assert.equal(result.summary.targetBindingRequired,0);
  assert.equal(result.semantics.automaticTargetSelection,false);
  assert.equal(result.semantics.contactDiscoveryAuthorized,false);
  assert.equal(result.semantics.outreachDraftTextGenerationAuthorized,false);
  assert.equal(result.semantics.outreachSendingAuthorized,false);
  assert.equal(result.semantics.performsNetworkOperation,false);
  assert.equal(result.semantics.performsPersistence,false);

  const bound=result.items.find(
    item=>item.state==="draft_brief_ready_bound_target",
  );
  assert.ok(bound?.targetBinding);
  assert.equal(
    bound.resolvedTargetUrl,
    "https://diamondshelf.us/blogs/news/best-fall-fragrances",
  );
  assert.equal(bound.targetBinding.binderId,"operator@example.com");
  assert.equal(bound.targetBinding.resourceKind,"article");
  assert.equal(bound.targetBinding.provider,"shopify");
  assert.equal(
    bound.targetBinding.resourceIdentityFingerprint,
    resource.resourceIdentityFingerprint,
  );
  assert.equal(
    bound.targetBinding.semantics.explicitHumanSelectionRequired,
    true,
  );
  assert.equal(
    bound.targetBinding.semantics.verifiedOwnedResourceRequired,
    true,
  );

  assertAuthorityOutreachTargetBindingProjectionIntegrity(result,{
    qualification:q,
    reviews:r,
    resources:[resource],
    bindings:[{
      preparationFingerprint:initial.preparationFingerprint,
      prospectFingerprint:missing.prospectFingerprint,
      resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
      binderId:"operator@example.com",
      boundAt:"2026-10-05T14:45:00.000Z",
    }],
  });
});

test("missing target remains blocked when no explicit human binding is supplied",()=>{
  const q=qualification();
  const result=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:reviews(q),
    resources:[ownedResource()],
  });
  assert.equal(result.summary.targetBindingRequired,1);
  assert.equal(result.summary.draftBriefReadyBoundTarget,0);
  const blocked=result.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(blocked);
  assert.equal(blocked.resolvedTargetUrl,null);
  assert.equal(blocked.targetBinding,null);
});

test("cross-site resource identity cannot be used as an outreach target",()=>{
  const q=qualification();
  const r=reviews(q);
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
  });
  const missing=initial.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(missing);

  const site=buildUniversalSiteIdentity({
    siteId:"other-site",
    canonicalOrigin:"https://other.example",
  });
  const locator=buildUniversalResourceLocator({
    site,
    provider:"shopify",
    kind:"page",
    externalId:"gid://shopify/OnlineStorePage/987654321",
    canonicalUrl:"https://other.example/resources",
  });
  const resource=buildUniversalResourceIdentity({
    locator,
    stateFingerprint:FP("a"),
    observedAt:"2026-10-05T13:00:00.000Z",
  });

  assert.throws(
    ()=>buildAuthorityOutreachTargetBindingProjection({
      qualification:q,
      reviews:r,
      resources:[resource],
      bindings:[{
        preparationFingerprint:initial.preparationFingerprint,
        prospectFingerprint:missing.prospectFingerprint,
        resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
        binderId:"operator@example.com",
        boundAt:"2026-10-05T14:45:00.000Z",
      }],
    }),
    /ugp_outreach_target_binding_resource_site_mismatch/,
  );
});

test("bindings are rejected for prospects that already have an evidence-bound target",()=>{
  const q=qualification();
  const r=reviews(q);
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
  });
  const existing=initial.items.find(
    item=>item.state==="draft_brief_ready_existing_target",
  );
  assert.ok(existing);
  const resource=ownedResource();

  assert.throws(
    ()=>buildAuthorityOutreachTargetBindingProjection({
      qualification:q,
      reviews:r,
      resources:[resource],
      bindings:[{
        preparationFingerprint:initial.preparationFingerprint,
        prospectFingerprint:existing.prospectFingerprint,
        resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
        binderId:"operator@example.com",
        boundAt:"2026-10-05T14:45:00.000Z",
      }],
    }),
    /ugp_outreach_target_binding_not_required/,
  );
});

test("stale preparation fingerprints and pre-observation bindings fail closed",()=>{
  const q=qualification();
  const r=reviews(q);
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
  });
  const missing=initial.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(missing);
  const resource=ownedResource();

  assert.throws(
    ()=>buildAuthorityOutreachTargetBindingProjection({
      qualification:q,
      reviews:r,
      resources:[resource],
      bindings:[{
        preparationFingerprint:FP("0"),
        prospectFingerprint:missing.prospectFingerprint,
        resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
        binderId:"operator@example.com",
        boundAt:"2026-10-05T14:45:00.000Z",
      }],
    }),
    /ugp_outreach_target_binding_stale_preparation/,
  );

  assert.throws(
    ()=>buildAuthorityOutreachTargetBindingProjection({
      qualification:q,
      reviews:r,
      resources:[resource],
      bindings:[{
        preparationFingerprint:initial.preparationFingerprint,
        prospectFingerprint:missing.prospectFingerprint,
        resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
        binderId:"operator@example.com",
        boundAt:"2026-10-05T12:00:00.000Z",
      }],
    }),
    /ugp_outreach_target_binding_before_resource_observation/,
  );
});

test("projection is deterministic and integrity reconstruction catches tampering",()=>{
  const q=qualification();
  const r=reviews(q);
  const initial=buildAuthorityOutreachTargetBindingProjection({
    qualification:q,
    reviews:r,
  });
  const missing=initial.items.find(
    item=>item.state==="target_binding_required",
  );
  assert.ok(missing);
  const resource=ownedResource();
  const input={
    qualification:q,
    reviews:r,
    resources:[resource],
    bindings:[{
      preparationFingerprint:initial.preparationFingerprint,
      prospectFingerprint:missing.prospectFingerprint,
      resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
      binderId:"operator@example.com",
      boundAt:"2026-10-05T14:45:00.000Z",
    }],
  };
  const first=buildAuthorityOutreachTargetBindingProjection(input);
  const second=buildAuthorityOutreachTargetBindingProjection(input);
  assert.deepEqual(second,first);

  const tampered=structuredClone(first);
  const bound=tampered.items.find(item=>item.targetBinding!==null);
  assert.ok(bound?.targetBinding);
  Object.assign(bound.targetBinding,{
    targetUrl:"https://diamondshelf.us/attacker-controlled",
  });
  assert.throws(
    ()=>assertAuthorityOutreachTargetBindingProjectionIntegrity(
      tampered,
      input,
    ),
    /ugp_outreach_target_binding_integrity_mismatch/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { ContentCalendarArticleBinding } from "./content-calendar-article-binding.js";
import {
  assertContentCalendarWorkSpecIntegrity,
  buildContentCalendarWorkSpec,
} from "./content-calendar-work-spec.js";

const fp=(c:string)=>c.repeat(64);

function bindingFixture(mode:"review"|"autopilot"="review",action:"create_candidate"|"refresh_candidate"="create_candidate"):ContentCalendarArticleBinding{
  const requiredPublicationPlanOperation=action==="create_candidate"?"create" as const:"update" as const;
  const base={
    version:"ugp-8-3b-calendar-readiness-publication-binding-v1" as const,
    calendarProjectionFingerprint:fp("1"),
    calendarItemFingerprint:fp("2"),
    opportunityFingerprint:fp("3"),
    scheduledDate:"2026-10-10",
    action,
    requiredPublicationPlanOperation,
    readinessFingerprint:fp("4"),
    draftId:fp("5"),
    draftFingerprint:fp("6"),
    qualityGateId:fp("7"),
    qualityGateFingerprint:fp("8"),
    publicationPlanFingerprint:fp("9"),
    publicationTargetLocatorFingerprint:fp("a"),
    reviewRequired:mode==="review",
    autopilotPolicySelected:mode==="autopilot",
    semantics:Object.freeze({
      deterministic:true as const,
      lineageBound:true as const,
      readinessMeansCompleteDraftAndPassingQualityGate:true as const,
      publicationPlanRequired:true as const,
      schedulerMaterialized:false as const,
      schedulerAuthorized:false as const,
      grantsAuthorization:false as const,
      publicationAuthorized:false as const,
      executionAuthorized:false as const,
      performsNetworkOperation:false as const,
      performsPersistence:false as const,
      providerWrites:false as const,
      publicSiteWrites:false as const,
    }),
  };
  return Object.freeze({
    ...base,
    bindingFingerprint:stableEvidenceHash({
      purpose:"ugp_content_calendar_article_binding",
      ...base,
    }),
  });
}

test("UGP-8.3C builds deterministic immutable create work spec",()=>{
  const binding=bindingFixture("review","create_candidate");
  const first=buildContentCalendarWorkSpec({binding});
  const second=buildContentCalendarWorkSpec({binding});
  assert.deepEqual(first,second);
  assert.equal(first.operation,"create");
  assert.equal(first.lifecycle,"proposed");
  assert.equal(first.schedule.kind,"calendar_date");
  assert.equal(first.schedule.scheduledDate,"2026-10-10");
  assert.equal(first.policy.reviewRequired,true);
  assert.equal(first.runtimeRequirements.explicitAuthorizationRequiredBeforeExecution,true);
  assert.equal(first.runtimeRequirements.authorizationEmbedded,false);
  assert.equal(first.semantics.queueMaterialized,false);
  assert.equal(first.semantics.schedulerActivated,false);
  assertContentCalendarWorkSpecIntegrity(first);
});

test("UGP-8.3C preserves refresh/update and autopilot preference without authority",()=>{
  const spec=buildContentCalendarWorkSpec({binding:bindingFixture("autopilot","refresh_candidate")});
  assert.equal(spec.operation,"update");
  assert.equal(spec.policy.autopilotPolicySelected,true);
  assert.equal(spec.semantics.publicationAuthorized,false);
  assert.equal(spec.semantics.executionAuthorized,false);
  assert.equal(spec.runtimeRequirements.policyRecheckAtClaimRequired,true);
});

test("UGP-8.3C rejects inconsistent review/autopilot policy modes",()=>{
  const binding=bindingFixture();
  const base={...binding,reviewRequired:true,autopilotPolicySelected:true};
  const {bindingFingerprint:_old,...rest}=base;
  const mutated={...rest,bindingFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_article_binding",...rest})} as ContentCalendarArticleBinding;
  assert.throws(()=>buildContentCalendarWorkSpec({binding:mutated}),/policy_mode_invalid/);
});

test("UGP-8.3C rejects calendar action/publication-operation drift",()=>{
  const binding=bindingFixture("review","create_candidate");
  const base={...binding,requiredPublicationPlanOperation:"update" as const};
  const {bindingFingerprint:_old,...rest}=base;
  const mutated={...rest,bindingFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_article_binding",...rest})} as ContentCalendarArticleBinding;
  assert.throws(()=>buildContentCalendarWorkSpec({binding:mutated}),/binding_operation_invalid|operation_mismatch/);
});

test("UGP-8.3C integrity detects work spec mutation",()=>{
  const spec=buildContentCalendarWorkSpec({binding:bindingFixture()});
  assert.throws(()=>assertContentCalendarWorkSpecIntegrity({...spec,workSpecFingerprint:fp("0")}),/identity_mismatch/);
});

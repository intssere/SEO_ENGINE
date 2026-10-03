import {
  assertContentOpportunityModelIntegrity,
  type ContentOpportunity,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_CONTENT_CALENDAR_VERSION =
  "ugp-8-3a-content-calendar-policy-projection-v1" as const;

export type ContentCalendarMode = "review_required" | "autopilot_policy";

export type ContentCalendarPolicy = Readonly<{
  articlesPerWeek: number;
  allowedCategories: readonly string[];
  blackoutDates: readonly string[];
  mode: ContentCalendarMode;
}>;

export type ContentCalendarCandidateInput = Readonly<{
  opportunityFingerprint: string;
  category: string;
  priorityScore: number;
  readinessFingerprint: string;
}>;

export type ContentCalendarScheduledItem = Readonly<{
  opportunityId: string;
  opportunityFingerprint: string;
  action: "create_candidate" | "refresh_candidate";
  category: string;
  priorityScore: number;
  readinessFingerprint: string;
  scheduledDate: string;
  weekIndex: number;
  slotIndex: number;
  reviewRequired: boolean;
  autopilotPolicySelected: boolean;
  publicationAuthorized: false;
  executionAuthorized: false;
  itemFingerprint: string;
}>;

export type ContentCalendarDeferredItem = Readonly<{
  opportunityFingerprint: string;
  reason:
    | "category_not_allowed"
    | "action_not_calendar_eligible"
    | "capacity_exhausted";
}>;

export type ContentCalendarProjection = Readonly<{
  version: typeof UGP_CONTENT_CALENDAR_VERSION;
  opportunityModelFingerprint: string;
  startDate: string;
  weeks: number;
  policy: ContentCalendarPolicy;
  scheduled: readonly ContentCalendarScheduledItem[];
  deferred: readonly ContentCalendarDeferredItem[];
  capacity: Readonly<{
    theoreticalSlots: number;
    availableDateSlots: number;
    scheduled: number;
    unused: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    planningOnly: true;
    customerPolicyDriven: true;
    autopilotIsPolicyPreferenceOnly: true;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  projectionFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const CATEGORY=/^[a-z0-9][a-z0-9._:-]{0,95}$/;
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  planningOnly:true as const,
  customerPolicyDriven:true as const,
  autopilotIsPolicyPreferenceOnly:true as const,
  grantsAuthorization:false as const,
  publicationAuthorized:false as const,
  executionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(v:unknown,f:string):string{
  if(typeof v!=="string"||!HEX64.test(v)) throw new Error("ugp_content_calendar_invalid_"+f);
  return v;
}
function exactDate(v:unknown,f:string):string{
  if(typeof v!=="string"||!DATE.test(v)) throw new Error("ugp_content_calendar_invalid_"+f);
  const d=new Date(v+"T00:00:00.000Z");
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v) throw new Error("ugp_content_calendar_invalid_"+f);
  return v;
}
function category(v:unknown):string{
  if(typeof v!=="string") throw new Error("ugp_content_calendar_invalid_category");
  const n=v.normalize("NFKC").trim().toLowerCase();
  if(!CATEGORY.test(n)) throw new Error("ugp_content_calendar_invalid_category");
  return n;
}
function score(v:unknown):number{
  if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>100) throw new Error("ugp_content_calendar_invalid_priority_score");
  return Math.round(v*1000)/1000;
}
function plusDays(date:string,days:number):string{
  const d=new Date(date+"T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function normalizePolicy(input:ContentCalendarPolicy):ContentCalendarPolicy{
  if(!Number.isInteger(input.articlesPerWeek)||input.articlesPerWeek<1||input.articlesPerWeek>7) throw new Error("ugp_content_calendar_invalid_articles_per_week");
  if(!Array.isArray(input.allowedCategories)||input.allowedCategories.length<1||input.allowedCategories.length>32) throw new Error("ugp_content_calendar_invalid_allowed_categories");
  const allowed=[...new Set(input.allowedCategories.map(category))].sort();
  const blackout=[...new Set((input.blackoutDates??[]).map((d)=>exactDate(d,"blackout_date")))].sort();
  if(input.mode!=="review_required"&&input.mode!=="autopilot_policy") throw new Error("ugp_content_calendar_invalid_mode");
  return Object.freeze({articlesPerWeek:input.articlesPerWeek,allowedCategories:Object.freeze(allowed),blackoutDates:Object.freeze(blackout),mode:input.mode});
}
function actionEligible(o:ContentOpportunity):o is ContentOpportunity & {recommendedAction:"create_candidate"|"refresh_candidate"}{
  return o.recommendedAction==="create_candidate"||o.recommendedAction==="refresh_candidate";
}

export function buildContentCalendarProjection(input:{
  opportunityModel:ContentOpportunityModelResult;
  candidates:readonly ContentCalendarCandidateInput[];
  policy:ContentCalendarPolicy;
  startDate:string;
  weeks:number;
}):ContentCalendarProjection{
  assertContentOpportunityModelIntegrity(input.opportunityModel);
  const startDate=exactDate(input.startDate,"start_date");
  if(!Number.isInteger(input.weeks)||input.weeks<1||input.weeks>26) throw new Error("ugp_content_calendar_invalid_weeks");
  if(!Array.isArray(input.candidates)) throw new Error("ugp_content_calendar_candidates_required");
  const policy=normalizePolicy(input.policy);
  const allowed=new Set(policy.allowedCategories);
  const blackout=new Set(policy.blackoutDates);
  const opportunities=new Map(input.opportunityModel.opportunities.map(o=>[o.opportunityFingerprint,o]));
  const seen=new Set<string>();
  const eligible:Array<{o:ContentOpportunity&{recommendedAction:"create_candidate"|"refresh_candidate"};c:ContentCalendarCandidateInput;category:string;priority:number}>=[];
  const deferred:ContentCalendarDeferredItem[]=[];

  for(const c of input.candidates){
    const opportunityFingerprint=fp(c.opportunityFingerprint,"opportunity_fingerprint");
    if(seen.has(opportunityFingerprint)) throw new Error("ugp_content_calendar_duplicate_candidate");
    seen.add(opportunityFingerprint);
    const o=opportunities.get(opportunityFingerprint);
    if(!o) throw new Error("ugp_content_calendar_unknown_opportunity");
    const cat=category(c.category);
    const priority=score(c.priorityScore);
    fp(c.readinessFingerprint,"readiness_fingerprint");
    if(!actionEligible(o)){
      deferred.push(Object.freeze({opportunityFingerprint,reason:"action_not_calendar_eligible"}));
      continue;
    }
    if(!allowed.has(cat)){
      deferred.push(Object.freeze({opportunityFingerprint,reason:"category_not_allowed"}));
      continue;
    }
    eligible.push({o,c,category:cat,priority});
  }

  eligible.sort((a,b)=>b.priority-a.priority||a.o.opportunityFingerprint.localeCompare(b.o.opportunityFingerprint));
  const slots:Array<{date:string;weekIndex:number;slotIndex:number}>=[];
  let availableDateSlots=0;
  for(let w=0;w<input.weeks;w++){
    let assigned=0;
    for(let d=0;d<7&&assigned<policy.articlesPerWeek;d++){
      const date=plusDays(startDate,w*7+d);
      if(blackout.has(date)) continue;
      slots.push({date,weekIndex:w,slotIndex:assigned});
      assigned++;
      availableDateSlots++;
    }
  }

  const scheduled:ContentCalendarScheduledItem[]=[];
  for(let i=0;i<eligible.length;i++){
    const item=eligible[i];
    const slot=slots[i];
    if(!slot){
      deferred.push(Object.freeze({opportunityFingerprint:item.o.opportunityFingerprint,reason:"capacity_exhausted"}));
      continue;
    }
    const base={
      opportunityId:item.o.opportunityId,
      opportunityFingerprint:item.o.opportunityFingerprint,
      action:item.o.recommendedAction,
      category:item.category,
      priorityScore:item.priority,
      readinessFingerprint:item.c.readinessFingerprint,
      scheduledDate:slot.date,
      weekIndex:slot.weekIndex,
      slotIndex:slot.slotIndex,
      reviewRequired:policy.mode==="review_required",
      autopilotPolicySelected:policy.mode==="autopilot_policy",
      publicationAuthorized:false as const,
      executionAuthorized:false as const,
    };
    scheduled.push(Object.freeze({...base,itemFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_item",version:UGP_CONTENT_CALENDAR_VERSION,...base})}));
  }

  deferred.sort((a,b)=>a.opportunityFingerprint.localeCompare(b.opportunityFingerprint)||a.reason.localeCompare(b.reason));
  const base={
    version:UGP_CONTENT_CALENDAR_VERSION,
    opportunityModelFingerprint:input.opportunityModel.opportunityModelFingerprint,
    startDate,
    weeks:input.weeks,
    policy,
    scheduled:Object.freeze(scheduled),
    deferred:Object.freeze(deferred),
    capacity:Object.freeze({
      theoreticalSlots:input.weeks*policy.articlesPerWeek,
      availableDateSlots,
      scheduled:scheduled.length,
      unused:Math.max(0,availableDateSlots-scheduled.length),
    }),
    semantics:SEMANTICS,
  };
  return Object.freeze({...base,projectionFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_projection",...base})});
}

export function assertContentCalendarProjectionIntegrity(result:ContentCalendarProjection):void{
  if(!result||result.version!==UGP_CONTENT_CALENDAR_VERSION) throw new Error("ugp_content_calendar_version_invalid");
  fp(result.opportunityModelFingerprint,"opportunity_model_fingerprint");
  const policy=normalizePolicy(result.policy);
  if(JSON.stringify(policy)!==JSON.stringify(result.policy)) throw new Error("ugp_content_calendar_policy_not_canonical");
  const s=result.semantics;
  if(s.deterministic!==true||s.planningOnly!==true||s.customerPolicyDriven!==true||s.autopilotIsPolicyPreferenceOnly!==true||s.grantsAuthorization!==false||s.publicationAuthorized!==false||s.executionAuthorized!==false||s.performsNetworkOperation!==false||s.performsPersistence!==false||s.providerWrites!==false||s.publicSiteWrites!==false) throw new Error("ugp_content_calendar_unsafe_semantics");
  for(const item of result.scheduled){
    if(item.publicationAuthorized!==false||item.executionAuthorized!==false) throw new Error("ugp_content_calendar_item_authority_invalid");
    const {itemFingerprint,...base}=item;
    if(itemFingerprint!==stableEvidenceHash({purpose:"ugp_content_calendar_item",version:UGP_CONTENT_CALENDAR_VERSION,...base})) throw new Error("ugp_content_calendar_item_fingerprint_mismatch");
  }
  const {projectionFingerprint,...base}=result;
  if(projectionFingerprint!==stableEvidenceHash({purpose:"ugp_content_calendar_projection",...base})) throw new Error("ugp_content_calendar_projection_fingerprint_mismatch");
}

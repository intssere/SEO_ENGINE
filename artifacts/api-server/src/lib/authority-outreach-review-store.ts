import postgres from "postgres";
import {
  loadAuthorityQualificationData,
  type AuthorityQualificationApiResponse,
} from "./authority-qualification-data.js";
import type { AuthorityProspectQualificationResult } from "./authority-prospect-qualification.js";
import type { AuthorityOutreachReviewInput } from "./authority-outreach-workspace.js";
import {
  assertAuthorityOutreachReviewAuditHistoryIntegrity,
  authorityOutreachReviewRequestFingerprint,
  prepareAuthorityOutreachReviewDecision,
  type AuthorityOutreachReviewAuditEvent,
  type AuthorityOutreachReviewMutationRequest,
} from "./authority-outreach-review-persistence-contract.js";

export const UGP_AUTHORITY_OUTREACH_REVIEW_STORE_VERSION =
  "ugp-10-3-durable-outreach-review-store-v1" as const;

const HEX64=/^[0-9a-f]{64}$/;
const WORKSPACE_ITEM_ID=/^uaow-[0-9a-f]{24}$/;
const DECISIONS=new Set(["approved_for_draft","rejected","deferred"]);
const REASONS=new Set([
  "editorial_fit_confirmed",
  "needs_more_context",
  "relationship_conflict",
  "target_not_appropriate",
  "timing_not_right",
  "policy_or_reputation_risk",
]);
const REQUEST_KEYS=new Set([
  "workspaceFingerprint",
  "workspaceItemId",
  "workspaceItemFingerprint",
  "qualificationFingerprint",
  "prospectFingerprint",
  "expectedLatestReviewFingerprint",
  "decision",
  "reasonCode",
  "confirmation",
]);

export type AuthorityOutreachQualificationLoader =
  ()=>Promise<AuthorityQualificationApiResponse>;

export class AuthorityOutreachReviewStoreError extends Error{
  constructor(
    readonly category:string,
    readonly status:number,
  ){
    super(category);
    this.name="AuthorityOutreachReviewStoreError";
  }
}

type ReviewRow={
  eventId:string;
  eventVersion:string;
  eventFingerprint:string;
  requestFingerprint:string;
  sequence:number;
  previousEventFingerprint:string|null;
  workspaceVersion:"ugp-10-1-outreach-review-workspace-v1";
  workspaceFingerprint:string;
  workspaceItemId:string;
  workspaceItemFingerprint:string;
  qualificationFingerprint:string;
  prospectFingerprint:string;
  opportunityFingerprint:string;
  targetDomain:string;
  sourceDomain:string;
  targetUrl:string|null;
  qualificationStatus:
    |"qualified_for_review"
    |"needs_review"
    |"insufficient_evidence"
    |"disqualified";
  decision:"approved_for_draft"|"rejected"|"deferred";
  reasonCode:
    |"editorial_fit_confirmed"
    |"needs_more_context"
    |"relationship_conflict"
    |"target_not_appropriate"
    |"timing_not_right"
    |"policy_or_reputation_risk";
  reviewerId:string;
  reviewedAt:Date|string;
  reviewFingerprint:string;
};

const EVENT_SEMANTICS=Object.freeze({
  humanDecision:true as const,
  appendOnlyAuditRequired:true as const,
  immutableAuditRequired:true as const,
  persistenceRequired:true as const,
  approvalForDraftOnly:true as const,
  contactDiscoveryAuthorized:false as const,
  outreachDraftingAuthorized:false as const,
  outreachSendingAuthorized:false as const,
  liveProviderExecutionAuthorized:false as const,
  publicSiteWrites:false as const,
});

const STORE_SEMANTICS=Object.freeze({
  durablePersistence:true as const,
  appendOnlyAudit:true as const,
  immutableAudit:true as const,
  authenticatedOperatorRequired:true as const,
  csrfRequired:true as const,
  sameOriginRequired:true as const,
  idempotentRetry:true as const,
  contactDiscoveryAuthorized:false as const,
  outreachDraftingAuthorized:false as const,
  outreachSendingAuthorized:false as const,
  liveProviderExecutionAuthorized:false as const,
  schedulerEnabled:false as const,
  workerEnabled:false as const,
  publicSiteWrites:false as const,
});

function database(databaseUrl?:string){
  const url=databaseUrl?.trim()||process.env.DATABASE_URL?.trim();
  if(!url) throw new AuthorityOutreachReviewStoreError(
    "outreach_review_runtime_unavailable",
    503,
  );
  return postgres(url,{
    max:1,
    prepare:false,
    connect_timeout:8,
    idle_timeout:2,
  });
}

function canonicalTimestamp(value:Date|string):string{
  const date=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(date.getTime())){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_persisted_timestamp_invalid",
      503,
    );
  }
  return date.toISOString();
}

function rowToEvent(row:ReviewRow):AuthorityOutreachReviewAuditEvent{
  if(row.eventVersion!=="ugp-10-3-outreach-review-persistence-contract-v1"){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_persisted_version_invalid",
      503,
    );
  }
  if(row.workspaceVersion!=="ugp-10-1-outreach-review-workspace-v1"){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_persisted_workspace_version_invalid",
      503,
    );
  }
  return Object.freeze({
    version:"ugp-10-3-outreach-review-persistence-contract-v1",
    eventId:row.eventId,
    eventFingerprint:row.eventFingerprint,
    sequence:Number(row.sequence),
    previousEventFingerprint:row.previousEventFingerprint,
    workspaceVersion:row.workspaceVersion,
    workspaceFingerprint:row.workspaceFingerprint,
    workspaceItemId:row.workspaceItemId,
    workspaceItemFingerprint:row.workspaceItemFingerprint,
    qualificationFingerprint:row.qualificationFingerprint,
    prospectFingerprint:row.prospectFingerprint,
    opportunityFingerprint:row.opportunityFingerprint,
    targetDomain:row.targetDomain,
    sourceDomain:row.sourceDomain,
    targetUrl:row.targetUrl,
    qualificationStatus:row.qualificationStatus,
    decision:row.decision,
    reasonCode:row.reasonCode,
    reviewerId:row.reviewerId,
    reviewedAt:canonicalTimestamp(row.reviewedAt),
    reviewFingerprint:row.reviewFingerprint,
    requestFingerprint:row.requestFingerprint,
    semantics:EVENT_SEMANTICS,
  });
}

function eventToReview(event:AuthorityOutreachReviewAuditEvent):AuthorityOutreachReviewInput{
  return Object.freeze({
    qualificationFingerprint:event.qualificationFingerprint,
    prospectFingerprint:event.prospectFingerprint,
    decision:event.decision,
    reasonCode:event.reasonCode,
    reviewerId:event.reviewerId,
    reviewedAt:event.reviewedAt,
  });
}

function assertEventGroups(events:readonly AuthorityOutreachReviewAuditEvent[]):void{
  const groups=new Map<string,AuthorityOutreachReviewAuditEvent[]>();
  for(const event of events){
    const key=event.prospectFingerprint;
    const group=groups.get(key)??[];
    group.push(event);
    groups.set(key,group);
  }
  for(const group of groups.values()){
    group.sort((a,b)=>a.sequence-b.sequence);
    assertAuthorityOutreachReviewAuditHistoryIntegrity(group);
  }
}

async function assertReviewTableReady(sql:postgres.Sql):Promise<void>{
  const rows=await sql<{relation:string|null}[]>\`
    SELECT to_regclass('public.authority_outreach_review_events')::text AS relation
  \`;
  if(rows[0]?.relation!=="authority_outreach_review_events"){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_schema_unavailable",
      503,
    );
  }
}

async function resolveSite(
  sql:postgres.Sql,
  targetDomain:string,
  lock:boolean,
):Promise<string>{
  const rows=lock
    ?await sql<{id:string}[]>\`
      SELECT id::text AS id
      FROM sites
      WHERE lower(domain)=\${targetDomain.toLowerCase()} AND is_active=true
      ORDER BY updated_at DESC,id
      LIMIT 2
      FOR UPDATE
    \`
    :await sql<{id:string}[]>\`
      SELECT id::text AS id
      FROM sites
      WHERE lower(domain)=\${targetDomain.toLowerCase()} AND is_active=true
      ORDER BY updated_at DESC,id
      LIMIT 2
    \`;
  if(rows.length===0){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_site_not_found",
      404,
    );
  }
  if(rows.length!==1){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_site_ambiguous",
      409,
    );
  }
  return rows[0]!.id;
}

async function loadEventRows(
  sql:postgres.Sql,
  siteId:string,
  qualificationFingerprint:string,
):Promise<ReviewRow[]>{
  return sql<ReviewRow[]>\`
    SELECT
      event_id AS "eventId",
      event_version AS "eventVersion",
      event_fingerprint AS "eventFingerprint",
      request_fingerprint AS "requestFingerprint",
      sequence::int AS sequence,
      previous_event_fingerprint AS "previousEventFingerprint",
      workspace_version AS "workspaceVersion",
      workspace_fingerprint AS "workspaceFingerprint",
      workspace_item_id AS "workspaceItemId",
      workspace_item_fingerprint AS "workspaceItemFingerprint",
      qualification_fingerprint AS "qualificationFingerprint",
      prospect_fingerprint AS "prospectFingerprint",
      opportunity_fingerprint AS "opportunityFingerprint",
      target_domain AS "targetDomain",
      source_domain AS "sourceDomain",
      target_url AS "targetUrl",
      qualification_status AS "qualificationStatus",
      decision,
      reason_code AS "reasonCode",
      reviewer_id AS "reviewerId",
      reviewed_at AS "reviewedAt",
      review_fingerprint AS "reviewFingerprint"
    FROM authority_outreach_review_events
    WHERE site_id=\${siteId}::uuid
      AND qualification_fingerprint=\${qualificationFingerprint}
    ORDER BY prospect_fingerprint,sequence,event_id
  \`;
}

function persistedEvents(rows:readonly ReviewRow[]):AuthorityOutreachReviewAuditEvent[]{
  const events=rows.map(rowToEvent);
  assertEventGroups(events);
  return events;
}

function qualificationOrThrow(
  response:AuthorityQualificationApiResponse,
):AuthorityProspectQualificationResult{
  if(response.state!=="available"||!response.qualification){
    throw new AuthorityOutreachReviewStoreError(
      "outreach_review_qualification_unavailable",
      503,
    );
  }
  return response.qualification;
}

function contractError(error:unknown):AuthorityOutreachReviewStoreError{
  if(error instanceof AuthorityOutreachReviewStoreError) return error;
  const category=error instanceof Error?error.message:"outreach_review_contract_failed";
  if(category==="ugp_outreach_review_workspace_item_not_found"){
    return new AuthorityOutreachReviewStoreError(category,404);
  }
  if(
    category.includes("explicit_confirmation_required")||
    category.includes("invalid_")
  ){
    return new AuthorityOutreachReviewStoreError(category,400);
  }
  if(
    category.includes("stale_")||
    category.includes("concurrent_change")||
    category.includes("decision_terminal")||
    category.includes("requires_reviewable_prospect")||
    category.includes("draft_approval_requires_")||
    category.includes("prospect_mismatch")
  ){
    return new AuthorityOutreachReviewStoreError(category,409);
  }
  return new AuthorityOutreachReviewStoreError(
    "outreach_review_integrity_failure",
    503,
  );
}

function stable(value:unknown):unknown{
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.entries(value as Record<string,unknown>)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([key,nested])=>[key,stable(nested)]),
    );
  }
  return value;
}

function same(left:unknown,right:unknown):boolean{
  return JSON.stringify(stable(left))===JSON.stringify(stable(right));
}

export function parseAuthorityOutreachReviewMutationRequest(
  value:unknown,
):AuthorityOutreachReviewMutationRequest{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
  }
  const row=value as Record<string,unknown>;
  if(Object.keys(row).some(key=>!REQUEST_KEYS.has(key))){
    throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
  }
  const string=(key:string,max:number)=>{
    const v=row[key];
    if(typeof v!=="string"||v.length<1||v.length>max||v.trim()!==v){
      throw new AuthorityOutreachReviewStoreError(
        "invalid_outreach_review_request",
        400,
      );
    }
    return v;
  };
  const fp=(key:string)=>{
    const v=string(key,64);
    if(!HEX64.test(v)) throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
    return v;
  };
  const workspaceItemId=string("workspaceItemId",29);
  if(!WORKSPACE_ITEM_ID.test(workspaceItemId)){
    throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
  }
  const decision=string("decision",32);
  const reasonCode=string("reasonCode",64);
  if(!DECISIONS.has(decision)||!REASONS.has(reasonCode)){
    throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
  }
  const latest=row.expectedLatestReviewFingerprint;
  if(latest!==null&&(typeof latest!=="string"||!HEX64.test(latest))){
    throw new AuthorityOutreachReviewStoreError(
      "invalid_outreach_review_request",
      400,
    );
  }
  const confirmation=string("confirmation",512);
  return Object.freeze({
    workspaceFingerprint:fp("workspaceFingerprint"),
    workspaceItemId,
    workspaceItemFingerprint:fp("workspaceItemFingerprint"),
    qualificationFingerprint:fp("qualificationFingerprint"),
    prospectFingerprint:fp("prospectFingerprint"),
    expectedLatestReviewFingerprint:latest as string|null,
    decision:decision as AuthorityOutreachReviewMutationRequest["decision"],
    reasonCode:reasonCode as AuthorityOutreachReviewMutationRequest["reasonCode"],
    confirmation,
  });
}

export async function loadDurableAuthorityOutreachReviews(
  qualification:AuthorityProspectQualificationResult,
  databaseUrl?:string,
):Promise<readonly AuthorityOutreachReviewInput[]>{
  const sql=database(databaseUrl);
  try{
    await assertReviewTableReady(sql);
    const siteId=await resolveSite(sql,qualification.targetDomain,false);
    const events=persistedEvents(
      await loadEventRows(sql,siteId,qualification.qualificationFingerprint),
    );
    return Object.freeze(events.map(eventToReview));
  }catch(error){
    throw contractError(error);
  }finally{
    await sql.end({timeout:1}).catch(()=>undefined);
  }
}

export type AuthorityOutreachReviewCommitResult=Readonly<{
  version:typeof UGP_AUTHORITY_OUTREACH_REVIEW_STORE_VERSION;
  status:"committed";
  idempotent:boolean;
  event:AuthorityOutreachReviewAuditEvent;
  resultingState:string;
  semantics:typeof STORE_SEMANTICS;
}>;

export async function commitAuthorityOutreachReviewDecision(
  request:AuthorityOutreachReviewMutationRequest,
  reviewerId:string,
  qualificationLoader:AuthorityOutreachQualificationLoader=loadAuthorityQualificationData,
  databaseUrl?:string,
):Promise<AuthorityOutreachReviewCommitResult>{
  const sql=database(databaseUrl);
  try{
    return await sql.begin(async(tx)=>{
      await assertReviewTableReady(tx);
      const qualification=qualificationOrThrow(await qualificationLoader());
      const siteId=await resolveSite(tx,qualification.targetDomain,true);
      const events=persistedEvents(
        await loadEventRows(
          tx,
          siteId,
          qualification.qualificationFingerprint,
        ),
      );
      const requestFingerprint=authorityOutreachReviewRequestFingerprint(
        request,
        reviewerId,
      );
      const existing=events.find(
        event=>event.requestFingerprint===requestFingerprint,
      );
      if(existing){
        return Object.freeze({
          version:UGP_AUTHORITY_OUTREACH_REVIEW_STORE_VERSION,
          status:"committed" as const,
          idempotent:true,
          event:existing,
          resultingState:existing.decision==="approved_for_draft"
            ?"approved_for_draft"
            :existing.decision,
          semantics:STORE_SEMANTICS,
        });
      }

      const existingReviews=events.map(eventToReview);
      const targetAudit=events
        .filter(event=>event.prospectFingerprint===request.prospectFingerprint)
        .sort((a,b)=>a.sequence-b.sequence);

      let prepared;
      try{
        prepared=prepareAuthorityOutreachReviewDecision({
          qualification,
          existingReviews,
          existingAuditEvents:targetAudit,
          request,
          reviewerId,
          reviewedAt:new Date().toISOString(),
        });
      }catch(error){
        throw contractError(error);
      }

      const event=prepared.auditEvent;
      await tx\`
        INSERT INTO authority_outreach_review_events(
          event_id,event_version,event_fingerprint,request_fingerprint,site_id,
          sequence,previous_event_fingerprint,workspace_version,
          workspace_fingerprint,workspace_item_id,workspace_item_fingerprint,
          qualification_fingerprint,prospect_fingerprint,opportunity_fingerprint,
          target_domain,source_domain,target_url,qualification_status,decision,
          reason_code,reviewer_id,reviewed_at,review_fingerprint
        ) VALUES(
          \${event.eventId},
          \${event.version},
          \${event.eventFingerprint},
          \${event.requestFingerprint},
          \${siteId}::uuid,
          \${event.sequence},
          \${event.previousEventFingerprint},
          \${event.workspaceVersion},
          \${event.workspaceFingerprint},
          \${event.workspaceItemId},
          \${event.workspaceItemFingerprint},
          \${event.qualificationFingerprint},
          \${event.prospectFingerprint},
          \${event.opportunityFingerprint},
          \${event.targetDomain},
          \${event.sourceDomain},
          \${event.targetUrl},
          \${event.qualificationStatus},
          \${event.decision},
          \${event.reasonCode},
          \${event.reviewerId},
          \${event.reviewedAt}::timestamptz,
          \${event.reviewFingerprint}
        )
      \`;

      const insertedRows=await loadEventRows(
        tx,
        siteId,
        qualification.qualificationFingerprint,
      );
      const insertedEvents=persistedEvents(insertedRows);
      const inserted=insertedEvents.find(
        candidate=>candidate.eventId===event.eventId,
      );
      if(!inserted||!same(inserted,event)){
        throw new AuthorityOutreachReviewStoreError(
          "outreach_review_write_verification_failed",
          503,
        );
      }

      return Object.freeze({
        version:UGP_AUTHORITY_OUTREACH_REVIEW_STORE_VERSION,
        status:"committed" as const,
        idempotent:false,
        event:inserted,
        resultingState:prepared.resultingState,
        semantics:STORE_SEMANTICS,
      });
    });
  }catch(error){
    if(error instanceof AuthorityOutreachReviewStoreError) throw error;
    throw contractError(error);
  }finally{
    await sql.end({timeout:2}).catch(()=>undefined);
  }
}

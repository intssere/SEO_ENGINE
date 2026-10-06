import { Router, type IRouter } from "express";
import { loadAuthorityOpportunityData } from "../lib/authority-opportunity-data.js";
import { loadAuthorityQualificationData } from "../lib/authority-qualification-data.js";
import { loadAuthorityOutreachData } from "../lib/authority-outreach-data.js";
import { isSameOriginRequest } from "../lib/pilot-authorization.js";
import {
  AuthorityOutreachReviewStoreError,
  commitAuthorityOutreachReviewDecision,
  parseAuthorityOutreachReviewMutationRequest,
} from "../lib/authority-outreach-review-store.js";
import { verifiedActorId } from "../middlewares/auth-security.js";

const router:IRouter=Router();

router.get("/authority/opportunities",async(_req,res)=>{
  const result=await loadAuthorityOpportunityData();
  res.json(result);
});

router.get("/authority/qualification",async(_req,res)=>{
  res.json(await loadAuthorityQualificationData());
});

router.get("/authority/outreach",async(_req,res)=>{
  res.json(await loadAuthorityOutreachData());
});

router.post("/authority/outreach/reviews",async(req,res)=>{
  if(!req.auth){
    return res.status(401).json({error:"authentication_required"});
  }
  if(!isSameOriginRequest(req.get("origin"),req.get("host"))){
    return res.status(403).json({error:"same_origin_outreach_review_required"});
  }
  let body;
  try{
    body=parseAuthorityOutreachReviewMutationRequest(req.body);
  }catch(error){
    if(error instanceof AuthorityOutreachReviewStoreError){
      return res.status(error.status).json({error:error.category});
    }
    return res.status(400).json({error:"invalid_outreach_review_request"});
  }
  try{
    const actorId=verifiedActorId(req);
    return res.json(await commitAuthorityOutreachReviewDecision(body,actorId));
  }catch(error){
    if(error instanceof AuthorityOutreachReviewStoreError){
      return res.status(error.status).json({error:error.category});
    }
    if(error instanceof Error&&error.message==="verified_actor_missing"){
      return res.status(401).json({error:"authentication_required"});
    }
    return res.status(500).json({error:"outreach_review_commit_failed"});
  }
});

export default router;

import { Router, type IRouter } from "express";
import { loadAuthorityOpportunityData } from "../lib/authority-opportunity-data.js";
import { loadAuthorityQualificationData } from "../lib/authority-qualification-data.js";
import { loadAuthorityOutreachData } from "../lib/authority-outreach-data.js";

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

export default router;

import { Router, type IRouter } from "express";
import { loadAuthorityOpportunityData } from "../lib/authority-opportunity-data.js";

const router:IRouter=Router();

router.get("/authority/opportunities",async(_req,res)=>{
  const result=await loadAuthorityOpportunityData();
  res.json(result);
});

export default router;

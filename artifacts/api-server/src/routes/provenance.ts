import { Router, type IRouter } from "express";
import { loadServingProvenance } from "../lib/p8-8-w09c2-h6-r1-serving-provenance.js";

const router: IRouter = Router();

router.get("/provenance", async (_req, res) => {
  const attestation = await loadServingProvenance();
  if (attestation.result !== "pass") {
    return res.status(503).json(attestation);
  }
  return res.status(200).json(attestation);
});

export default router;

import { Router, type IRouter } from "express";
import { GetPilotAuthorizationResponse, GetPilotStatusResponse, StartPilotRunResponse } from "@workspace/api-zod";
import { createPilotAuthorization, isSameOriginRequest, PILOT_AUTH_COOKIE, verifyPilotAuthorization } from "../lib/pilot-authorization";
import { enqueueProductionPilot, loadPilotRunStatus } from "../lib/pilot-orchestration";

const router: IRouter = Router();
const secret = () => process.env.SESSION_SECRET?.trim() || process.env.OAUTH_STATE_SIGNING_SECRET?.trim() || "";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/pilot", maxAge: 5 * 60 * 1000 };

router.get("/pilot/authorization", (req, res) => {
  if (!isSameOriginRequest(req.get("origin") ?? req.get("referer"), req.get("host"))) return res.status(403).json({ error: "pilot_authorization_required" });
  try {
    const token = createPilotAuthorization(secret());
    res.cookie(PILOT_AUTH_COOKIE, token, cookieOptions);
    return res.json(GetPilotAuthorizationResponse.parse({ authorization: token }));
  } catch {
    return res.status(503).json({ error: "pilot_authorization_unavailable" });
  }
});

router.get("/pilot/status", async (_req, res) => {
  try { return res.json(GetPilotStatusResponse.parse(await loadPilotRunStatus())); }
  catch { return res.status(503).json({ error: "pilot_status_unavailable" }); }
});

router.post("/pilot/run", async (req, res) => {
  const token = req.get("x-pilot-authorization");
  const authorized = isSameOriginRequest(req.get("origin"), req.get("host"))
    && token === req.cookies[PILOT_AUTH_COOKIE]
    && verifyPilotAuthorization(token, secret());
  if (!authorized) return res.status(403).json({ error: "pilot_authorization_required" });
  res.clearCookie(PILOT_AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  try {
    const result = await enqueueProductionPilot();
    if (!result.accepted) return res.status(409).json(StartPilotRunResponse.parse({ accepted: false, runId: result.runId, status: "running", error: "pilot_run_already_active" }));
    return res.status(202).json(StartPilotRunResponse.parse({ accepted: true, runId: result.runId, status: "queued", error: null }));
  } catch (error) {
    const category = error instanceof Error && /^pilot_[a-z0-9_]+$/.test(error.message) ? error.message : "pilot_preflight_failed";
    return res.status(412).json(StartPilotRunResponse.parse({ accepted: false, runId: null, status: "failed", error: category }));
  }
});

export default router;
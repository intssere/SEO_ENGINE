import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "recommendation-generation-worker.ts"), "utf8");

test("P9.7 contains no live AI/provider/network/database/runtime worker primitive", () => {
  assert.doesNotMatch(source, /ai-proposal-runtime/);
  assert.doesNotMatch(source, /generateAiMetaDescriptionProposal|refineProposalWithAi/);
  assert.doesNotMatch(source, /OpenAI|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source, /process\.env|AI_PROPOSAL_GENERATION_ENABLED/);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /DATABASE_URL|postgres\s*\(|drizzle|sql\s*\`/i);
  assert.doesNotMatch(source, /Date\.now\s*\(|new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setTimeout|setInterval|cron|node-cron|queueMicrotask/);
  assert.doesNotMatch(source, /worker_threads|child_process|spawn\s*\(|fork\s*\(/);
  assert.doesNotMatch(source, /signal-collection-job-planning|signal-collection-execution/);
});

test("P9.7 binds canonical P6.7 lineage and P9.6 control state", () => {
  assert.match(source, /buildOpportunityLifecycle/);
  assert.match(source, /normalizeWorkerControlState/);
  assert.match(source, /p67_lifecycle_integrity_mismatch/);
  assert.match(source, /p96_worker_control_integrity_mismatch/);
});

test("P9.7 preserves actionability/lifecycle/preview boundaries", () => {
  assert.match(source, /withheld_informational/);
  assert.match(source, /withheld_blocked/);
  assert.match(source, /held_deferred/);
  assert.match(source, /withheld_terminal/);
  assert.match(source, /withheld_approval_preview_required/);
  assert.match(source, /approval_changed_preview_required/);
  assert.match(source, /changedPreviewFingerprints/);
});

test("P9.7 P8 handoff remains review-only and cannot create authority", () => {
  assert.match(source, /surface: "p8_governance_review"/);
  assert.match(source, /proposalRecordCreated: false/);
  assert.match(source, /proposalPersistenceAuthorized: false/);
  assert.match(source, /approvalGranted: false/);
  assert.match(source, /executionAuthorized: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /automaticTransitionAuthorized: false/);
  assert.match(source, /task51AuthorizationCreated: false/);
});

test("P9.7 capability keeps runtime, AI, persistence, mutation and publication closed", () => {
  assert.match(source, /liveWorkerEnabled: false/);
  assert.match(source, /liveRetryLoopEnabled: false/);
  assert.match(source, /aiModelCallsAuthorized: false/);
  assert.match(source, /aiProposalGenerationGateActivated: false/);
  assert.match(source, /aiProposalRuntimeAuthorized: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /recommendationPersistenceAuthorized: false/);
  assert.match(source, /proposalPersistenceAuthorized: false/);
  assert.match(source, /productionDbReadAuthorized: false/);
  assert.match(source, /productionDbWriteAuthorized: false/);
  assert.match(source, /task69PacketMaterializationAuthorized: false/);
  assert.match(source, /task70ExecutionAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /crawlNetworkReadAuthorized: false/);
  assert.match(source, /approvalGrantAuthorized: false/);
  assert.match(source, /task51ExecutionAuthorized: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /publicationAuthorized: false/);
});

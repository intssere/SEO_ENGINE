import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-human-deliverability-evidence-decision.ts"),
  "utf8",
);

test("UGP-10.22 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
  assert.doesNotMatch(source,/dns\.resolve|resolveMx|smtp|nodemailer|sendgrid|mailgun|postmark|resend/i);
});

test("UGP-10.22 records eligibility only and cannot bind providers, mailboxes, or send",()=>{
  assert.match(source,/humanDecision:true/);
  assert.match(source,/explicitConfirmationRequired:true/);
  assert.match(source,/eligibilityOnly:true/);
  assert.match(source,/deliverabilityEvidenceDecisionRecorded:true/);
  assert.match(source,/providerMailboxBindingPreparationExecuted:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/providerBindingPerformed:false/);
  assert.match(source,/mailboxBindingAuthorized:false/);
  assert.match(source,/mailboxBindingPerformed:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/mailboxProbeAuthorized:false/);
  assert.match(source,/mailboxProbePerformed:false/);
  assert.match(source,/providerCredentialIncluded:false/);
  assert.match(source,/independentTechnicalVerificationPerformed:false/);
  assert.match(source,/verificationProviderCallAuthorized:false/);
  assert.match(source,/verificationProviderCallPerformed:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/followUpSchedulingAuthorized:false/);
});

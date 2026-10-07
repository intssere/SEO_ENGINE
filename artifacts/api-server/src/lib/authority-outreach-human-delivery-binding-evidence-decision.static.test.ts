import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-human-delivery-binding-evidence-decision.ts"),
  "utf8",
);

test("UGP-10.26 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*`/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
  assert.doesNotMatch(source,/dns\.resolve|resolveMx|smtp|nodemailer|sendgrid|mailgun|postmark|resend/i);
});

test("UGP-10.26 approval grants eligibility only and cannot bind, activate, submit, or send",()=>{
  assert.match(source,/humanDecision:true/);
  assert.match(source,/eligibilityOnly:true/);
  assert.match(source,/deliveryBindingEvidenceDecisionRecorded:true/);
  assert.match(source,/deliveryBindingAuthorizationPreparationExecuted:false/);
  assert.match(source,/deliveryBindingExecutionAuthorized:false/);
  assert.match(source,/deliveryBindingExecutionPerformed:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/providerBindingPerformed:false/);
  assert.match(source,/mailboxBindingAuthorized:false/);
  assert.match(source,/mailboxBindingPerformed:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/providerCredentialActivationAuthorized:false/);
  assert.match(source,/webSubmissionExecutionAuthorized:false/);
  assert.match(source,/webSubmissionExecutionPerformed:false/);
  assert.match(source,/messageTransmissionAuthorized:false/);
  assert.match(source,/messageTransmissionPerformed:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/outreachSendingPerformed:false/);
  assert.match(source,/performsProviderCall:false/);
  assert.match(source,/performsNetworkOperation:false/);
  assert.match(source,/performsPersistence:false/);
});

test("UGP-10.26 exposes no provider, mailbox, credential, or submission-mechanism value slots",()=>{
  assert.match(source,/liveProviderIdentifierIncluded:false/);
  assert.match(source,/senderMailboxIdentifierIncluded:false/);
  assert.match(source,/providerCredentialIncluded:false/);
  assert.match(source,/providerCredentialReferenceIncluded:false/);
  assert.match(source,/submissionMechanismReferenceIncluded:false/);
  assert.doesNotMatch(source,/apiKey\s*:/);
  assert.doesNotMatch(source,/accessToken\s*:/);
  assert.doesNotMatch(source,/refreshToken\s*:/);
  assert.doesNotMatch(source,/mailboxPassword\s*:/);
  assert.doesNotMatch(source,/providerSecret\s*:/);
  assert.doesNotMatch(source,/providerId\s*:/);
  assert.doesNotMatch(source,/senderMailbox\s*:/);
  assert.doesNotMatch(source,/credentialReferenceValue\s*:/);
  assert.doesNotMatch(source,/submissionMechanismReference\s*:/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(
  join(here,"authority-outreach-policy-consent-review-specification.ts"),
  "utf8",
);

test("UGP-10.17 contains no model/provider/network/database execution primitive",()=>{
  assert.doesNotMatch(source,/OpenAI|Anthropic|Gemini|chat\.completions|responses\.create/i);
  assert.doesNotMatch(source,/fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source,/DATABASE_URL|postgres\s*\(|drizzle|sql\s*\x60/i);
  assert.doesNotMatch(source,/process\.env|setTimeout|setInterval|cron|node-cron/i);
  assert.doesNotMatch(source,/worker_threads|child_process|spawn\s*\(|fork\s*\(/i);
});

test("UGP-10.17 prepares policy-consent review only and cannot infer consent, verify deliverability, or send",()=>{
  assert.match(source,/humanPolicyConsentReviewRequired:true/);
  assert.match(source,/policyConsentReviewPreparationOnly:true/);
  assert.match(source,/policyConsentDecisionRecorded:false/);
  assert.match(source,/policyConsentApprovalGranted:false/);
  assert.match(source,/contactPointSelectionAuthorized:false/);
  assert.match(source,/contactPointSelectionPerformed:false/);
  assert.match(source,/consentInferred:false/);
  assert.match(source,/legalComplianceDeterminationPerformed:false/);
  assert.match(source,/legalComplianceGuaranteed:false/);
  assert.match(source,/deliverabilityVerificationAuthorized:false/);
  assert.match(source,/deliverabilityVerificationPerformed:false/);
  assert.match(source,/verificationProviderCallAuthorized:false/);
  assert.match(source,/mailboxProbeAuthorized:false/);
  assert.match(source,/mailboxAccessAuthorized:false/);
  assert.match(source,/providerBindingAuthorized:false/);
  assert.match(source,/sendJobConstructionAuthorized:false/);
  assert.match(source,/sendAuthorizationGranted:false/);
  assert.match(source,/outreachSendingAuthorized:false/);
  assert.match(source,/followUpSchedulingAuthorized:false/);
  assert.doesNotMatch(
    source,
    /smtp|dns\.resolve|resolveMx|nodemailer|sendgrid|mailgun|postmark|resend/i,
  );
});

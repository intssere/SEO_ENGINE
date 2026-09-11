import { openai } from "@workspace/integrations-openai-ai-server";
import { generateAiMetaDescriptionProposal, type AiProposalResult } from "./ai-proposal.js";
import type { DryRunProposal } from "./action-planner.js";
import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { evaluateProposalQuality } from "./proposal-quality.js";
import type { SemanticPageProfile } from "./semantic-evidence.js";

export const aiProposalGenerationEnabled = () => process.env.AI_PROPOSAL_GENERATION_ENABLED?.trim().toLowerCase() === "true";

export async function refineProposalWithAi(input: {
  proposal: DryRunProposal;
  profile: SemanticPageProfile;
  candidate: OpportunityCandidate;
  page: CrawlPageSignal;
  activeProposalValues: Array<{ generationKey: string; value: string }>;
  evidence: { crawl?: string | null; shopify?: string | null; gsc?: string | null; opportunity?: string | null };
}): Promise<{ proposal: DryRunProposal; result: AiProposalResult }> {
  const deterministicCandidate = input.proposal.expectedOutcome.proposal.afterValue;
  const model = "gpt-5.6-luna";
  const result = await generateAiMetaDescriptionProposal({
    profile: input.profile,
    candidate: input.candidate,
    deterministicCandidate,
    providerModel: `openai:${model}`,
    generateText: async (prompt) => {
      const response = await openai.chat.completions.create({
        model,
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: "You write evidence-grounded metadata. Follow the supplied constraints exactly." },
          { role: "user", content: prompt },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    },
    validateQuality: ({ value }) => {
      const proposed = {
        ...input.proposal,
        expectedOutcome: {
          ...input.proposal.expectedOutcome,
          proposal: {
            ...input.proposal.expectedOutcome.proposal,
            afterValue: value,
            supportingEvidenceIds: [...new Set([
              ...input.proposal.expectedOutcome.proposal.supportingEvidenceIds,
              ...Object.values(input.evidence).filter((item): item is string => Boolean(item)),
            ])],
            evidenceSufficient: true,
          },
        },
      };
      const gate = evaluateProposalQuality({
        proposal: proposed,
        candidate: input.candidate,
        page: input.page,
        activeProposalValues: input.activeProposalValues,
        evidence: input.evidence,
      });
      return { accepted: gate.approvalEligible };
    },
  });
  const method = deterministicCandidate ? "ai_refined" : "ai_generated";
  return {
    result,
    proposal: {
      ...input.proposal,
      expectedOutcome: {
        ...input.proposal.expectedOutcome,
        generation: {
          method: result.value ? method : "deterministic",
          aiAssisted: Boolean(result.value),
          generatedValue: result.value ?? deterministicCandidate,
          aiAudit: result.audit,
        },
        proposal: {
          ...input.proposal.expectedOutcome.proposal,
          afterValue: result.value ?? deterministicCandidate,
        },
      },
    },
  };
}
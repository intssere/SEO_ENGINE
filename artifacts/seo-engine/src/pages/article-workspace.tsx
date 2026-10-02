import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function ArticleWorkspacePage() {
  return (
    <CustomerDomainHub
      eyebrow="ARTICLE WORKFLOW"
      title="Article workspace"
      description="Inspect the article workflow without synthetic evidence. A completed draft or quality check never publishes content on its own."
      cards={[
        { title: "Research progress", description: "Certified research progress is not bound yet.", status: "unavailable" },
        { title: "Sources", description: "Source provenance appears only from certified evidence.", status: "unavailable" },
        { title: "Outline", description: "No certified outline is bound.", status: "unavailable" },
        { title: "Editor", description: "No certified draft is bound. Editing and persistence stay disabled.", status: "unavailable" },
        { title: "Claims & citations", description: "Claim verification and citation provenance are not synthesized.", status: "unavailable" },
        { title: "SEO checks", description: "SEO and answer-engine checks require a certified draft.", status: "unavailable" },
        { title: "Internal links", description: "Evidence-backed internal-link targets are not bound.", status: "unavailable" },
        { title: "Publication state", description: "NOT PUBLISHED. Model confidence is not the quality gate.", status: "preview" },
      ]}
    />
  );
}

import { CustomerDomainHub } from "../components/customer-domain-hub";

const articleCards = [
  { title: "Research progress", description: "Certified research progress is not bound yet.", status: "unavailable" as const },
  { title: "Sources", description: "Source provenance appears only from certified evidence.", status: "unavailable" as const },
  { title: "Outline", description: "No certified outline is bound.", status: "unavailable" as const },
  { title: "Editor", description: "No certified draft is bound. Editing and persistence stay disabled.", status: "unavailable" as const },
  { title: "Claims & citations", description: "Claim verification and citation provenance are not synthesized.", status: "unavailable" as const },
  { title: "SEO checks", description: "SEO and answer-engine checks require a certified draft.", status: "unavailable" as const },
  { title: "Internal links", description: "Evidence-backed internal-link targets are not bound.", status: "unavailable" as const },
  { title: "Publication state", description: "NOT PUBLISHED. Model confidence is not the quality gate.", status: "preview" as const },
];

export default function ContentPage() {
  const articleWorkspace =
    typeof window !== "undefined" && window.location.pathname.endsWith("/content/articles");

  if (articleWorkspace) {
    return (
      <CustomerDomainHub
        eyebrow="ARTICLE WORKFLOW"
        title="Article workspace"
        description="Inspect the article workflow without synthetic evidence. A completed draft or quality check never publishes content on its own."
        cards={articleCards}
      />
    );
  }

  return (
    <CustomerDomainHub
      eyebrow="CONTENT GROWTH"
      title="Content"
      description="Research demand, find content gaps, and manage organic content."
      cards={[
        {
          title: "Search research",
          description:
            "Explore topics, gaps, demand signals, and supporting evidence.",
          href: "/content/research",
          actionLabel: "Open search research",
          status: "preview",
        },
        {
          title: "Rank tracking",
          description:
            "Check rank tracking availability. No ranking metrics are invented without a live source.",
          href: "/content/rankings",
          actionLabel: "View rank tracking",
          status: "unavailable",
        },
        {
          title: "AI visibility",
          description:
            "Inspect AI-answer visibility and citation observations.",
          href: "/content/ai-visibility",
          actionLabel: "Open AI visibility",
          status: "preview",
        },
        {
          title: "Article workspace",
          description:
            "Inspect research, sources, outline, draft provenance, quality checks, internal links, and publication state.",
          href: "/content/articles",
          actionLabel: "Open article workspace",
          status: "preview",
        },
      ]}
    />
  );
}

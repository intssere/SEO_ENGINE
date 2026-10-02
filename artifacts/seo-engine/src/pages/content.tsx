import { CustomerDomainHub } from "../components/customer-domain-hub";

const articleCards = [
  { title: "Research progress", description: "Not bound.", status: "unavailable" as const },
  { title: "Sources", description: "Not bound.", status: "unavailable" as const },
  { title: "Outline", description: "Not bound.", status: "unavailable" as const },
  { title: "Editor", description: "No certified draft is bound.", status: "unavailable" as const },
  { title: "Claims & citations", description: "Not bound.", status: "unavailable" as const },
  { title: "SEO checks", description: "Not bound.", status: "unavailable" as const },
  { title: "Internal links", description: "Not bound.", status: "unavailable" as const },
  { title: "Publication state", description: "NOT PUBLISHED. Model confidence is not the quality gate.", status: "preview" as const },
];

export default function ContentPage() {
  const articleWorkspace = window.location.pathname.endsWith("/content/articles");

  if (articleWorkspace) {
    return (
      <CustomerDomainHub
        eyebrow="ARTICLE WORKFLOW"
        title="Article workspace"
        description="Inspect certified article state. Generation never publishes on its own."
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
            "Inspect research, draft provenance, quality, links, and publication state.",
          href: "/content/articles",
          actionLabel: "Open article workspace",
          status: "preview",
        },
      ]}
    />
  );
}

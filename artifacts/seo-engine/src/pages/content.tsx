import { CustomerDomainHub, type CustomerDomainCard } from "../components/customer-domain-hub";

const articleCards: CustomerDomainCard[] = [
  "Research progress",
  "Sources",
  "Outline",
  "Editor",
  "Claims & citations",
  "SEO checks",
  "Internal links",
].map((title) => ({ title, description: "Unavailable.", status: "unavailable" }));

articleCards.push({
  title: "Publication state",
  description: "NOT PUBLISHED. Model confidence is not the quality gate.",
  status: "preview",
});

export default function ContentPage() {
  if (window.location.pathname.endsWith("/articles")) {
    return (
      <CustomerDomainHub
        eyebrow="ARTICLE WORKFLOW"
        title="Article workspace"
        description="Certified article state only. Generation does not publish."
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
          description: "Inspect the article evidence and publication state.",
          href: "/content/articles",
          status: "preview",
        },
      ]}
    />
  );
}

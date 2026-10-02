import { CustomerDomainHub, type CustomerDomainCard } from "../components/customer-domain-hub";

const articleCards: CustomerDomainCard[] = [
  "Research progress",
  "Sources",
  "Outline",
  "Editor",
  "Claims & citations",
  "SEO checks",
  "Internal links",
  "Publication state",
].map((title) => ({ title, description: "", status: "unavailable" }));

export default function ContentPage() {
  if (window.location.pathname.endsWith("/articles")) {
    return (
      <CustomerDomainHub
        eyebrow="ARTICLE WORKFLOW"
        title="Article workspace"
        description="NOT PUBLISHED. Confidence is not the quality gate."
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
      ]}
    />
  );
}
